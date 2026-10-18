import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
    },
    thumbnailUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=640&q=80',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dislikesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'All',
        'Gaming',
        'Music',
        'Tech',
        'Education',
        'Entertainment',
        'News',
        'Coding',
        'Sports',
        'Travel',
      ],
      default: 'Entertainment',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    duration: {
      type: String,
      default: '0:00',
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
    },
    premium: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
videoSchema.index({ channel: 1, createdAt: -1 });
videoSchema.index({ category: 1, createdAt: -1 });
videoSchema.index({ views: -1 });

export default mongoose.model('Video', videoSchema);
