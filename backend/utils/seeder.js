import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import User from '../models/User.js';
import Channel from '../models/Channel.js';
import Video from '../models/Video.js';
import Comment from '../models/Comment.js';
import Reaction from '../models/Reaction.js';
import Subscription from '../models/Subscription.js';
import WatchLater from '../models/WatchLater.js';
import WatchHistory from '../models/WatchHistory.js';
import { connectDB } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const sampleUsers = [
  {
    username: 'aarav_sharma',
    email: 'aarav@viewtube.io',
    password: 'password123',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    channelName: 'Aarav Explains',
    handle: 'aaravexplains',
    bio: 'Making technology, coding, and AI approachable for curious minds.',
    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
    subscribersCount: 142000,
  },
  {
    username: 'priya_nair',
    email: 'priya@viewtube.io',
    password: 'password123',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    channelName: 'Priya Outside',
    handle: 'priyaoutside',
    bio: 'Field notes, wildlife films, and slow journeys through the outdoors.',
    banner: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=80',
    subscribersCount: 895000,
  },
  {
    username: 'sam_dev',
    email: 'sam@viewtube.io',
    password: 'password123',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    channelName: 'CodeCraft Studio',
    handle: 'codecraft',
    bio: 'Full-stack software engineering, architecture patterns, and clean code.',
    banner: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80',
    subscribersCount: 320000,
  },
  {
    username: 'chloe_beats',
    email: 'chloe@viewtube.io',
    password: 'password123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    channelName: 'Lofi Pulse Radio',
    handle: 'lofipulse',
    bio: 'Chilled beats to relax, study, code, and sleep to. 24/7 good vibes.',
    banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1400&q=80',
    subscribersCount: 654000,
  },
];

const sampleVideos = [
  {
    title: 'Building Modern React Applications in 2026: Complete Architecture Guide',
    description: `Dive deep into modern full-stack engineering with React 19, Vite, Server Components, and responsive micro-interactions. In this comprehensive masterclass, we explore architectural patterns for scalable state management, optimal caching, and snappy UI performance.\n\nTimestamps:\n0:00 - Introduction\n2:15 - Architecture Overview\n5:40 - State Management\n12:10 - Production Optimizations\n22:30 - Final Thoughts`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=900&q=80',
    category: 'Coding',
    tags: ['React', 'WebDev', 'JavaScript', 'Frontend', 'Tutorial'],
    duration: '09:56',
    views: 184520,
    likesCount: 14200,
    dislikesCount: 42,
    channelIndex: 2, // CodeCraft Studio
  },
  {
    title: 'Planet Earth: The Majestic Arctic Wildlife in 4K HDR',
    description: `Experience the serene beauty and untamed raw power of the Arctic wilderness. Captured across 18 months using custom low-temperature camera rigs and thermal imaging sensors.\n\nMusic by Arctic Ensemble.\nSpecial thanks to the Nordic Conservation Society.`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=900&q=80',
    category: 'Entertainment',
    tags: ['Nature', 'Wildlife', '4K', 'Documentary', 'Arctic'],
    duration: '10:53',
    views: 892300,
    likesCount: 78500,
    dislikesCount: 120,
    channelIndex: 1, // Priya Outside
  },
  {
    title: 'Next-Gen Quantum Computing Explained: Why Everything Is About to Change',
    description: `Quantum supremacy is no longer science fiction. We break down qubits, superposition, quantum entanglement, and how quantum processors will reshape cryptography, materials science, and AI within this decade.\n\nSubscribe for more weekly tech breakthroughs!`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80',
    category: 'Tech',
    tags: ['Quantum', 'Physics', 'Computing', 'FutureTech', 'Science'],
    duration: '08:15',
    views: 456200,
    likesCount: 31200,
    dislikesCount: 180,
    channelIndex: 0, // Aarav Explains
  },
  {
    title: 'Lofi Chill Beats - Ambient Sessions for Coding & Deep Focus',
    description: `Continuous seamless beats to boost productivity, enter deep focus flow states, and eliminate distractions. Crafted with analog synths, mellow vinyl crackle, and soothing Rhodes pianos.`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=900&q=80',
    category: 'Music',
    tags: ['Lofi', 'StudyMusic', 'Chillhop', 'Ambient', 'Focus'],
    duration: '15:20',
    views: 1240500,
    likesCount: 98400,
    dislikesCount: 310,
    channelIndex: 3, // Lofi Pulse Radio
  },
  {
    title: 'Top 10 Unreal Engine 5.5 Features That Redefine Game Graphics',
    description: `Nanite improvements, Lumen hardware ray tracing enhancements, neural animation blending, and massive open-world streaming benchmarks tested on latest GPU hardware.`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80',
    category: 'Gaming',
    tags: ['UnrealEngine', 'Gaming', 'Graphics', '3D', 'Tech'],
    duration: '12:05',
    views: 310400,
    likesCount: 22100,
    dislikesCount: 95,
    channelIndex: 0, // Aarav Explains
  },
  {
    title: 'Deep Dive: Microservices vs Modular Monolith in 2026',
    description: `Stop over-engineering distributed systems prematurely! We compare operational complexity, latency, transactional boundaries, and deployment velocity with real production data.`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80',
    category: 'Coding',
    tags: ['Architecture', 'Microservices', 'Backend', 'SoftwareEngineering'],
    duration: '14:40',
    views: 215000,
    likesCount: 18900,
    dislikesCount: 88,
    channelIndex: 2, // CodeCraft Studio
  },
  {
    title: 'Hidden Waterfalls of New Zealand: 4K Drone Cinematic Odyssey',
    description: `Travel with us through the lush fiords and remote emerald river canyons of the South Island. Shot entirely on cinema drones with ND polarization.`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=80',
    category: 'Travel',
    tags: ['NewZealand', 'Travel', 'Drone', '4K', 'Cinematic'],
    duration: '07:18',
    views: 520000,
    likesCount: 45000,
    dislikesCount: 52,
    channelIndex: 1, // Priya Outside
  },
  {
    title: 'The Neuroscience of Habit Formation: Rewire Your Brain in 30 Days',
    description: `How dopamine loops and neuroplasticity shape our daily behaviors. Proven behavioral protocols derived from Stanford and MIT research labs to optimize focus and consistency.`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=900&q=80',
    category: 'Education',
    tags: ['Neuroscience', 'Habits', 'Productivity', 'SelfImprovement', 'Science'],
    duration: '11:22',
    views: 670100,
    likesCount: 56300,
    dislikesCount: 110,
    channelIndex: 0, // Aarav Explains
  },
  {
    title: 'Synthwave Night Ride - Retro Electronic Sunset Mix',
    description: `Cruising into the neon horizon. 80s analog nostalgia meets contemporary punchy cyberpunk basslines. Perfect soundtrack for late night drives and coding marathons.`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80',
    category: 'Music',
    tags: ['Synthwave', 'Retrowave', 'Electronic', 'NightDrive', 'Music'],
    duration: '16:45',
    views: 820300,
    likesCount: 69200,
    dislikesCount: 140,
    channelIndex: 3, // Lofi Pulse Radio
  },
  {
    title: 'Cybersecurity in 2026: Defending Against Autonomous AI Threats',
    description: `As autonomous agents scale, automated vulnerability discovery and spear-phishing are evolving exponentially. How modern SOC teams are responding with zero-trust architectures and behavioral heuristic firewalls.`,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=80',
    category: 'Tech',
    tags: ['Cybersecurity', 'AI', 'InfoSec', 'Hacking', 'Technology'],
    duration: '13:10',
    views: 295000,
    likesCount: 24800,
    dislikesCount: 65,
    channelIndex: 0, // Aarav Explains
  },
];

