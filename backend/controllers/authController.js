import User from '../models/User.js';
import Channel from '../models/Channel.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import LoginChallenge from '../models/LoginChallenge.js';
import LoginEvent from '../models/LoginEvent.js';
import TrustedDevice from '../models/TrustedDevice.js';
import {
  getRequestIp,
  getUserAgentHash,
  parseUserAgent,
  serializeUser,
} from '../utils/security.js';

const OTP_PEPPER = process.env.OTP_SECRET || process.env.JWT_SECRET || 'local-otp-secret';
const hashOtp = (otp) => crypto.createHash('sha256').update(`${OTP_PEPPER}:${otp}`).digest('hex');

const lookupLoginLocation = async (ipAddress) => {
  const providerUrl = process.env.GEOIP_LOOKUP_URL;
  if (!providerUrl || !ipAddress || /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ipAddress)) return {};
  try {
    const url = providerUrl.replace('{ip}', encodeURIComponent(ipAddress));
    const response = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: 'error' });
    if (!response.ok) throw new Error(`Location provider returned HTTP ${response.status}.`);
    const data = await response.json();
    return {
      city: String(data.city || '').slice(0, 100),
      state: String(data.state || data.region || '').slice(0, 100),
      country: String(data.country || '').slice(0, 100),
      latitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
      longitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
    };
  } catch (error) {
    console.warn('[Auth] Login location lookup failed:', error.message);
    return {};
  }
};

const getLoginContext = async (req, deviceId) => {
  const userAgent = String(req.get('user-agent') || '').slice(0, 500);
  const ipAddress = getRequestIp(req);
  return {
    deviceId,
    ipAddress,
    userAgent,
    userAgentHash: getUserAgentHash(userAgent),
    ...parseUserAgent(userAgent),
    ...await lookupLoginLocation(ipAddress),
  };
};

const logLogin = async (user, context, success, reason = '') => {
  await LoginEvent.create({
    user: user._id,
    ipAddress: context.ipAddress,
    browser: context.browser,
    browserVersion: context.browserVersion,
    operatingSystem: context.operatingSystem,
    deviceType: context.deviceType,
    deviceModel: context.deviceModel,
    city: context.city,
    state: context.state,
    country: context.country,
    latitude: context.latitude,
    longitude: context.longitude,
    success,
    reason,
  });
};

const sendLoginOtp = async (user, otp, context) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Login verification email is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM.');
    }
    return { delivered: false, developmentOtp: otp };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    ...(SMTP_USER && SMTP_PASS ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
  });
  await transporter.sendMail({
    from: SMTP_FROM,
    to: user.email,
    subject: 'Your VidSphere sign-in code',
    text: `Your sign-in verification code is ${otp}. It expires in 10 minutes. Sign-in attempt: ${context.browser} on ${context.operatingSystem} (${context.deviceType}). If this was not you, change your password.`,
  });
  return { delivered: true };
};

const issueSession = (user, res, message = 'Logged in successfully.') => {
  const token = user.getSignedJwtToken();
  return res.status(200).json({
    success: true,
    message,
    token,
    user: serializeUser(user),
  });
};

