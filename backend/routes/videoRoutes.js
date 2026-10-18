import express from 'express';
import {
  createVideo,
  getVideos,
  getVideoById,
  incrementView,
  updateVideo,
  deleteVideo,
  streamVideoFile,
  streamVideoMedia,
} from '../controllers/videoController.js';
import {
  toggleLike,
  toggleDislike,
  getMyLikedVideos,
} from '../controllers/reactionController.js';
import {
  getVideoComments,
  createComment,
} from '../controllers/commentController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Specific routes first to avoid matching :id
router.get('/liked/my', protect, getMyLikedVideos);
router.get('/stream/:filename', optionalAuth, streamVideoFile);
router.get('/media/:id', optionalAuth, streamVideoMedia);

// General video routes
router
  .route('/')
  .get(optionalAuth, getVideos)
  .post(
    protect,
    uploadMedia.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
    createVideo
  );

router
  .route('/:id')
  .get(optionalAuth, getVideoById)
  .put(protect, uploadMedia.single('thumbnail'), updateVideo)
  .delete(protect, deleteVideo);

// Interactions
router.post('/:id/view', optionalAuth, incrementView);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/dislike', protect, toggleDislike);

// Comments nested under video
router
  .route('/:videoId/comments')
  .get(getVideoComments)
  .post(protect, createComment);

export default router;