const sampleComments = [
  'The production quality and level of detail in this video is astounding! Truly inspiring work.',
  'This solved the exact problem I was wrestling with at work today. Thank you so much for breaking it down!',
  'Subscribed immediately. The pacing, audio quality, and depth of explanation is top tier.',
  'That explanation at 5:40 was worth watching the entire video alone. Brilliant insights!',
  'Been following this channel for years and the content just keeps getting better. Keep it up!',
  'Bookmarked this to review again later. Solid gold engineering principles right here.',
];

export const seedDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    console.log('[Seeder] Clearing old records...');
    await Promise.all([
      User.deleteMany({}),
      Channel.deleteMany({}),
      Video.deleteMany({}),
      Comment.deleteMany({}),
      Reaction.deleteMany({}),
      Subscription.deleteMany({}),
      WatchLater.deleteMany({}),
      WatchHistory.deleteMany({}),
    ]);

    console.log('[Seeder] Creating demo users and channels...');
    const createdUsers = [];
    const createdChannels = [];

    for (const u of sampleUsers) {
      const user = await User.create({
        username: u.username,
        email: u.email,
        password: u.password,
        avatar: u.avatar,
      });

      const channel = await Channel.create({
        name: u.channelName,
        handle: u.handle,
        description: u.bio,
        avatar: u.avatar,
        banner: u.banner,
        owner: user._id,
        subscribersCount: u.subscribersCount,
      });

      user.channel = channel._id;
      await user.save();

      createdUsers.push(user);
      createdChannels.push(channel);
    }

    console.log('[Seeder] Creating realistic demo videos...');
    const createdVideos = [];

    for (const v of sampleVideos) {
      const channel = createdChannels[v.channelIndex];
      const owner = createdUsers[v.channelIndex];

      const video = await Video.create({
        title: v.title,
        description: v.description,
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl,
        category: v.category,
        tags: v.tags,
        duration: v.duration,
        views: v.views,
        likesCount: v.likesCount,
        dislikesCount: v.dislikesCount,
        commentsCount: 0,
        owner: owner._id,
        channel: channel._id,
        visibility: 'public',
      });

      createdVideos.push(video);
    }

    console.log('[Seeder] Creating comments, reactions, and subscriptions...');
    // Add comments to videos
    for (let i = 0; i < createdVideos.length; i++) {
      const video = createdVideos[i];
      const commentCount = Math.floor(Math.random() * 4) + 2;

      for (let j = 0; j < commentCount; j++) {
        const commenter = createdUsers[j % createdUsers.length];
        const commentText = sampleComments[(i + j) % sampleComments.length];

        await Comment.create({
          user: commenter._id,
          video: video._id,
          content: commentText,
          likesCount: Math.floor(Math.random() * 25),
        });
      }

      video.commentsCount = commentCount;
      await video.save();
    }

    // Add sample subscriptions among demo users
    await Subscription.create({
      subscriber: createdUsers[0]._id,
      channel: createdChannels[1]._id,
    });
    await Subscription.create({
      subscriber: createdUsers[0]._id,
      channel: createdChannels[2]._id,
    });
    await Subscription.create({
      subscriber: createdUsers[1]._id,
      channel: createdChannels[0]._id,
    });

    console.log('✅ [Seeder] Database seeded successfully with realistic data!');
    return { users: createdUsers, channels: createdChannels, videos: createdVideos };
  } catch (error) {
    console.error('❌ [Seeder] Database seeding failed:', error.message);
    throw error;
  }
};

// If run directly via `node utils/seeder.js`
if (process.argv[1] && process.argv[1].endsWith('seeder.js')) {
  seedDatabase()
    .then(() => {
      console.log('[Seeder] Process exiting.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
