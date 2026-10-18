import express from 'express';
import {
  createVideoDownload,
  getDownloadHistory,
  streamAuthorizedDownload,
} from '../controllers/membershipController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/', getDownloadHistory);
router.post('/:videoId', createVideoDownload);
router.get('/:downloadId/file', streamAuthorizedDownload);

export default router;
