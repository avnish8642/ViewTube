import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  role: { type: String, enum: ['host', 'co-host', 'participant'], default: 'participant' },
  joinedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  muted: { type: Boolean, default: false },
  moderatedMute: { type: Boolean, default: false },
  cameraOn: { type: Boolean, default: false },
  handRaised: { type: Boolean, default: false },
});

const meetingRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  title: { type: String, trim: true, maxlength: 100, default: 'VidSphere meeting' },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  passwordHash: { type: String, default: '' },
  locked: { type: Boolean, default: false },
  endedAt: { type: Date, default: null },
  maxParticipants: { type: Number, default: 6, min: 2, max: 6 },
  permissions: {
    chat: { type: Boolean, default: true },
    screenShare: { type: Boolean, default: true },
    raiseHand: { type: Boolean, default: true },
  },
  participants: [participantSchema],
}, { timestamps: true });

export default mongoose.model('MeetingRoom', meetingRoomSchema);
