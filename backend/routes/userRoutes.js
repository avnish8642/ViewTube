import express from 'express';
import {
  getUserById,
  updateProfile,
  changePassword,
  getUserVideos,
  updateThemePreference,
  getSecurityActivity,
  getTrustedDevices,
  revokeTrustedDevice,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.put('/preferences/theme', protect, updateThemePreference);
router.get('/security/activity', protect, getSecurityActivity);
router.get('/security/devices', protect, getTrustedDevices);
router.delete('/security/devices/:deviceId', protect, revokeTrustedDevice);
router.put('/profile', protect, uploadMedia.single('avatar'), updateProfile);
router.put('/password', protect, changePassword);
router.get('/:id', getUserById);
router.get('/:id/videos', getUserVideos);

export default router;
