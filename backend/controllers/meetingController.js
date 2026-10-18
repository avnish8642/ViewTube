import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import MeetingAttachment from '../models/MeetingAttachment.js';
import MeetingMessage from '../models/MeetingMessage.js';
import MeetingRoom from '../models/MeetingRoom.js';
import MeetingSignal from '../models/MeetingSignal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const attachmentDir = path.resolve(__dirname, '../storage/meeting-files');

const memberIndex = (room, userId) => room.participants.findIndex((person) => String(person.user) === String(userId));
const isHost = (room, userId) => String(room.host) === String(userId);

const getActiveRoom = async (roomId, res) => {
  const room = await MeetingRoom.findOne({ roomId, endedAt: null });
  if (!room) {
    res.status(404).json({ success: false, message: 'Meeting room was not found or has ended.' });
    return null;
  }
  return room;
};

const requireMember = (room, userId, res) => {
  if (memberIndex(room, userId) < 0) {
    res.status(403).json({ success: false, message: 'Join this meeting before accessing its content.' });
    return false;
  }
  return true;
};

const sanitizeRoom = (room, currentUserId) => {
  const data = room.toObject();
  delete data.passwordHash;
  data.participants = data.participants.map((participant) => ({
    ...participant.toObject(),
    isSelf: String(participant.user) === String(currentUserId),
  }));
  return data;
};

export const createMeeting = async (req, res, next) => {
  try {
    const title = String(req.body.title || 'VidSphere meeting').trim().slice(0, 100);
    const password = String(req.body.password || '');
    if (password && password.length < 6) return res.status(400).json({ success: false, message: 'Room passcodes must contain at least 6 characters.' });
    const roomId = crypto.randomBytes(12).toString('base64url');
    const room = await MeetingRoom.create({
      roomId,
      title: title || 'VidSphere meeting',
      host: req.user._id,
      passwordHash: password ? await bcrypt.hash(password, 10) : '',
      participants: [{ user: req.user._id, username: req.user.username, role: 'host' }],
    });
    res.status(201).json({ success: true, room: sanitizeRoom(room, req.user._id) });
  } catch (error) {
    next(error);
  }
};

export const joinMeeting = async (req, res, next) => {
  try {
    const room = await MeetingRoom.findOne({ roomId: req.params.roomId, endedAt: null });
    if (!room) return res.status(404).json({ success: false, message: 'Meeting room was not found or has ended.' });
    const existingIndex = memberIndex(room, req.user._id);
    if (existingIndex >= 0) {
      room.participants[existingIndex].lastSeenAt = new Date();
      await room.save();
      return res.status(200).json({ success: true, room: sanitizeRoom(room, req.user._id) });
    }
    if (room.locked) return res.status(423).json({ success: false, message: 'This meeting is locked.' });
    if (room.passwordHash && !await bcrypt.compare(String(req.body.password || ''), room.passwordHash)) {
      return res.status(403).json({ success: false, message: 'The room passcode is incorrect.' });
    }
    room.participants = room.participants.filter((participant) =>
      String(participant.user) === String(room.host) || Date.now() - participant.lastSeenAt.getTime() < 60000
    );
    if (room.participants.length >= room.maxParticipants) return res.status(409).json({ success: false, message: 'This room has reached its participant limit.' });
    room.participants.push({ user: req.user._id, username: req.user.username, role: 'participant' });
    await room.save();
    res.status(200).json({ success: true, room: sanitizeRoom(room, req.user._id) });
  } catch (error) {
    next(error);
  }
};

export const getMeeting = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    const index = memberIndex(room, req.user._id);
    room.participants[index].lastSeenAt = new Date();
    room.participants = room.participants.filter((participant) =>
      String(participant.user) === String(room.host) || String(participant.user) === String(req.user._id) || Date.now() - participant.lastSeenAt.getTime() < 60000
    );
    await room.save();
    const messages = room.permissions.chat
      ? (await MeetingMessage.find({ room: room._id }).sort({ createdAt: -1 }).limit(100).lean()).reverse()
      : [];
    res.status(200).json({ success: true, room: sanitizeRoom(room, req.user._id), messages });
  } catch (error) {
    next(error);
  }
};

export const leaveMeeting = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    if (isHost(room, req.user._id)) return res.status(400).json({ success: false, message: 'The host must end the meeting, not leave it.' });
    room.participants = room.participants.filter((participant) => String(participant.user) !== String(req.user._id));
    await room.save();
    await MeetingSignal.deleteMany({ room: room._id, $or: [{ from: req.user._id }, { to: req.user._id }] });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const updateMeeting = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    if (!isHost(room, req.user._id)) return res.status(403).json({ success: false, message: 'Only the host can change meeting settings.' });
    const { locked, permissions, end, title } = req.body;
    if (typeof locked === 'boolean') room.locked = locked;
    if (title !== undefined) room.title = String(title).trim().slice(0, 100);
    if (permissions && typeof permissions === 'object') {
      for (const key of ['chat', 'screenShare', 'raiseHand']) {
        if (typeof permissions[key] === 'boolean') room.permissions[key] = permissions[key];
      }
    }
    if (end === true) {
      room.endedAt = new Date();
      await room.save();
      return res.status(200).json({ success: true, ended: true });
    }
    await room.save();
    res.status(200).json({ success: true, room: sanitizeRoom(room, req.user._id) });
  } catch (error) {
    next(error);
  }
};

