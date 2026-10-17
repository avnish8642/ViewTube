import Comment from '../models/Comment.js';
import Video from '../models/Video.js';

// @desc    Get comments for a video
// @route   GET /api/videos/:videoId/comments
// @access  Public
export const getVideoComments = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [comments, total] = await Promise.all([
      Comment.find({ video: videoId })
        .populate('user', 'username avatar channel')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Comment.countDocuments({ video: videoId }),
    ]);

    res.status(200).json({
      success: true,
      count: comments.length,
      total,
      comments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a comment
// @route   POST /api/videos/:videoId/comments
// @access  Private
export const createComment = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty',
      });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const comment = await Comment.create({
      user: req.user._id,
      video: videoId,
      content: content.trim(),
    });

    // Increment commentsCount on video
    video.commentsCount += 1;
    await video.save();

    const populated = await Comment.findById(comment._id).populate(
      'user',
      'username avatar channel'
    );

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      comment: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a comment
// @route   PUT /api/comments/:id
// @access  Private (Owner only)
export const updateComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty',
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this comment',
      });
    }

    comment.content = content.trim();
    await comment.save();

    const populated = await Comment.findById(comment._id).populate(
      'user',
      'username avatar channel'
    );

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      comment: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private (Owner only)
export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment',
      });
    }

    await Comment.findByIdAndDelete(comment._id);

    // Decrement video comment counter
    await Video.findByIdAndUpdate(comment.video, { $inc: { commentsCount: -1 } });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
