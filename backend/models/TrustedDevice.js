import mongoose from 'mongoose';

const trustedDeviceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  ipAddress: { type: String, required: true },
  userAgentHash: { type: String, required: true },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  label: { type: String, default: 'Trusted device' },
  trustedUntil: { type: Date, required: true },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

trustedDeviceSchema.index({ user: 1, deviceId: 1, ipAddress: 1, userAgentHash: 1 }, { unique: true });
trustedDeviceSchema.index({ trustedUntil: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TrustedDevice', trustedDeviceSchema);
