import express from 'express';
import {
  getChannelById,
  updateChannel,
  getChannelVideos,
  toggleSubscription,
  getMySubscriptions,
} from '../controllers/channelController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/subscriptions/my', protect, getMySubscriptions);

router
  .route('/:id')
  .get(optionalAuth, getChannelById)
  .put(
    protect,
    uploadMedia.fields([
      { name: 'avatar', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
    updateChannel
  );

router.get('/:id/videos', getChannelVideos);
router
  .route('/:id/subscribe')
  .post(protect, toggleSubscription)
  .delete(protect, toggleSubscription);

export default router;
