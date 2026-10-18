import mongoose from 'mongoose';

const loginEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ipAddress: { type: String, default: '' },
  browser: { type: String, default: 'Unknown' },
  browserVersion: { type: String, default: '' },
  operatingSystem: { type: String, default: 'Unknown' },
  deviceType: { type: String, enum: ['Desktop', 'Mobile', 'Tablet'], default: 'Desktop' },
  deviceModel: { type: String, default: '' },
  deviceModel: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  success: { type: Boolean, default: false },
  reason: { type: String, default: '' },
}, { timestamps: true });

loginEventSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('LoginEvent', loginEventSchema);
