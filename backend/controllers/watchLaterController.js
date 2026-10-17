import WatchLater from '../models/WatchLater.js';
import Video from '../models/Video.js';

// @desc    Get user's Watch Later list
// @route   GET /api/watch-later
// @access  Private
export const getWatchLater = async (req, res, next) => {
  try {
    const list = await WatchLater.find({ user: req.user._id })
      .sort({ addedAt: -1 })
      .populate({
        path: 'video',
        populate: { path: 'channel', select: 'name handle avatar subscribersCount' },
      });

    const videos = list
      .map((item) => item.video)
      .filter((v) => v && v.visibility === 'public');

    res.status(200).json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add video to Watch Later
// @route   POST /api/watch-later/:videoId
// @access  Private
export const addToWatchLater = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const existing = await WatchLater.findOne({
      user: req.user._id,
      video: videoId,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        isWatchLater: true,
        message: 'Video is already in Watch Later',
      });
    }

    await WatchLater.create({
      user: req.user._id,
      video: videoId,
    });

    res.status(201).json({
      success: true,
      isWatchLater: true,
      message: 'Added to Watch Later',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove video from Watch Later
// @route   DELETE /api/watch-later/:videoId
// @access  Private
export const removeFromWatchLater = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    await WatchLater.findOneAndDelete({
      user: req.user._id,
      video: videoId,
    });

    res.status(200).json({
      success: true,
      isWatchLater: false,
      message: 'Removed from Watch Later',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Watch Later status
// @route   POST /api/watch-later/:videoId/toggle
// @access  Private
export const toggleWatchLater = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const existing = await WatchLater.findOne({
      user: req.user._id,
      video: videoId,
    });

    let isWatchLater = false;

    if (existing) {
      await WatchLater.findByIdAndDelete(existing._id);
      isWatchLater = false;
    } else {
      await WatchLater.create({
        user: req.user._id,
        video: videoId,
      });
      isWatchLater = true;
    }

    res.status(200).json({
      success: true,
      isWatchLater,
      message: isWatchLater ? 'Added to Watch Later' : 'Removed from Watch Later',
    });
  } catch (error) {
    next(error);
  }
};
