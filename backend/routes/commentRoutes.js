import express from 'express';
import {
  createCommentCaptcha,
  getCommentHistory,
  updateComment,
  deleteComment,
  toggleCommentVote,
  reportComment,
  translateComment,
  getModerationReports,
  reviewModerationReport,
} from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { createIpRateLimiter } from '../utils/security.js';

const router = express.Router();
const captchaRateLimit = createIpRateLimiter({
  limit: 6,
  windowMs: 60 * 1000,
  message: 'Too many verification challenges. Wait before requesting another.',
});

router.post('/captcha', protect, captchaRateLimit, createCommentCaptcha);
router.post('/translate', protect, translateComment);
router.get('/moderation/reports', getModerationReports);
router.patch('/moderation/reports/:id', reviewModerationReport);

router.get('/:id/history', protect, getCommentHistory);
router.post('/:id/vote', protect, toggleCommentVote);
router.post('/:id/reports', protect, reportComment);
router
  .route('/:id')
  .put(protect, updateComment)
  .delete(protect, deleteComment);

export default router;
