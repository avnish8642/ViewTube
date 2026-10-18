import mongoose from 'mongoose';

const meetingAttachmentSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingRoom', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true, maxlength: 255 },
  storedName: { type: String, required: true, unique: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true, max: 5 * 1024 * 1024 },
}, { timestamps: true });

export default mongoose.model('MeetingAttachment', meetingAttachmentSchema);
