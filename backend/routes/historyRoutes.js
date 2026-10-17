import express from 'express';
import {
  getWatchHistory,
  removeHistoryItem,
  clearWatchHistory,
} from '../controllers/historyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getWatchHistory);
router.delete('/:videoId', removeHistoryItem);
router.delete('/', clearWatchHistory);

export default router;