export const moderateParticipant = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    const moderator = room.participants.find((participant) => String(participant.user) === String(req.user._id));
    if (!moderator || !['host', 'co-host'].includes(moderator.role)) return res.status(403).json({ success: false, message: 'Only the host or a co-host can moderate participants.' });
    const targetIndex = memberIndex(room, req.params.userId);
    if (targetIndex < 0) return res.status(404).json({ success: false, message: 'Participant is no longer in the room.' });
    const participant = room.participants[targetIndex];
    const { action, value } = req.body;
    if (String(participant.user) === String(room.host)) return res.status(400).json({ success: false, message: 'The host cannot moderate themselves.' });
    if (action === 'remove') {
      room.participants.splice(targetIndex, 1);
      await MeetingSignal.deleteMany({ room: room._id, $or: [{ from: participant.user }, { to: participant.user }] });
    } else if (action === 'mute') {
      participant.moderatedMute = value !== false;
    } else if (action === 'cohost') {
      participant.role = value === false ? 'participant' : 'co-host';
    } else {
      return res.status(400).json({ success: false, message: 'Unknown moderation action.' });
    }
    await room.save();
    res.status(200).json({ success: true, room: sanitizeRoom(room, req.user._id) });
  } catch (error) {
    next(error);
  }
};

export const updateOwnStatus = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    const index = memberIndex(room, req.user._id);
    for (const key of ['muted', 'cameraOn', 'handRaised']) {
      if (typeof req.body[key] === 'boolean') room.participants[index][key] = req.body[key];
    }
    if (room.participants[index].moderatedMute) room.participants[index].muted = true;
    await room.save();
    res.status(200).json({ success: true, participant: room.participants[index] });
  } catch (error) {
    next(error);
  }
};

export const sendMeetingSignal = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    const { to, type, payload } = req.body;
    if (memberIndex(room, to) < 0 || String(to) === String(req.user._id)) return res.status(400).json({ success: false, message: 'Signal recipient is not another current participant.' });
    if (!['offer', 'answer', 'candidate'].includes(type) || !payload || Buffer.byteLength(JSON.stringify(payload)) > 32000) {
      return res.status(400).json({ success: false, message: 'Invalid or oversized WebRTC signal.' });
    }
    const signal = await MeetingSignal.create({ room: room._id, from: req.user._id, to, type, payload });
    res.status(201).json({ success: true, signalId: signal._id });
  } catch (error) {
    next(error);
  }
};

export const pollMeetingSignals = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    const query = { room: room._id, to: req.user._id };
    if (req.query.after && /^[a-f\d]{24}$/i.test(String(req.query.after))) query._id = { $gt: req.query.after };
    const signals = await MeetingSignal.find(query).sort({ _id: 1 }).limit(100).lean();
    if (signals.length) await MeetingSignal.deleteMany({ _id: { $in: signals.map((signal) => signal._id) } });
    res.status(200).json({ success: true, signals });
  } catch (error) {
    next(error);
  }
};

export const postMeetingMessage = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    if (!room.permissions.chat) return res.status(403).json({ success: false, message: 'Chat is disabled by the host.' });
    const text = String(req.body.text || '').trim();
    const attachmentId = req.body.attachmentId || null;
    if (!text && !attachmentId) return res.status(400).json({ success: false, message: 'Enter a message or attach a file.' });
    if (text.length > 1000) return res.status(400).json({ success: false, message: 'Meeting messages cannot exceed 1000 characters.' });
    let attachment = { id: null, name: '', size: 0 };
    if (attachmentId) {
      const file = await MeetingAttachment.findOne({ _id: attachmentId, room: room._id });
      if (!file) return res.status(404).json({ success: false, message: 'Meeting attachment not found.' });
      attachment = { id: file._id, name: file.originalName, size: file.size };
    }
    const message = await MeetingMessage.create({
      room: room._id,
      user: req.user._id,
      username: req.user.username,
      text,
      attachment,
    });
    const oldMessages = await MeetingMessage.find({ room: room._id })
      .sort({ createdAt: -1 })
      .skip(200)
      .select('_id')
      .lean();
    if (oldMessages.length) await MeetingMessage.deleteMany({ _id: { $in: oldMessages.map((item) => item._id) } });
    res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

export const uploadMeetingAttachment = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    if (!room.permissions.chat) return res.status(403).json({ success: false, message: 'Chat is disabled by the host.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Choose a file to share.' });
    fs.mkdirSync(attachmentDir, { recursive: true });
    const storedName = crypto.randomBytes(24).toString('hex');
    const originalName = path.basename(req.file.originalname).slice(0, 255);
    const filePath = path.join(attachmentDir, storedName);
    await fs.promises.writeFile(filePath, req.file.buffer, { flag: 'wx' });
    const attachment = await MeetingAttachment.create({
      room: room._id,
      owner: req.user._id,
      originalName,
      storedName,
      mimeType: req.file.mimetype || 'application/octet-stream',
      size: req.file.size,
    });
    res.status(201).json({ success: true, attachment: { _id: attachment._id, name: attachment.originalName, size: attachment.size } });
  } catch (error) {
    next(error);
  }
};

export const downloadMeetingAttachment = async (req, res, next) => {
  try {
    const room = await getActiveRoom(req.params.roomId, res);
    if (!room || !requireMember(room, req.user._id, res)) return;
    const attachment = await MeetingAttachment.findOne({ _id: req.params.attachmentId, room: room._id });
    if (!attachment) return res.status(404).json({ success: false, message: 'Attachment not found.' });
    const filePath = path.resolve(attachmentDir, attachment.storedName);
    if (path.dirname(filePath) !== attachmentDir || !fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Attachment file is unavailable.' });
    return res.download(filePath, attachment.originalName);
  } catch (error) {
    next(error);
  }
};
