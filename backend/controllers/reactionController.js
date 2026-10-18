import Reaction from '../models/Reaction.js';
import Video from '../models/Video.js';
import { redactPremiumVideoSource } from '../utils/videoSerialization.js';

// @desc    Toggle like on a video
// @route   POST /api/videos/:id/like
// @access  Private
export const toggleLike = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const userId = req.user._id;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const existingReaction = await Reaction.findOne({ user: userId, video: videoId });

    let currentReaction = null;

    if (existingReaction) {
      if (existingReaction.type === 'like') {
        // Remove like
        await Reaction.findByIdAndDelete(existingReaction._id);
        video.likesCount = Math.max(0, video.likesCount - 1);
        currentReaction = null;
      } else {
        // Was disliked, switch to like
        existingReaction.type = 'like';
        await existingReaction.save();
        video.dislikesCount = Math.max(0, video.dislikesCount - 1);
        video.likesCount += 1;
        currentReaction = 'like';
      }
    } else {
      // Create new like
      await Reaction.create({ user: userId, video: videoId, type: 'like' });
      video.likesCount += 1;
      currentReaction = 'like';
    }

    await video.save();

    res.status(200).json({
      success: true,
      userReaction: currentReaction,
      likesCount: video.likesCount,
      dislikesCount: video.dislikesCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle dislike on a video
// @route   POST /api/videos/:id/dislike
// @access  Private
export const toggleDislike = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const userId = req.user._id;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const existingReaction = await Reaction.findOne({ user: userId, video: videoId });

    let currentReaction = null;

    if (existingReaction) {
      if (existingReaction.type === 'dislike') {
        // Remove dislike
        await Reaction.findByIdAndDelete(existingReaction._id);
        video.dislikesCount = Math.max(0, video.dislikesCount - 1);
        currentReaction = null;
      } else {
        // Was liked, switch to dislike
        existingReaction.type = 'dislike';
        await existingReaction.save();
        video.likesCount = Math.max(0, video.likesCount - 1);
        video.dislikesCount += 1;
        currentReaction = 'dislike';
      }
    } else {
      // Create new dislike
      await Reaction.create({ user: userId, video: videoId, type: 'dislike' });
      video.dislikesCount += 1;
      currentReaction = 'dislike';
    }

    await video.save();

    res.status(200).json({
      success: true,
      userReaction: currentReaction,
      likesCount: video.likesCount,
      dislikesCount: video.dislikesCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's liked videos
// @route   GET /api/videos/liked/my
// @access  Private
export const getMyLikedVideos = async (req, res, next) => {
  try {
    const reactions = await Reaction.find({ user: req.user._id, type: 'like' })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'video',
        populate: { path: 'channel', select: 'name handle avatar subscribersCount' },
      });

    const videos = reactions
      .map((r) => r.video)
      .filter((v) => v && v.visibility === 'public')
      .map(redactPremiumVideoSource);

    res.status(200).json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    next(error);
  }
};
