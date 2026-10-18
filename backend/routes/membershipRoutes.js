import express from 'express';
import {
  cancelMembershipRenewal,
  createMembershipOrder,
  getMembershipDashboard,
  getPlans,
  verifyMembershipPayment,
} from '../controllers/membershipController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/plans', getPlans);
router.get('/current', protect, getMembershipDashboard);
router.post('/orders', protect, createMembershipOrder);
router.post('/verify', protect, verifyMembershipPayment);
router.post('/cancel', protect, cancelMembershipRenewal);

export default router;
