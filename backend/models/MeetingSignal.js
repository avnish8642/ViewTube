import mongoose from 'mongoose';

const meetingSignalSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingRoom', required: true, index: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['offer', 'answer', 'candidate'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

meetingSignalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });
meetingSignalSchema.index({ room: 1, to: 1, createdAt: 1 });

export default mongoose.model('MeetingSignal', meetingSignalSchema);
