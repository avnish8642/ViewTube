import WatchHistory from '../models/WatchHistory.js';

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
        video: item.video,
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
