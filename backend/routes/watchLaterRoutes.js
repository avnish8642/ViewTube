import express from 'express';
import {
  getWatchLater,
  addToWatchLater,
  removeFromWatchLater,
  toggleWatchLater,
} from '../controllers/watchLaterController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getWatchLater);
router.post('/:videoId', addToWatchLater);
router.delete('/:videoId', removeFromWatchLater);
router.post('/:videoId/toggle', toggleWatchLater);

export default router;
