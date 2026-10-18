import crypto from 'crypto';
import Comment from '../models/Comment.js';
import CommentCaptcha from '../models/CommentCaptcha.js';
import CommentReport from '../models/CommentReport.js';
import Video from '../models/Video.js';

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const POST_WINDOW_MS = 10 * 60 * 1000;
const MAX_POSTS_PER_WINDOW = 12;
const CAPTCHAS_AFTER_POSTS = 3;
const CAPTCHA_PEPPER = process.env.CAPTCHA_SECRET || process.env.JWT_SECRET || 'local-captcha-secret';

const hashAnswer = (value) => crypto.createHash('sha256').update(`${CAPTCHA_PEPPER}:${value}`).digest('hex');
const equalHash = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const containsBlockedTerm = (content) => {
  const terms = (process.env.BLOCKED_TERMS || '').split(',').map((term) => term.trim()).filter(Boolean);
  return terms.some((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(content));
};

const validateContent = (content) => {
  if (typeof content !== 'string' || !content.trim()) return 'Comment content cannot be empty.';
  if (content.trim().length > 2000) return 'Comment cannot exceed 2000 characters.';
  if (/<\/?(?:script|iframe|object|embed)\b/i.test(content) || /javascript\s*:/i.test(content)) {
    return 'Comment contains unsafe markup or a link.';
  }
  if (/(.)\1{19,}/u.test(content)) return 'Comment contains excessive repeated characters.';
  if (containsBlockedTerm(content)) return 'Comment contains language that is not allowed.';
  return null;
};

const verifyModerator = (req, res, next) => {
  const expected = process.env.MODERATOR_KEY;
  if (!expected) {
    return res.status(503).json({ success: false, message: 'Moderator review is not configured.' });
  }
  const supplied = req.get('x-moderator-key') || '';
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ success: false, message: 'Moderator access denied.' });
  }
  return next();
};

export const getVideoComments = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const sortBy = String(req.query.sort || 'newest');
    const sort = sortBy === 'oldest' ? { createdAt: 1 }
      : ['liked', 'relevant'].includes(sortBy) ? { likesCount: -1, createdAt: -1 }
        : { createdAt: -1 };
    const query = { video: req.params.videoId, deleted: { $ne: true } };

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('user', 'username avatar channel')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Comment.countDocuments(query),
    ]);

    res.status(200).json({ success: true, count: comments.length, total, comments });
  } catch (error) {
    next(error);
  }
};

