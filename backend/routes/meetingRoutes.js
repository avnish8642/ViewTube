import express from 'express';
import multer from 'multer';
import {
  createMeeting,
  downloadMeetingAttachment,
  getMeeting,
  joinMeeting,
  leaveMeeting,
  moderateParticipant,
  pollMeetingSignals,
  postMeetingMessage,
  sendMeetingSignal,
  updateMeeting,
  updateOwnStatus,
  uploadMeetingAttachment,
} from '../controllers/meetingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.use(protect);
router.post('/', createMeeting);
router.post('/:roomId/join', joinMeeting);
router.get('/:roomId/signals', pollMeetingSignals);
router.post('/:roomId/signals', sendMeetingSignal);
router.post('/:roomId/messages', postMeetingMessage);
router.post('/:roomId/attachments', uploadAttachment.single('file'), uploadMeetingAttachment);
router.get('/:roomId/attachments/:attachmentId', downloadMeetingAttachment);
router.patch('/:roomId/participants/:userId', moderateParticipant);
router.patch('/:roomId/status', updateOwnStatus);
router.post('/:roomId/leave', leaveMeeting);
router.patch('/:roomId', updateMeeting);
router.get('/:roomId', getMeeting);

export default router;
