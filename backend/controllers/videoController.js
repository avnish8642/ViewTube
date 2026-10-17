import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Video from '../models/Video.js';
import Reaction from '../models/Reaction.js';
import Subscription from '../models/Subscription.js';
import WatchLater from '../models/WatchLater.js';
import WatchHistory from '../models/WatchHistory.js';
import Comment from '../models/Comment.js';
import { processUpload } from '../middleware/uploadMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Upload & Create a new video
// @route   POST /api/videos
// @access  Private
export const createVideo = async (req, res, next) => {
  try {
    const { title, description, category, tags, visibility, duration, videoUrl: customVideoUrl, thumbnailUrl: customThumbnailUrl } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Video title is required.',
      });
    }

    if (!req.user.channel) {
      return res.status(400).json({
        success: false,
        message: 'User does not have an active channel. Please create a channel first.',
      });
    }

    let finalVideoUrl = customVideoUrl || null;
    let finalThumbnailUrl = customThumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=640&q=80';

    // Handle files if uploaded via multipart/form-data
    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        finalVideoUrl = await processUpload(req.files.video[0], 'videos', 'video');
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        finalThumbnailUrl = await processUpload(req.files.thumbnail[0], 'thumbnails', 'image');
      }
    }

    if (!finalVideoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Video file or video URL is required.',
      });
    }

    // Process tags
    let formattedTags = [];
    if (Array.isArray(tags)) {
      formattedTags = tags;
    } else if (typeof tags === 'string') {
      formattedTags = tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
    }

    const video = await Video.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbnailUrl,
      owner: req.user._id,
      channel: req.user.channel._id || req.user.channel,
      category: category || 'Entertainment',
      tags: formattedTags,
      duration: duration || '3:45',
      visibility: visibility || 'public',
    });

    const populatedVideo = await Video.findById(video._id).populate(
      'channel',
      'name handle avatar subscribersCount'
    );

    res.status(201).json({
      success: true,
      message: 'Video published successfully',
      video: populatedVideo,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get videos with filtering, sorting, and pagination
// @route   GET /api/videos
// @access  Public
export const getVideos = async (req, res, next) => {
  try {
    const { category, sort, page = 1, limit = 20 } = req.query;

    const query = { visibility: 'public' };

    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'views' || sort === 'popular') {
      sortOptions = { views: -1 };
    } else if (sort === 'likes') {
      sortOptions = { likesCount: -1 };
    } else if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('channel', 'name handle avatar subscribersCount')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Video.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: videos.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      videos,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single video by ID (with enriched user state if logged in)
// @route   GET /api/videos/:id
// @access  Public (Optional auth)
export const getVideoById = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('channel', 'name handle avatar banner description subscribersCount owner')
      .populate('owner', 'username avatar');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Default user states
    let userReaction = null;
    let isSubscribed = false;
    let isWatchLater = false;

    if (req.user) {
      const [reactionDoc, subDoc, wlDoc] = await Promise.all([
        Reaction.findOne({ user: req.user._id, video: video._id }),
        Subscription.findOne({ subscriber: req.user._id, channel: video.channel._id }),
        WatchLater.findOne({ user: req.user._id, video: video._id }),
      ]);

      if (reactionDoc) userReaction = reactionDoc.type;
      if (subDoc) isSubscribed = true;
      if (wlDoc) isWatchLater = true;
    }

    res.status(200).json({
      success: true,
      video,
      userReaction,
      isSubscribed,
      isWatchLater,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Increment video view count and record watch history
// @route   POST /api/videos/:id/view
// @access  Public (Optional auth)
export const incrementView = async (req, res, next) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // If logged in, record or update watch history
    if (req.user) {
      await WatchHistory.findOneAndUpdate(
        { user: req.user._id, video: video._id },
        { watchedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      success: true,
      views: video.views,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update video details
// @route   PUT /api/videos/:id
// @access  Private (Owner only)
export const updateVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Authorization check
    if (video.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this video',
      });
    }

    const { title, description, category, tags, visibility, thumbnailUrl } = req.body;

    if (title) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (category) video.category = category;
    if (visibility) video.visibility = visibility;
    if (thumbnailUrl) video.thumbnailUrl = thumbnailUrl;

    if (req.file) {
      video.thumbnailUrl = await processUpload(req.file, 'thumbnails', 'image');
    }

    if (tags) {
      video.tags = Array.isArray(tags)
        ? tags
        : tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
    }

    await video.save();

    const updated = await Video.findById(video._id).populate(
      'channel',
      'name handle avatar subscribersCount'
    );

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      video: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private (Owner only)
export const deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Authorization check
    if (video.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this video',
      });
    }

    // Cascade delete associated comments, reactions, watch history, and watch later
    await Promise.all([
      Comment.deleteMany({ video: video._id }),
      Reaction.deleteMany({ video: video._id }),
      WatchHistory.deleteMany({ video: video._id }),
      WatchLater.deleteMany({ video: video._id }),
      Video.findByIdAndDelete(video._id),
    ]);

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream local video file with HTTP Range support (206 Partial Content)
// @route   GET /api/videos/stream/:filename
// @access  Public
export const streamVideoFile = (req, res) => {
  const filePath = path.join(__dirname, '../uploads/videos', req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Video file not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
};