export const createCommentCaptcha = async (req, res, next) => {
  try {
    const recentCount = await Comment.countDocuments({
      user: req.user._id,
      createdAt: { $gte: new Date(Date.now() - POST_WINDOW_MS) },
    });
    if (recentCount < CAPTCHAS_AFTER_POSTS) {
      return res.status(200).json({ success: true, required: false });
    }

    const left = crypto.randomInt(2, 10);
    const right = crypto.randomInt(2, 10);
    const challenge = await CommentCaptcha.create({
      user: req.user._id,
      answerHash: hashAnswer(String(left + right)),
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });

    res.status(200).json({
      success: true,
      required: true,
      challengeId: challenge._id,
      prompt: `What is ${left} + ${right}?`,
      expiresInSeconds: 120,
    });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { content, parentId, captchaId, captchaAnswer } = req.body;
    const validationError = validateContent(content);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    const windowStart = new Date(Date.now() - POST_WINDOW_MS);
    const recentCount = await Comment.countDocuments({
      user: req.user._id,
      createdAt: { $gte: windowStart },
    });
    if (recentCount >= MAX_POSTS_PER_WINDOW) {
      return res.status(429).json({ success: false, message: 'Comment limit reached. Please try again later.' });
    }
    if (recentCount >= CAPTCHAS_AFTER_POSTS) {
      if (!captchaId || typeof captchaAnswer !== 'string') {
        return res.status(428).json({ success: false, message: 'Complete the verification challenge before posting.' });
      }
      const challenge = await CommentCaptcha.findOneAndUpdate(
        {
          _id: captchaId,
          user: req.user._id,
          expiresAt: { $gt: new Date() },
          usedAt: null,
          answerHash: hashAnswer(captchaAnswer.trim()),
        },
        { $set: { usedAt: new Date() } },
        { new: true }
      );
      if (!challenge) return res.status(400).json({ success: false, message: 'Verification challenge is invalid, expired, or already used.' });
    }

    const normalized = content.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    const duplicate = await Comment.findOne({
      user: req.user._id,
      video: videoId,
      createdAt: { $gte: windowStart },
      content: { $regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (duplicate) return res.status(409).json({ success: false, message: 'Duplicate comments are not allowed.' });

    if (parentId) {
      const parent = await Comment.findOne({ _id: parentId, video: videoId });
      if (!parent) return res.status(404).json({ success: false, message: 'Reply target not found.' });
    }

    const comment = await Comment.create({
      user: req.user._id,
      video: videoId,
      content: content.trim(),
      parent: parentId || null,
    });
    await Video.updateOne({ _id: videoId }, { $inc: { commentsCount: 1 } });
    const populated = await Comment.findById(comment._id).populate('user', 'username avatar channel');
    res.status(201).json({ success: true, message: 'Comment posted successfully.', comment: populated });
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (req, res, next) => {
  try {
    const { content, revision } = req.body;
    const validationError = validateContent(content);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.deleted) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (String(comment.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized to edit this comment.' });
    if (Date.now() - comment.createdAt.getTime() > EDIT_WINDOW_MS) return res.status(403).json({ success: false, message: 'Comments can only be edited for 15 minutes.' });
    if (Number.isInteger(revision) && comment.revision !== revision) return res.status(409).json({ success: false, message: 'Comment changed in another session. Reload before editing.' });

    comment.revisions.push({ content: comment.content });
    comment.content = content.trim();
    comment.edited = true;
    comment.revision += 1;
    await comment.save();
    const populated = await Comment.findById(comment._id).populate('user', 'username avatar channel');
    res.status(200).json({ success: true, message: 'Comment updated successfully.', comment: populated });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.deleted) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (String(comment.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized to delete this comment.' });
    if (Date.now() - comment.createdAt.getTime() > EDIT_WINDOW_MS) return res.status(403).json({ success: false, message: 'Comments can only be deleted for 15 minutes.' });

    comment.deleted = true;
    comment.content = '[deleted]';
    await comment.save();
    await Video.updateOne({ _id: comment.video }, { $inc: { commentsCount: -1 } });
    res.status(200).json({ success: true, message: 'Comment deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const toggleCommentVote = async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!['like', 'dislike'].includes(type)) return res.status(400).json({ success: false, message: 'Vote type must be like or dislike.' });
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.deleted) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const userId = String(req.user._id);
    const current = type === 'like' ? comment.likes : comment.dislikes;
    const other = type === 'like' ? comment.dislikes : comment.likes;
    const index = current.findIndex((id) => String(id) === userId);
    if (index >= 0) current.splice(index, 1);
    else {
      other.pull(req.user._id);
      current.push(req.user._id);
    }
    comment.likesCount = comment.likes.length;
    comment.dislikesCount = comment.dislikes.length;
    await comment.save();
    res.status(200).json({ success: true, likesCount: comment.likesCount, dislikesCount: comment.dislikesCount, userVote: index >= 0 ? null : type });
  } catch (error) {
    next(error);
  }
};

export const reportComment = async (req, res, next) => {
  try {
    const { reason, notes = '' } = req.body;
    const allowed = ['spam', 'harassment', 'offensive-content', 'misinformation', 'other'];
    if (!allowed.includes(reason)) return res.status(400).json({ success: false, message: 'Select a valid report reason.' });
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.deleted) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (String(comment.user) === String(req.user._id)) return res.status(400).json({ success: false, message: 'You cannot report your own comment.' });
    try {
      await CommentReport.create({ comment: comment._id, reporter: req.user._id, reason, notes: String(notes).slice(0, 500) });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ success: false, message: 'You have already reported this comment.' });
      throw error;
    }
    comment.flaggedForReview = true;
    await comment.save();
    res.status(201).json({ success: true, message: 'Report submitted for moderator review.' });
  } catch (error) {
    next(error);
  }
};

export const getCommentHistory = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (String(comment.user) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized to view this history.' });
    res.status(200).json({
      success: true,
      history: [...comment.revisions.map((revision) => ({ content: revision.content, at: revision.editedAt })), { content: comment.content, at: comment.updatedAt }],
    });
  } catch (error) {
    next(error);
  }
};

export const translateComment = async (req, res, next) => {
  try {
    const { text, targetLanguage } = req.body;
    if (typeof text !== 'string' || !text.trim() || text.length > 2000 || !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(targetLanguage || '')) {
      return res.status(400).json({ success: false, message: 'Provide comment text and a valid target language code.' });
    }
    if (!process.env.TRANSLATE_API_URL) return res.status(503).json({ success: false, message: 'Translation is not configured. Set TRANSLATE_API_URL to a LibreTranslate-compatible service.' });
    const response = await fetch(process.env.TRANSLATE_API_URL.replace(/\/$/, '') + '/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.TRANSLATE_API_KEY ? { 'X-API-Key': process.env.TRANSLATE_API_KEY } : {}),
      },
      body: JSON.stringify({ q: text, source: 'auto', target: targetLanguage, format: 'text', ...(process.env.TRANSLATE_API_KEY ? { api_key: process.env.TRANSLATE_API_KEY } : {}) }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return res.status(502).json({ success: false, message: 'Translation provider returned an error. Try again later.' });
    const result = await response.json();
    if (typeof result.translatedText !== 'string') return res.status(502).json({ success: false, message: 'Translation provider returned an invalid response.' });
    res.status(200).json({ success: true, translatedText: result.translatedText });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return res.status(504).json({ success: false, message: 'Translation provider timed out.' });
    next(error);
  }
};

export const getModerationReports = [verifyModerator, async (req, res, next) => {
  try {
    const reports = await CommentReport.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate({ path: 'comment', populate: { path: 'user', select: 'username avatar' } })
      .populate('reporter', 'username');
    res.status(200).json({ success: true, reports });
  } catch (error) {
    next(error);
  }
}];

export const reviewModerationReport = [verifyModerator, async (req, res, next) => {
  try {
    const { action, notes = '' } = req.body;
    if (!['approved', 'removed', 'dismissed'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid moderation action.' });
    const report = await CommentReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
    if (report.status !== 'pending') return res.status(409).json({ success: false, message: 'Report has already been reviewed.' });
    report.status = action;
    report.reviewNotes = String(notes).slice(0, 500);
    report.reviewedAt = new Date();
    await report.save();
    if (action === 'removed') {
      await Comment.updateOne({ _id: report.comment }, { $set: { deleted: true, content: '[removed by moderator]' } });
      await Video.updateOne({ _id: (await Comment.findById(report.comment))?.video }, { $inc: { commentsCount: -1 } });
    }
    const remaining = await CommentReport.countDocuments({ comment: report.comment, status: 'pending' });
    await Comment.updateOne({ _id: report.comment }, { $set: { flaggedForReview: remaining > 0 } });
    res.status(200).json({ success: true, report });
  } catch (error) {
    next(error);
  }
}];
