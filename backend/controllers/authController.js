import User from '../models/User.js';
import Channel from '../models/Channel.js';

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
    const { identifier, email, password } = req.body;
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

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        channel: user.channel,
      },
    });
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
      user,
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
