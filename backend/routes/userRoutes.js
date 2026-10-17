import express from 'express';
import {
  getUserById,
  updateProfile,
  changePassword,
  getUserVideos,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.put('/profile', protect, uploadMedia.single('avatar'), updateProfile);
router.put('/password', protect, changePassword);
router.get('/:id', getUserById);
router.get('/:id/videos', getUserVideos);

export default router;
