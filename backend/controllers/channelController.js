import mongoose from 'mongoose';
import Channel from '../models/Channel.js';
import Video from '../models/Video.js';
import Subscription from '../models/Subscription.js';
import { processUpload } from '../middleware/uploadMiddleware.js';
import { redactPremiumVideoSource } from '../utils/videoSerialization.js';

// @desc    Get channel by ID or handle
// @route   GET /api/channels/:id
// @access  Public (Optional auth)
export const getChannelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query;

    if (id.startsWith('@')) {
      query = { handle: id.substring(1).toLowerCase() };
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { handle: id.toLowerCase() };
    }

    const channel = await Channel.findOne(query).populate('owner', 'username email avatar');

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found',
      });
    }

    let isSubscribed = false;
    let isOwner = false;

    if (req.user) {
      isOwner = channel.owner._id.toString() === req.user._id.toString();
      const sub = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channel._id,
      });
      if (sub) isSubscribed = true;
    }

    // Video count and total views for this channel
    const videoStats = await Video.aggregate([
      { $match: { channel: channel._id, visibility: 'public' } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$views' },
        },
      },
    ]);

    const stats = videoStats[0] || { totalVideos: 0, totalViews: 0 };

    res.status(200).json({
      success: true,
      channel,
      isSubscribed,
      isOwner,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update channel details
// @route   PUT /api/channels/:id
// @access  Private (Owner only)
export const updateChannel = async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found',
      });
    }

    // Authorization
    if (channel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this channel',
      });
    }

    const { name, handle, description, avatar, banner } = req.body;

    if (name) channel.name = name.trim();
    if (description !== undefined) channel.description = description.trim();

    if (handle && handle.toLowerCase() !== channel.handle) {
      const cleanHandle = handle.toLowerCase().replace(/^@/, '').trim();
      const existing = await Channel.findOne({ handle: cleanHandle });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Channel handle is already taken',
        });
      }
      channel.handle = cleanHandle;
    }

    // Process files if uploaded
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        channel.avatar = await processUpload(req.files.avatar[0], 'avatars', 'image');
      }
      if (req.files.banner && req.files.banner[0]) {
        channel.banner = await processUpload(req.files.banner[0], 'banners', 'image');
      }
    } else {
      if (avatar) channel.avatar = avatar;
      if (banner) channel.banner = banner;
    }

    await channel.save();

    res.status(200).json({
      success: true,
      message: 'Channel updated successfully',
      channel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get videos for a channel
// @route   GET /api/channels/:id/videos
// @access  Public
export const getChannelVideos = async (req, res, next) => {
  try {
    const { id } = req.params;
    let channelId = id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const cleanHandle = id.startsWith('@') ? id.substring(1) : id;
      const found = await Channel.findOne({ handle: cleanHandle.toLowerCase() });
      if (!found) {
        return res.status(404).json({ success: false, message: 'Channel not found' });
      }
      channelId = found._id;
    }

    const videos = await Video.find({
      channel: channelId,
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

// @desc    Subscribe or Unsubscribe to a channel
// @route   POST /api/channels/:id/subscribe
// @access  Private
export const toggleSubscription = async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found',
      });
    }

    if (channel.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot subscribe to your own channel',
      });
    }

    const existingSub = await Subscription.findOne({
      subscriber: req.user._id,
      channel: channel._id,
    });

    let isSubscribed = false;

    if (existingSub) {
      // Unsubscribe
      await Subscription.findByIdAndDelete(existingSub._id);
      channel.subscribersCount = Math.max(0, channel.subscribersCount - 1);
      await channel.save();
      isSubscribed = false;
    } else {
      // Subscribe
      await Subscription.create({
        subscriber: req.user._id,
        channel: channel._id,
      });
      channel.subscribersCount += 1;
      await channel.save();
      isSubscribed = true;
    }

    res.status(200).json({
      success: true,
      isSubscribed,
      subscribersCount: channel.subscribersCount,
      message: isSubscribed ? 'Subscribed to channel' : 'Unsubscribed from channel',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all channels subscribed by current user
// @route   GET /api/channels/subscriptions/my
// @access  Private
export const getMySubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ subscriber: req.user._id })
      .populate('channel', 'name handle avatar subscribersCount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      subscriptions: subscriptions.map((s) => s.channel).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};
