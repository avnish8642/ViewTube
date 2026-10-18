import mongoose from 'mongoose';

const downloadQuotaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dayKey: { type: String, required: true },
  monthKey: { type: String, required: true },
  dailyCount: { type: Number, default: 0, min: 0 },
  monthlyCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

downloadQuotaSchema.index({ user: 1, dayKey: 1 }, { unique: true });

export default mongoose.model('DownloadQuota', downloadQuotaSchema);
