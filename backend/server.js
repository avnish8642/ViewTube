import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import watchLaterRoutes from './routes/watchLaterRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import downloadRoutes from './routes/downloadRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';

import Video from './models/Video.js';
import { seedDatabase } from './utils/seeder.js';

// Setup environment and paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
const allowedOrigins = (
  process.env.CLIENT_URL ||
  'https://viewtube-frontend-qfwz.onrender.com,http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Video uploads are delivered through authenticated streaming/download routes.
app.use('/uploads/thumbnails', express.static(path.join(__dirname, 'uploads', 'thumbnails')));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads', 'avatars')));
app.use('/uploads/banners', express.static(path.join(__dirname, 'uploads', 'banners')));

// Root Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'ViewTube Video Platform REST API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

const platformModules = [
  {
    id: 'meetflow',
    name: 'MeetFlow Live Rooms',
    category: 'Video Calling',
    summary: 'Password-protected sessions with live moderation, screen sharing, chat, and room role controls for creators and teams.',
    highlights: ['Secure room access', 'Realtime chats', 'Host controls', 'Screen sharing'],
    metrics: ['6 participant cap', 'Live roster', 'Media device switching'],
    accent: 'from-red-500 to-orange-400',
    icon: 'MonitorPlay',
  },
  {
    id: 'vdm',
    name: 'VDM Download Vault',
    category: 'Subscription & Downloads',
    summary: 'Quota-aware downloads, secure media delivery, and plan enforcement that protect premium content and stop abuse.',
    highlights: ['Tiered plans', 'Atomic quota checks', 'Duplicate prevention', 'Server-side validation'],
    metrics: ['Free to Gold', 'Daily limits', 'Concurrent guardrails'],
    accent: 'from-cyan-500 to-blue-500',
    icon: 'Download',
  },
  {
    id: 'aura',
    name: 'AuraStream Billing',
    category: 'Payments',
    summary: 'Razorpay billing with server-verified membership upgrades, invoices, premium access, and payment history.',
    highlights: ['Hosted checkout', 'Plan dashboard', 'Billing history', 'Secure billing'],
    metrics: ['Razorpay verification', 'INR plans', 'Invoice tracking'],
    accent: 'from-violet-500 to-purple-500',
    icon: 'WalletCards',
  },
  {
    id: 'player',
    name: 'Custom Player Lab',
    category: 'Playback',
    summary: 'Advanced controls for seeking, fullscreen, keyboard shortcuts, progress signals, and polished media playback.',
    highlights: ['Custom timeline', 'Keyboard shortcuts', 'Fullscreen', 'Range streaming'],
    metrics: ['10s skip controls', 'Progress tracking', 'Immersive watch experience'],
    accent: 'from-emerald-500 to-teal-500',
    icon: 'Video',
  },
  {
    id: 'northstar',
    name: 'Northstar Security Center',
    category: 'Authentication',
    summary: 'Adaptive login monitoring with trusted devices, OTP checks, optional configured GeoIP signals, and account security history.',
    highlights: ['Context-aware login', 'OTP verification', 'Trusted devices', 'Security activity log'],
    metrics: ['OTP verification', 'Optional GeoIP lookup', 'Device history'],
    accent: 'from-amber-500 to-yellow-500',
    icon: 'ShieldCheck',
  },
  {
    id: 'commonplace',
    name: 'Commonplace Moderation Hub',
    category: 'Community',
    summary: 'Multilingual discussion, automatic translation, spam detection, and moderator actions to keep communities safe and active.',
    highlights: ['Translation pipeline', 'Report triage', 'Content moderation', 'Guest session safety'],
    metrics: ['12 posts / 10 min', '3-step review flow', 'Language-aware moderation'],
    accent: 'from-pink-500 to-rose-500',
    icon: 'MessageSquareText',
  },
];

app.get('/api/feature-suite', (_req, res) => {
  res.json({
    success: true,
    modules: platformModules,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/watch-later', watchLaterRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/meetings', meetingRoutes);

// Error Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server and connect Database
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed if database is completely empty
    const videoCount = await Video.countDocuments();
    if (videoCount === 0) {
      console.log('[Server] Database is empty. Auto-seeding initial demo data...');
      await seedDatabase();
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 ViewTube Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 API endpoints available on port ${PORT}`);
    });

    return server;
  } catch (err) {
    console.error(`❌ Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();

export default app;