const ensureDefaultAccount = async () => {
  let user = await User.findOne({ email: 'aarav@viewtube.io' }).populate('channel');
  if (!user) {
    try {
      user = await User.create({
        username: 'aarav_sharma',
        email: 'aarav@viewtube.io',
        password: crypto.randomBytes(32).toString('hex'),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      user = await User.findOne({ email: 'aarav@viewtube.io' }).populate('channel');
      if (!user) throw error;
    }
  }

  if (!user.channel) {
    let channel = await Channel.findOne({ owner: user._id });
    if (!channel) {
      const handleExists = await Channel.exists({ handle: 'aaravexplains' });
      try {
        channel = await Channel.create({
          name: 'Aarav Explains',
          handle: handleExists ? `aarav-${String(user._id).slice(-8)}` : 'aaravexplains',
          owner: user._id,
          description: 'Default VidSphere demo account.',
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        channel = await Channel.findOne({ owner: user._id });
        if (!channel) throw error;
      }
    }
    user.channel = channel._id;
    await user.save();
    await user.populate('channel');
  }

  return user;
};

let defaultAccountProvisioning = null;

export const getDefaultAccountSession = async (_req, res, next) => {
  try {
    if (!defaultAccountProvisioning) {
      defaultAccountProvisioning = ensureDefaultAccount().finally(() => {
        defaultAccountProvisioning = null;
      });
    }
    const user = await defaultAccountProvisioning;
    return issueSession(user, res, 'Using the default Aarav Sharma account.');
  } catch (error) {
    return next(error);
  }
};

// @desc    Register a new user and auto-create default channel
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { username, email, password, channelName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password.',
      });
    }

    // Check if username or email already taken
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase()
          ? 'Email is already registered'
          : 'Username is already taken',
      });
    }

    // Create user
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
    });

    // Create default channel for this user
    const finalChannelName = channelName?.trim() || username;
    const channel = await Channel.create({
      name: finalChannelName,
      handle: username.toLowerCase(),
      owner: user._id,
      description: `Welcome to ${finalChannelName}'s channel!`,
    });

    user.channel = channel._id;
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        themePreference: user.themePreference,
        effectiveTheme: serializeUser(user).effectiveTheme,
        membership: user.membership,
        channel: {
          _id: channel._id,
          name: channel.name,
          handle: channel.handle,
          avatar: channel.avatar,
          banner: channel.banner,
          subscribersCount: 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { identifier, email, password, deviceId } = req.body;
    const loginInput = identifier || email;

    if (!loginInput || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your username/email and password.',
      });
    }

    // Search by email or username
    const user = await User.findOne({
      $or: [
        { email: loginInput.toLowerCase().trim() },
        { username: loginInput.toLowerCase().trim() },
      ],
    })
      .select('+password')
      .populate('channel');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await logLogin(user, await getLoginContext(req, 'unverified'), false, 'invalid_password');
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
      });
    }

    // Ensure user has a channel
    if (!user.channel) {
      let channel = await Channel.findOne({ owner: user._id });
      if (!channel) {
        channel = await Channel.create({
          name: user.username,
          handle: user.username,
          owner: user._id,
          description: `Welcome to ${user.username}'s channel!`,
        });
      }
      user.channel = channel;
      await user.save();
    }

    if (typeof deviceId !== 'string' || !/^[a-zA-Z0-9-]{24,128}$/.test(deviceId)) {
      return res.status(400).json({ success: false, message: 'This browser could not be identified. Refresh the page and try again.' });
    }
    const context = await getLoginContext(req, deviceId);
    const trustedDevice = await TrustedDevice.findOne({
      user: user._id,
      deviceId,
      ipAddress: context.ipAddress,
      userAgentHash: context.userAgentHash,
      city: context.city || '',
      state: context.state || '',
      trustedUntil: { $gt: new Date() },
    });
    if (trustedDevice) {
      trustedDevice.lastSeenAt = new Date();
      await trustedDevice.save();
      await logLogin(user, context, true, 'trusted_device');
      return issueSession(user, res);
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const challenge = await LoginChallenge.create({
      user: user._id,
      codeHash: hashOtp(otp),
      deviceId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      browser: context.browser,
      browserVersion: context.browserVersion,
      operatingSystem: context.operatingSystem,
      deviceType: context.deviceType,
      deviceModel: context.deviceModel,
      city: context.city,
      state: context.state,
      country: context.country,
      latitude: context.latitude,
      longitude: context.longitude,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
      const delivery = await sendLoginOtp(user, otp, context);
      await logLogin(user, context, false, 'otp_required');
      return res.status(202).json({
        success: true,
        otpRequired: true,
        challengeId: challenge._id,
        message: `A sign-in code was sent to ${user.email.replace(/^(.).+(@.*)$/, '$1••••$2')}.`,
        ...(delivery.developmentOtp ? { developmentOtp: delivery.developmentOtp } : {}),
      });
    } catch (deliveryError) {
      await LoginChallenge.deleteOne({ _id: challenge._id });
      await logLogin(user, context, false, 'otp_delivery_failed');
      return res.status(503).json({
        success: false,
        message: deliveryError.message || 'Could not deliver a verification code. Try again later.',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const verifyLoginOtp = async (req, res, next) => {
  try {
    const { challengeId, code, rememberDevice = true } = req.body;
    if (!challengeId || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Enter the sign-in code.' });
    }
    const challenge = await LoginChallenge.findOne({
      _id: challengeId,
      expiresAt: { $gt: new Date() },
      usedAt: null,
    }).populate('user');
    if (!challenge || !challenge.user || challenge.attempts >= 5) {
      return res.status(400).json({ success: false, message: 'The code is invalid or expired. Sign in again to request a new one.' });
    }

    const submittedHash = Buffer.from(hashOtp(code.trim()), 'hex');
    const storedHash = Buffer.from(challenge.codeHash, 'hex');
    const codeMatches = submittedHash.length === storedHash.length && crypto.timingSafeEqual(submittedHash, storedHash);
    if (!codeMatches) {
      await LoginChallenge.updateOne(
        { _id: challenge._id, attempts: { $lt: 5 }, usedAt: null },
        { $inc: { attempts: 1 } }
      );
      await logLogin(challenge.user, challenge, false, 'otp_invalid');
      return res.status(400).json({ success: false, message: 'The code is incorrect. Check it and try again.' });
    }

    const consumed = await LoginChallenge.findOneAndUpdate(
      { _id: challenge._id, attempts: { $lt: 5 }, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { new: true }
    );
    if (!consumed) return res.status(409).json({ success: false, message: 'This code has already been used or expired.' });

    const context = {
      deviceId: challenge.deviceId,
      ipAddress: challenge.ipAddress,
      userAgent: challenge.userAgent,
      userAgentHash: getUserAgentHash(challenge.userAgent),
      browser: challenge.browser,
      browserVersion: challenge.browserVersion,
      operatingSystem: challenge.operatingSystem,
      deviceType: challenge.deviceType,
      deviceModel: challenge.deviceModel,
      city: challenge.city,
      state: challenge.state,
      country: challenge.country,
      latitude: challenge.latitude,
      longitude: challenge.longitude,
    };
    if (rememberDevice !== false) {
      const days = Math.min(90, Math.max(1, Number.parseInt(process.env.TRUSTED_DEVICE_DAYS || '30', 10) || 30));
      await TrustedDevice.findOneAndUpdate(
        { user: challenge.user._id, deviceId: context.deviceId, ipAddress: context.ipAddress, userAgentHash: context.userAgentHash, city: context.city || '', state: context.state || '' },
        {
          $set: {
            label: `${context.browser} on ${context.operatingSystem}`,
            trustedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
            lastSeenAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
    }
    await logLogin(challenge.user, context, true, 'otp_verified');
    const user = await User.findById(challenge.user._id).populate('channel');
    return issueSession(user, res, 'Sign-in verified.');
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('channel');
    res.status(200).json({
      success: true,
      user: { ...serializeUser(user), createdAt: user.createdAt, updatedAt: user.updatedAt },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user (client destroys token)
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
