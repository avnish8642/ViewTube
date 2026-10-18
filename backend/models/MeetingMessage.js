import mongoose from 'mongoose';

const meetingMessageSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingRoom', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  text: { type: String, trim: true, maxlength: 1000, default: '' },
  attachment: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingAttachment', default: null },
    name: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
}, { timestamps: true });

meetingMessageSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model('MeetingMessage', meetingMessageSchema);
