import express from 'express';
import { register, login, logout, getMe, verifyLoginOtp, getDefaultAccountSession } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { createIpRateLimiter } from '../utils/security.js';

const router = express.Router();
const signInRateLimit = createIpRateLimiter({
  limit: 20,
  windowMs: 15 * 60 * 1000,
  message: 'Too many sign-in attempts. Wait before trying again.',
});

router.post('/register', register);
router.post('/default-account', signInRateLimit, getDefaultAccountSession);
router.post('/login', signInRateLimit, login);
router.post('/verify-otp', signInRateLimit, verifyLoginOtp);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
