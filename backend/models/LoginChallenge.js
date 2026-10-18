import mongoose from 'mongoose';

const loginChallengeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  codeHash: { type: String, required: true },
  deviceId: { type: String, required: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  browser: { type: String, default: 'Unknown' },
  browserVersion: { type: String, default: '' },
  operatingSystem: { type: String, default: 'Unknown' },
  deviceType: { type: String, enum: ['Desktop', 'Mobile', 'Tablet'], default: 'Desktop' },
  deviceModel: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  usedAt: { type: Date, default: null },
}, { timestamps: true });

loginChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('LoginChallenge', loginChallengeSchema);
