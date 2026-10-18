import mongoose from 'mongoose';

const commentReportSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'offensive-content', 'misinformation', 'other'],
      required: true,
    },
    notes: { type: String, maxlength: 500, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'removed', 'dismissed'],
      default: 'pending',
    },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

commentReportSchema.index({ comment: 1, reporter: 1 }, { unique: true });
commentReportSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model('CommentReport', commentReportSchema);
