import User from '../models/User.js';
import Channel from '../models/Channel.js';
import Video from '../models/Video.js';
import bcrypt from 'bcryptjs';
import { processUpload } from '../middleware/uploadMiddleware.js';
import LoginEvent from '../models/LoginEvent.js';
import TrustedDevice from '../models/TrustedDevice.js';
import { serializeUser } from '../utils/security.js';
import { redactPremiumVideoSource } from '../utils/videoSerialization.js';

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('channel');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { username, avatar } = req.body;

    if (username && username.toLowerCase() !== user.username) {
      const existing = await User.findOne({ username: username.toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken',
        });
      }
      user.username = username.toLowerCase();
    }

    // Avatar from file upload or URL string
    if (req.file) {
      const avatarUrl = await processUpload(req.file, 'avatars', 'image');
      user.avatar = avatarUrl;
    } else if (avatar) {
      user.avatar = avatar;
    }

    await user.save();

    // If channel exists, sync avatar and handle if desired
    if (user.channel) {
      const channel = await Channel.findById(user.channel);
      if (channel) {
        if (user.avatar) channel.avatar = user.avatar;
        await channel.save();
      }
    }

    const updatedUser = await User.findById(user._id).populate('channel');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/users/password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get uploaded videos by user
// @route   GET /api/users/:id/videos
// @access  Public
export const getUserVideos = async (req, res, next) => {
  try {
    const videos = await Video.find({
      owner: req.params.id,
      visibility: 'public',
    })
      .populate('channel', 'name handle avatar subscribersCount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: videos.length,
      videos: videos.map(redactPremiumVideoSource),
    });
  } catch (error) {
    next(error);
  }
};

export const updateThemePreference = async (req, res, next) => {
  try {
    const { themePreference } = req.body;
    if (!['auto', 'light', 'dark'].includes(themePreference)) {
      return res.status(400).json({ success: false, message: 'Theme preference must be auto, light, or dark.' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { themePreference } },
      { new: true, runValidators: true }
    ).populate('channel');
    res.status(200).json({ success: true, user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const getSecurityActivity = async (req, res, next) => {
  try {
    const events = await LoginEvent.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('ipAddress browser browserVersion operatingSystem deviceType city state country latitude longitude success reason createdAt');
    res.status(200).json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

export const getTrustedDevices = async (req, res, next) => {
  try {
    const devices = await TrustedDevice.find({ user: req.user._id, trustedUntil: { $gt: new Date() } })
      .sort({ lastSeenAt: -1 })
      .select('label ipAddress trustedUntil lastSeenAt createdAt');
    res.status(200).json({ success: true, devices });
  } catch (error) {
    next(error);
  }
};

export const revokeTrustedDevice = async (req, res, next) => {
  try {
    const result = await TrustedDevice.deleteOne({ _id: req.params.deviceId, user: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Trusted device not found.' });
    }
    res.status(200).json({ success: true, message: 'Trusted device revoked.' });
  } catch (error) {
    next(error);
  }
};
