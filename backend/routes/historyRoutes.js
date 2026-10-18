import express from 'express';
import {
  getWatchHistory,
  removeHistoryItem,
  clearWatchHistory,
  getVideoProgress,
  saveVideoProgress,
} from '../controllers/historyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getWatchHistory);
router.get('/progress/:videoId', getVideoProgress);
router.put('/progress/:videoId', saveVideoProgress);
router.delete('/:videoId', removeHistoryItem);
router.delete('/', clearWatchHistory);

export default router;
