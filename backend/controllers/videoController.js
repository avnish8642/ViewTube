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
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isAllowedRemoteMediaUrl } from '../utils/security.js';
import { redactPremiumVideoSource } from '../utils/videoSerialization.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_viewtube_jwt_key_2026_xyz';

const hasPremiumAccess = (user) =>
  user?.membership?.plan !== 'free' &&
  user?.membership?.status === 'active' &&
  (!user.membership.expiresAt || user.membership.expiresAt > new Date());

const localVideoFilename = (videoUrl) => {
  try {
    const pathname = new URL(videoUrl, 'http://localhost').pathname;
    if (!pathname.startsWith('/uploads/videos/') && !pathname.startsWith('/api/videos/stream/')) return null;
    return path.basename(pathname);
  } catch {
    return null;
  }
};

// @desc    Upload & Create a new video
// @route   POST /api/videos
// @access  Private
export const createVideo = async (req, res, next) => {
  try {
    const { title, description, category, tags, visibility, duration, premium, videoUrl: customVideoUrl, thumbnailUrl: customThumbnailUrl } = req.body;

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
    const isLocalVideo = finalVideoUrl.startsWith('/uploads/videos/') || finalVideoUrl.startsWith('/api/videos/stream/');
    if (!isLocalVideo && !isAllowedRemoteMediaUrl(finalVideoUrl)) {
      return res.status(400).json({ success: false, message: 'Video URLs must be local uploads or HTTPS media from an approved host.' });
    }
    if (finalVideoUrl.startsWith('/uploads/videos/')) {
      finalVideoUrl = finalVideoUrl.replace('/uploads/videos/', '/api/videos/stream/');
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
      premium: premium === true || premium === 'true',
    });

    const populatedVideo = await Video.findById(video._id).populate(
      'channel',
      'name handle avatar subscribersCount'
    );

    res.status(201).json({
      success: true,
      message: 'Video published successfully',
      video: redactPremiumVideoSource(populatedVideo),
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
    if (req.user?.membership?.expiresAt && req.user.membership.expiresAt <= new Date()) {
      req.user.membership = { plan: 'free', status: 'expired', renew: false };
      await req.user.save();
    }
    if (!hasPremiumAccess(req.user)) query.premium = { $ne: true };

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
      videos: videos.map(redactPremiumVideoSource),
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

    if (video.premium && !hasPremiumAccess(req.user)) {
      if (req.user?.membership?.expiresAt && req.user.membership.expiresAt <= new Date()) {
        req.user.membership = { plan: 'free', status: 'expired', renew: false };
        await req.user.save();
      }
      return res.status(403).json({ success: false, message: 'This is a premium video. Choose a paid membership to watch it.' });
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

    const videoData = video.toObject();
    const filename = localVideoFilename(video.videoUrl);
    if (video.premium) {
      const accessToken = jwt.sign({ id: req.user._id, videoId: String(video._id), scope: 'premium-video' }, JWT_SECRET, { expiresIn: '20m' });
      videoData.videoUrl = `/api/videos/media/${video._id}?token=${encodeURIComponent(accessToken)}`;
    } else if (filename) {
      videoData.videoUrl = `/api/videos/stream/${encodeURIComponent(filename)}`;
    }

    res.status(200).json({
      success: true,
      video: videoData,
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
    if (req.body.premium !== undefined) video.premium = req.body.premium === true || req.body.premium === 'true';

    await video.save();

    const updated = await Video.findById(video._id).populate(
      'channel',
      'name handle avatar subscribersCount'
    );

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      video: redactPremiumVideoSource(updated),
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
export const streamVideoFile = async (req, res, next) => {
  try {
    const filename = path.basename(decodeURIComponent(req.params.filename));
    if (!/^[\w.-]+$/.test(filename)) return res.status(400).json({ success: false, message: 'Invalid video file.' });
    const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const video = await Video.findOne({ videoUrl: { $regex: `${escapedFilename}$` } });
    if (!video || video.visibility === 'private' && String(video.owner) !== String(req.user?._id)) {
      return res.status(404).json({ success: false, message: 'Video file not found.' });
    }

    let viewer = req.user;
    if (req.query.token) {
      try {
        const tokenPayload = jwt.verify(String(req.query.token), JWT_SECRET);
        if (tokenPayload.scope === 'premium-video' && tokenPayload.videoId === String(video._id)) {
          viewer = await User.findById(tokenPayload.id);
        }
      } catch {
        return res.status(401).json({ success: false, message: 'Video access token is invalid or expired.' });
      }
    }
    if (video.premium && !hasPremiumAccess(viewer)) {
      return res.status(403).json({ success: false, message: 'An active paid membership is required to stream this video.' });
    }

    const filePath = path.resolve(__dirname, '../uploads/videos', filename);
    if (path.dirname(filePath) !== path.resolve(__dirname, '../uploads/videos') || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Video file not found.' });
    }
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : ext === '.mkv' ? 'video/x-matroska' : 'video/mp4';
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);

    if (!range) {
      res.setHeader('Content-Length', fileSize);
      return fs.createReadStream(filePath).pipe(res);
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }
    const suffixLength = match[1] ? null : Number(match[2]);
    const start = match[1] ? Number(match[1]) : Math.max(0, fileSize - suffixLength);
    const end = match[2] && match[1] ? Number(match[2]) : fileSize - 1;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= fileSize) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }
    const finalEnd = Math.min(end, fileSize - 1);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${finalEnd}/${fileSize}`);
    res.setHeader('Content-Length', finalEnd - start + 1);
    return fs.createReadStream(filePath, { start, end: finalEnd }).pipe(res);
  } catch (error) {
    next(error);
  }
};

export const streamVideoMedia = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });
    if (video.visibility === 'private' && String(video.owner) !== String(req.user?._id)) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }
    let viewer = req.user;
    if (req.query.token) {
      let payload;
      try {
        payload = jwt.verify(String(req.query.token), JWT_SECRET);
      } catch {
        return res.status(401).json({ success: false, message: 'Video access token is invalid or expired.' });
      }
      if (payload.scope !== 'premium-video' || payload.videoId !== String(video._id)) {
        return res.status(401).json({ success: false, message: 'Video access token is invalid.' });
      }
      viewer = await User.findById(payload.id);
    }
    if (video.premium && !hasPremiumAccess(viewer)) {
      return res.status(403).json({ success: false, message: 'An active paid membership is required to stream this video.' });
    }
    const filename = localVideoFilename(video.videoUrl);
    if (filename) {
      req.params.filename = filename;
      return streamVideoFile(req, res, next);
    }
    if (!isAllowedRemoteMediaUrl(video.videoUrl)) {
      return res.status(502).json({ success: false, message: 'This premium source host is not on the media allowlist.' });
    }
    const upstream = await fetch(video.videoUrl, {
      headers: req.headers.range ? { Range: req.headers.range } : {},
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
    if (![200, 206, 416].includes(upstream.status) || !upstream.body) {
      return res.status(502).json({ success: false, message: 'Premium source video could not be streamed.' });
    }
    res.status(upstream.status);
    for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    const { Readable } = await import('stream');
    return Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return res.status(504).json({ success: false, message: 'Premium video stream timed out.' });
    next(error);
  }
};
