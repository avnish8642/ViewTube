import mongoose from 'mongoose';

const downloadRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  idempotencyKey: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'started', 'complete', 'interrupted', 'failed', 'cancelled'], default: 'pending' },
  dedupeActive: { type: Boolean, default: false },
  dedupeUntil: { type: Date, default: null },
  fileSize: { type: Number, default: 0, min: 0 },
  ipAddress: { type: String, default: '' },
  device: { type: String, default: '' },
  browser: { type: String, default: 'Unknown' },
  plan: { type: String, enum: ['free', 'bronze', 'silver', 'gold'], required: true },
  dayKey: { type: String, required: true },
  monthKey: { type: String, required: true },
}, { timestamps: true });

downloadRecordSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
downloadRecordSchema.index({ user: 1, requestedAt: -1 });
downloadRecordSchema.index({ user: 1, video: 1 }, { unique: true, partialFilterExpression: { dedupeActive: true } });

export default mongoose.model('DownloadRecord', downloadRecordSchema);
