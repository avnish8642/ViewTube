import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    watchedAt: {
      type: Date,
      default: Date.now,
    },
    progressSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

watchHistorySchema.index({ user: 1, video: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, watchedAt: -1 });

export default mongoose.model('WatchHistory', watchHistorySchema);
