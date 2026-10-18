import WatchHistory from '../models/WatchHistory.js';
import Video from '../models/Video.js';
import { redactPremiumVideoSource } from '../utils/videoSerialization.js';

export const getVideoProgress = async (req, res, next) => {
  try {
    const item = await WatchHistory.findOne({
      user: req.user._id,
      video: req.params.videoId,
    }).select('progressSeconds durationSeconds completed');

    res.status(200).json({
      success: true,
      progress: item || { progressSeconds: 0, durationSeconds: 0, completed: false },
    });
  } catch (error) {
    next(error);
  }
};

export const saveVideoProgress = async (req, res, next) => {
  try {
    const { currentTime, duration } = req.body;
    if (
      !Number.isFinite(currentTime) ||
      !Number.isFinite(duration) ||
      currentTime < 0 ||
      duration <= 0 ||
      currentTime > duration
    ) {
      return res.status(400).json({ success: false, message: 'Invalid playback progress.' });
    }

    const videoExists = await Video.exists({ _id: req.params.videoId });
    if (!videoExists) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }

    const completed = currentTime / duration >= 0.9;
    const progress = await WatchHistory.findOneAndUpdate(
      { user: req.user._id, video: req.params.videoId },
      {
        $set: {
          progressSeconds: currentTime,
          durationSeconds: duration,
          completed,
          watchedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    ).select('progressSeconds durationSeconds completed');

    res.status(200).json({ success: true, progress });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's watch history
// @route   GET /api/history
// @access  Private
export const getWatchHistory = async (req, res, next) => {
  try {
    const history = await WatchHistory.find({ user: req.user._id })
      .sort({ watchedAt: -1 })
      .populate({
        path: 'video',
        populate: { path: 'channel', select: 'name handle avatar subscribersCount' },
      });

    // Filter out videos that might have been deleted
    const validHistory = history
      .filter((item) => item.video && item.video.visibility === 'public')
      .map((item) => ({
        _id: item._id,
        watchedAt: item.watchedAt,
        video: redactPremiumVideoSource(item.video),
      }));

    res.status(200).json({
      success: true,
      count: validHistory.length,
      history: validHistory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove single video from watch history
// @route   DELETE /api/history/:videoId
// @access  Private
export const removeHistoryItem = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    await WatchHistory.findOneAndDelete({
      user: req.user._id,
      video: videoId,
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from history',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all watch history for user
// @route   DELETE /api/history
// @access  Private
export const clearWatchHistory = async (req, res, next) => {
  try {
    await WatchHistory.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Watch history cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};
