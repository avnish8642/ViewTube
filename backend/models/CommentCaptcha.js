import mongoose from 'mongoose';

const commentCaptchaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answerHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});

commentCaptchaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('CommentCaptcha', commentCaptchaSchema);
