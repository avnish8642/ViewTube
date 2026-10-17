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

import Video from './models/Video.js';
import { seedDatabase } from './utils/seeder.js';

// Setup environment and paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow development frontend requests
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Static folder for local file uploads (videos, thumbnails, avatars)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'ViewTube Video Platform REST API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
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
      console.log(`📡 API Endpoints available at http://localhost:${PORT}/api`);
    });

    return server;
  } catch (err) {
    console.error(`❌ Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();

export default app;
