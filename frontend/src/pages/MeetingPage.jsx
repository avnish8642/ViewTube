import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  Check,
  Copy,
  DoorOpen,
  FileUp,
  Hand,
  Lock,
  LockKeyholeOpen,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  Shield,
  Users,
  Video,
  X,
} from 'lucide-react';
import { meetingService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDuration } from '../utils/formatters';

const getPeerConfig = () => {
  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (import.meta.env.VITE_TURN_URL) {
    iceServers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }
  return { iceServers };
};

const VideoTile = ({ participant, stream, muted, quality, local }) => {
  const videoRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  useEffect(() => {
    if (!stream?.getAudioTracks().length) {
      setSpeaking(false);
      return undefined;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    const source = context.createMediaStreamSource(stream);
    const samples = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let energy = 0;
      for (const sample of samples) energy += (sample - 128) ** 2;
      setSpeaking(Math.sqrt(energy / samples.length) > 5);
    }, 300);
    return () => {
      window.clearInterval(timer);
      source.disconnect();
      context.close().catch(() => {});
    };
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled);
  return (
    <div className={`relative aspect-video min-h-40 overflow-hidden rounded-2xl border bg-[#151515] ${speaking ? 'border-green-400 ring-2 ring-green-400/50' : 'border-white/10'}`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={local} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full min-h-40 items-center justify-center">
          {participant.cameraOn ? <Camera className="h-8 w-8 text-gray-500" /> : <CameraOff className="h-8 w-8 text-gray-500" />}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent px-3 pb-3 pt-8">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
          <span className="truncate">{participant.username}{local ? ' (you)' : ''}</span>
          {participant.handRaised && <Hand className="h-4 w-4 shrink-0 text-amber-300" />}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-200">
          {muted ? <MicOff className="h-3.5 w-3.5 text-red-300" /> : <Mic className="h-3.5 w-3.5 text-green-300" />}
          {!local && <span>{quality || 'Connecting'}</span>}
        </div>
      </div>
      {participant.role !== 'participant' && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">{participant.role}</span>}
    </div>
  );
};

const MeetingPage = () => {
  const { roomId: routeRoomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const localStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const recorderRef = useRef(null);
  const offeredPeersRef = useRef(new Set());
  const candidateQueueRef = useRef(new Map());
  const bitrateModeRef = useRef(new Map());
  const lastSignalIdRef = useRef('');
  const joinStartedRef = useRef(null);
  const mediaAttemptRef = useRef(false);

  const [roomIdInput, setRoomIdInput] = useState(routeRoomId || '');
  const [title, setTitle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState(routeRoomId || '');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [quality, setQuality] = useState({});
  const [chatText, setChatText] = useState('');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const ownParticipant = room?.participants?.find((person) => String(person.user) === String(user?._id));
  const isHost = String(room?.host) === String(user?._id);
  const isModerator = isHost || ownParticipant?.role === 'co-host';
  const shareStream = displayStreamRef.current || localStream;

  const loadRoom = useCallback(async (id = roomId) => {
    const response = await meetingService.getRoom(id);
    setRoom(response.data.room);
    setMessages(response.data.messages || []);
    return response.data.room;
  }, [roomId]);

  const startMedia = useCallback(async (facingMode = cameraFacing, deviceId = '') => {
    mediaAttemptRef.current = true;
    setMediaError('');
    setMediaReady(false);
    try {
      const videoConstraint = deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: videoConstraint,
      });
      const previous = localStreamRef.current;
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicEnabled(true);
      setCameraEnabled(true);
      for (const [peerId, connection] of peerConnectionsRef.current.entries()) {
        let addedTrack = false;
        for (const track of stream.getTracks()) {
          const sender = connection.getSenders().find((item) => item.track?.kind === track.kind);
          if (sender) await sender.replaceTrack(track);
          else {
            connection.addTrack(track, stream);
            addedTrack = true;
          }
        }
        if (addedTrack && connection.signalingState === 'stable') {
          offeredPeersRef.current.delete(peerId);
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          await meetingService.sendSignal(roomId, { to: peerId, type: 'offer', payload: connection.localDescription });
        }
      }
      if (previous) previous.getTracks().forEach((track) => track.stop());
      setMediaReady(true);
      const inputDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(inputDevices.filter((device) => device.kind === 'videoinput'));
      const camera = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (camera) setSelectedCamera(camera);
      const currentRoomId = roomId;
      if (currentRoomId) {
        await meetingService.updateStatus(currentRoomId, { muted: false, cameraOn: true });
        setRoom((current) => current ? {
          ...current,
          participants: current.participants.map((person) => String(person.user) === String(user?._id) ? { ...person, muted: false, cameraOn: true } : person),
        } : current);
      }
      return stream;
    } catch (mediaRequestError) {
      setMediaReady(true);
      setMediaError(mediaRequestError.name === 'NotAllowedError'
        ? 'Camera/microphone access was denied. Allow access in your browser settings and retry, or continue listening without media.'
        : mediaRequestError.message || 'Could not access camera and microphone.');
      return null;
    }
  }, [cameraFacing, roomId, user?._id]);

  const cleanupPeers = useCallback(() => {
    for (const connection of peerConnectionsRef.current.values()) connection.close();
    peerConnectionsRef.current.clear();
    offeredPeersRef.current.clear();
    candidateQueueRef.current.clear();
    setRemoteStreams({});
  }, []);

  const createPeerConnection = useCallback((peerId) => {
    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) return existing;
    const connection = new RTCPeerConnection(getPeerConfig());
    for (const track of localStreamRef.current?.getTracks() || []) connection.addTrack(track, localStreamRef.current);
    connection.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((current) => ({ ...current, [peerId]: stream }));
    };
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        meetingService.sendSignal(roomId, { to: peerId, type: 'candidate', payload: event.candidate.toJSON() })
          .catch((signalError) => console.warn('Could not send connection candidate:', signalError.message));
      }
    };
    connection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(connection.connectionState)) {
        setRemoteStreams((current) => {
          const next = { ...current };
          delete next[peerId];
          return next;
        });
        if (connection.connectionState === 'failed' && String(user?._id) < peerId) {
          try {
            connection.restartIce();
            connection.createOffer({ iceRestart: true }).then(async (offer) => {
              await connection.setLocalDescription(offer);
              await meetingService.sendSignal(roomId, { to: peerId, type: 'offer', payload: connection.localDescription });
            }).catch((error) => console.warn('ICE restart failed:', error.message));
          } catch (error) {
            console.warn('Could not restart the peer connection:', error.message);
          }
        }
      }
    };
    peerConnectionsRef.current.set(peerId, connection);
    return connection;
  }, [roomId, user?._id]);

  const sendOffer = useCallback(async (peerId) => {
    if (offeredPeersRef.current.has(peerId)) return;
    const connection = createPeerConnection(peerId);
    try {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await meetingService.sendSignal(roomId, { to: peerId, type: 'offer', payload: connection.localDescription });
      offeredPeersRef.current.add(peerId);
    } catch (signalError) {
      console.error('Could not establish a peer connection:', signalError);
      setMediaError('A peer connection could not be created. Check your network or configure TURN for restrictive networks.');
    }
  }, [createPeerConnection, roomId]);

  const enterRoom = async (id, password) => {
    setLoading(true);
    setError('');
    try {
      await meetingService.join(id, password);
      setRoomId(id);
      setRoomIdInput(id);
      setJoined(true);
      joinStartedRef.current = Date.now();
      navigate(`/meeting/${id}`, { replace: true });
    } catch (joinError) {
      setError(joinError.response?.data?.message || 'Unable to join the room.');
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await meetingService.create({ title, password: passcode });
      const id = response.data.room.roomId;
      setRoomId(id);
      setRoom(response.data.room);
      setJoined(true);
      joinStartedRef.current = Date.now();
      navigate(`/meeting/${id}`, { replace: true });
    } catch (createError) {
      setError(createError.response?.data?.message || 'Unable to create the room.');
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meeting/${roomId}`);
      addToast('Meeting link copied.', 'success');
    } catch {
      addToast('Could not copy the meeting link.', 'error');
    }
  };

  const patchRoom = async (body) => {
    try {
      const response = await meetingService.updateRoom(roomId, body);
      if (!response.data.ended) setRoom(response.data.room);
      return response.data;
    } catch (patchError) {
      addToast(patchError.response?.data?.message || 'Unable to update the meeting.', 'error');
      return null;
    }
  };

  const updateStatus = async (change) => {
    try {
      await meetingService.updateStatus(roomId, change);
      setRoom((current) => current ? {
        ...current,
        participants: current.participants.map((person) => String(person.user) === String(user?._id) ? { ...person, ...change } : person),
      } : current);
    } catch (statusError) {
      addToast(statusError.response?.data?.message || 'Unable to update your meeting status.', 'error');
    }
  };

  const toggleMic = () => {
    if (ownParticipant?.moderatedMute) {
      addToast('The host has muted your microphone.', 'info');
      return;
    }
    const next = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
    setMicEnabled(next);
    updateStatus({ muted: !next });
  };

  const toggleCamera = () => {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraEnabled(next);
    updateStatus({ cameraOn: next });
  };

  const switchCamera = async (deviceId = '') => {
    if (!localStreamRef.current) return startMedia(cameraFacing, deviceId);
    try {
      const nextFacing = deviceId ? cameraFacing : cameraFacing === 'user' ? 'environment' : 'user';
      const video = deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
      const newTrack = stream.getVideoTracks()[0];
      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      for (const connection of peerConnectionsRef.current.values()) {
        const sender = connection.getSenders().find((item) => item.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newTrack);
      }
      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStreamRef.current.addTrack(newTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      displayStreamRef.current = null;
      setIsSharingScreen(false);
      setCameraFacing(nextFacing);
      if (deviceId) setSelectedCamera(deviceId);
    } catch (switchError) {
      addToast(switchError.message || 'Could not switch camera.', 'error');
    }
  };

  const toggleScreenShare = async () => {
    if (!room?.permissions?.screenShare) {
      addToast('Screen sharing is disabled by the host.', 'error');
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      addToast('Screen sharing is not supported by this browser.', 'error');
      return;
    }
    if (isSharingScreen) {
      displayStreamRef.current?.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      for (const connection of peerConnectionsRef.current.values()) {
        const sender = connection.getSenders().find((item) => item.track?.kind === 'video');
        if (sender) await sender.replaceTrack(cameraTrack);
      }
      setIsSharingScreen(false);
      setLocalStream((current) => current ? new MediaStream(current.getTracks()) : null);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      displayStreamRef.current = display;
      const screenTrack = display.getVideoTracks()[0];
      for (const connection of peerConnectionsRef.current.values()) {
        const sender = connection.getSenders().find((item) => item.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
      }
      screenTrack.onended = () => toggleScreenShare();
      setIsSharingScreen(true);
      setLocalStream((current) => current ? new MediaStream([...current.getAudioTracks(), screenTrack]) : display);
    } catch (shareError) {
      if (shareError.name !== 'NotAllowedError') addToast(shareError.message || 'Could not share the screen.', 'error');
    }
  };

  const sendChat = async (event) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    try {
      await meetingService.sendMessage(roomId, { text: chatText.trim() });
      setChatText('');
      await loadRoom();
    } catch (chatError) {
      addToast(chatError.response?.data?.message || 'Could not send the message.', 'error');
    }
  };

  const shareFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Meeting files are limited to 5 MB.', 'error');
      return;
    }
    try {
      const uploaded = await meetingService.uploadFile(roomId, file);
      await meetingService.sendMessage(roomId, { attachmentId: uploaded.data.attachment._id });
      await loadRoom();
    } catch (uploadError) {
      addToast(uploadError.response?.data?.message || 'Could not share this file.', 'error');
    }
  };

  const downloadAttachment = async (attachment) => {
    try {
      const response = await meetingService.downloadFile(roomId, attachment.id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name || 'meeting-file';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      addToast(downloadError.response?.data?.message || 'Could not download the shared file.', 'error');
    }
  };

  const toggleRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
      return;
    }
    const supported = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((type) => window.MediaRecorder?.isTypeSupported(type));
    if (!supported || !localStreamRef.current) {
      addToast('Local recording is unavailable until media access is enabled.', 'error');
      return;
    }
    const recorder = new MediaRecorder(localStreamRef.current, { mimeType: supported });
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      setIsRecording(false);
      recorderRef.current = null;
      if (!chunks.length) return;
      const url = URL.createObjectURL(new Blob(chunks, { type: supported }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `vidsphere-${roomId}-local-recording.webm`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
    addToast('Recording your local camera and microphone in this browser only.', 'info');
  };

  const finishMeeting = async (end) => {
    cleanupPeers();
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setJoined(false);
    if (end && isHost) await patchRoom({ end: true });
    else await meetingService.leave(roomId).catch(() => {});
    navigate('/meetings');
  };

  useEffect(() => {
    if (!routeRoomId) return;
    setRoomId(routeRoomId);
    meetingService.getRoom(routeRoomId)
      .then((response) => {
        setRoom(response.data.room);
        setMessages(response.data.messages || []);
        setJoined(true);
        joinStartedRef.current = Date.now();
      })
      .catch((loadError) => {
        if (loadError.response?.status !== 403) setError(loadError.response?.data?.message || 'Enter the room passcode to join.');
      });
  }, [routeRoomId]);

  useEffect(() => {
    if (!joined || !roomId) return undefined;
    let active = true;
    const interval = window.setInterval(() => {
      meetingService.getRoom(roomId).then((response) => {
        if (!active) return;
        setRoom(response.data.room);
        setMessages(response.data.messages || []);
        const stillPresent = response.data.room.participants.some((person) => String(person.user) === String(user?._id));
        if (!stillPresent) {
          setJoined(false);
          setError('You were removed from this meeting.');
        }
      }).catch((pollError) => {
        if (active && pollError.response?.status === 404) {
          setJoined(false);
          setError('The meeting has ended.');
        }
      });
    }, 1800);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [joined, roomId, user?._id]);

  useEffect(() => {
    if (!joined || !room) return;
    if (!localStreamRef.current && !mediaAttemptRef.current) startMedia();
  }, [joined, room, startMedia]);

  useEffect(() => {
    if (!joined || !roomId || !mediaReady) return undefined;
    let active = true;
    const poll = async () => {
      try {
        const response = await meetingService.pollSignals(roomId, lastSignalIdRef.current);
        for (const signal of response.data.signals || []) {
          if (!active) break;
          lastSignalIdRef.current = signal._id;
          const peerId = String(signal.from);
          const connection = createPeerConnection(peerId);
          if (signal.type === 'offer') {
            await connection.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const pending = candidateQueueRef.current.get(peerId) || [];
            for (const candidate of pending) await connection.addIceCandidate(candidate);
            candidateQueueRef.current.delete(peerId);
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            await meetingService.sendSignal(roomId, { to: peerId, type: 'answer', payload: connection.localDescription });
          } else if (signal.type === 'answer' && connection.signalingState === 'have-local-offer') {
            await connection.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const pending = candidateQueueRef.current.get(peerId) || [];
            for (const candidate of pending) await connection.addIceCandidate(candidate);
            candidateQueueRef.current.delete(peerId);
          } else if (signal.type === 'candidate') {
            const candidate = new RTCIceCandidate(signal.payload);
            if (connection.remoteDescription) await connection.addIceCandidate(candidate);
            else candidateQueueRef.current.set(peerId, [...(candidateQueueRef.current.get(peerId) || []), candidate]);
          }
        }
      } catch (signalError) {
        if (active) console.warn('WebRTC signaling poll failed:', signalError.response?.data?.message || signalError.message);
      }
    };
    const timer = window.setInterval(poll, 600);
    poll();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [createPeerConnection, joined, mediaReady, roomId]);

  useEffect(() => {
    if (!joined || !room || !mediaReady || !user?._id) return;
    room.participants.forEach((participant) => {
      const peerId = String(participant.user);
      if (peerId === String(user._id)) return;
      if (String(user._id) < peerId && !peerConnectionsRef.current.has(peerId)) sendOffer(peerId);
    });
  }, [joined, mediaReady, room, sendOffer, user?._id]);

  useEffect(() => {
    if (ownParticipant?.moderatedMute) {
      localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false; });
      setMicEnabled(false);
    }
  }, [ownParticipant?.moderatedMute]);

  useEffect(() => {
    if (!joined) return undefined;
    const timer = window.setInterval(() => setCallSeconds(Math.floor((Date.now() - (joinStartedRef.current || Date.now())) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [joined]);

  useEffect(() => {
    if (!joined) return undefined;
    let active = true;
    const timer = window.setInterval(async () => {
      const nextQuality = {};
      for (const [peerId, connection] of peerConnectionsRef.current.entries()) {
        try {
          const stats = await connection.getStats();
          const candidate = [...stats.values()].find((item) => item.type === 'candidate-pair' && item.state === 'succeeded' && item.currentRoundTripTime);
          const weak = candidate?.currentRoundTripTime > 0.6;
          nextQuality[peerId] = weak ? 'Weak' : candidate ? 'Good' : 'Connecting';
          if (candidate && bitrateModeRef.current.get(peerId) !== Boolean(weak)) {
            for (const sender of connection.getSenders().filter((item) => item.track?.kind === 'video')) {
              const parameters = sender.getParameters();
              if (!parameters.encodings?.length) parameters.encodings = [{}];
              parameters.encodings[0].maxBitrate = weak ? 400000 : 1800000;
              parameters.encodings[0].scaleResolutionDownBy = weak ? 2 : 1;
              await sender.setParameters(parameters);
            }
            bitrateModeRef.current.set(peerId, Boolean(weak));
          }
        } catch {
          nextQuality[peerId] = 'Unknown';
        }
      }
      if (active) setQuality(nextQuality);
    }, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [joined]);

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    cleanupPeers();
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, [cleanupPeers]);

  useEffect(() => {
    if (joined) return;
    cleanupPeers();
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    displayStreamRef.current = null;
    localStreamRef.current = null;
    setLocalStream(null);
    setIsSharingScreen(false);
    setMediaReady(false);
  }, [cleanupPeers, joined]);

  const remoteTiles = useMemo(() => (room?.participants || [])
    .filter((participant) => String(participant.user) !== String(user?._id))
    .map((participant) => ({ participant, stream: remoteStreams[String(participant.user)] })), [remoteStreams, room?.participants, user?._id]);

  const hostModerate = async (targetId, action, value) => {
    try {
      const response = await meetingService.updateParticipant(roomId, targetId, { action, value });
      setRoom(response.data.room);
    } catch (moderationError) {
      addToast(moderationError.response?.data?.message || 'Unable to moderate this participant.', 'error');
    }
  };

  if (!roomId || !joined) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-500"><Video className="h-6 w-6" /></div>
          <div><h1 className="text-2xl font-black text-gray-900 dark:text-white">MeetFlow video rooms</h1><p className="text-sm text-gray-500 dark:text-gray-400">WebRTC mesh calls for up to 6 participants. HTTPS/localhost and camera permissions are required.</p></div>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
        <div className="grid gap-5 md:grid-cols-2">
          <form onSubmit={createRoom} className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-[#282828] dark:bg-[#181818]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create a meeting</h2>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Meeting name" className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700" />
            <input value={passcode} onChange={(event) => setPasscode(event.target.value)} minLength={passcode ? 6 : undefined} placeholder="Optional passcode (min. 6 characters)" type="password" className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700" />
            <button disabled={loading} className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Creating…' : 'Create room'}</button>
          </form>
          <form onSubmit={(event) => { event.preventDefault(); enterRoom(roomIdInput.trim(), passcode); }} className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-[#282828] dark:bg-[#181818]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Join by room ID</h2>
            <input value={roomIdInput} onChange={(event) => setRoomIdInput(event.target.value)} required placeholder="Meeting room ID" className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700" />
            <input value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Room passcode if required" type="password" className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700" />
            <button disabled={loading} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50">{loading ? 'Joining…' : 'Join room'}</button>
          </form>
        </div>
        {routeRoomId && (
          <form onSubmit={(event) => { event.preventDefault(); enterRoom(routeRoomId, passcode); }} className="mt-5 rounded-3xl border border-brand-500/30 bg-brand-500/5 p-5">
            <h2 className="font-bold text-gray-900 dark:text-white">Join the invited meeting</h2>
            <p className="mt-1 text-xs text-gray-500">Room ID: {routeRoomId}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Passcode (if required)" type="password" className="min-w-52 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#181818]" />
              <button disabled={loading} className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white">Join securely</button>
            </div>
          </form>
        )}
        <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-xs leading-5 text-gray-600 dark:bg-[#161616] dark:text-gray-400">
          <strong>Network notes:</strong> WebRTC encrypts media in transit between browsers. For users behind restrictive NAT/firewalls configure TURN with VITE_TURN_URL, VITE_TURN_USERNAME, and VITE_TURN_CREDENTIAL. Use HTTPS outside localhost. Browser echo cancellation/noise suppression are requested when available.
        </div>
      </div>
    );
  }

  const selfTile = ownParticipant ? { participant: ownParticipant, stream: shareStream } : null;
  const allTiles = [...(selfTile ? [selfTile] : []), ...remoteTiles];
  const gridClass = allTiles.length < 2 ? 'grid-cols-1' : allTiles.length < 5 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#080808] p-3 text-white sm:p-5">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-xl">{room?.title || 'VidSphere meeting'}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400"><span>{roomId}</span><span>·</span><span>{formatDuration(callSeconds)}</span><span>·</span><span>{room?.participants?.length}/{room?.maxParticipants} participants</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyInvite} className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10"><Copy className="h-4 w-4" />Invite link</button>
            {isHost && <button onClick={() => patchRoom({ locked: !room.locked })} title={room.locked ? 'Unlock room' : 'Lock room'} className="rounded-xl border border-white/15 p-2 hover:bg-white/10">{room.locked ? <Lock className="h-4 w-4" /> : <LockKeyholeOpen className="h-4 w-4" />}</button>}
          </div>
        </header>

        {mediaError && <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-100"><span>{mediaError}</span><button onClick={() => startMedia()} className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-black">Retry media</button></div>}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className={`grid gap-3 ${gridClass}`}>
              {selfTile && <VideoTile key="self" participant={{ ...selfTile.participant, cameraOn: isSharingScreen || cameraEnabled }} stream={shareStream} muted={!micEnabled || ownParticipant?.moderatedMute} local quality="You" />}
              {remoteTiles.map(({ participant, stream }) => <VideoTile key={String(participant.user)} participant={participant} stream={stream} muted={participant.muted || participant.moderatedMute} quality={quality[String(participant.user)]} />)}
            </div>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121212] p-3">
              <button onClick={toggleMic} aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'} className={`rounded-xl p-3 ${micEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600 hover:bg-red-500'}`}>{micEnabled && !ownParticipant?.moderatedMute ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button>
              <button onClick={toggleCamera} aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'} className={`rounded-xl p-3 ${cameraEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600 hover:bg-red-500'}`}>{cameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}</button>
              <button onClick={() => switchCamera()} title="Switch front/rear camera" className="rounded-xl bg-white/10 p-3 hover:bg-white/20"><Video className="h-5 w-5" /></button>
              {devices.length > 1 && <select aria-label="Camera device" value={selectedCamera} onChange={(event) => switchCamera(event.target.value)} className="max-w-36 rounded-xl border border-white/10 bg-[#222] px-2 py-3 text-xs">{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select>}
              <button onClick={toggleScreenShare} disabled={!room?.permissions?.screenShare} className={`rounded-xl p-3 ${isSharingScreen ? 'bg-brand-500' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-30`} title="Share screen"><MonitorUp className="h-5 w-5" /></button>
              <button onClick={() => updateStatus({ handRaised: !ownParticipant?.handRaised })} disabled={!room?.permissions?.raiseHand} className={`rounded-xl p-3 ${ownParticipant?.handRaised ? 'bg-amber-500 text-black' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-30`} title="Raise/lower hand"><Hand className="h-5 w-5" /></button>
              {isHost && <button onClick={toggleRecording} className={`rounded-xl p-3 text-xs font-bold ${isRecording ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`} title="Local tracks only">{isRecording ? 'Stop REC' : 'REC'}</button>}
              <button onClick={() => finishMeeting(isHost)} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold hover:bg-red-500"><Phone className="h-5 w-5 rotate-[135deg]" />{isHost ? 'End meeting' : 'Leave'}</button>
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-500">WebRTC mesh call · DTLS-SRTP media transport · up to 6 participants. Recording is local-only and records your own tracks.</p>
          </section>

          <aside className="flex max-h-[75vh] min-h-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <div className="flex gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />People ({room?.participants?.length || 0})</span>
                <span className="flex items-center gap-1 text-gray-400"><MessageSquare className="h-4 w-4" />Chat</span>
              </div>
              {isModerator && <Shield className="h-4 w-4 text-brand-400" />}
            </div>
            {isHost && (
              <div className="border-b border-white/10 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Host permissions</p>
                {[
                  ['chat', 'Allow chat'],
                  ['screenShare', 'Allow screen sharing'],
                  ['raiseHand', 'Allow raise hand'],
                ].map(([key, label]) => <label key={key} className="flex items-center justify-between py-1 text-xs text-gray-300"><span>{label}</span><input type="checkbox" checked={Boolean(room?.permissions?.[key])} onChange={(event) => patchRoom({ permissions: { [key]: event.target.checked } })} className="accent-brand-500" /></label>)}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto border-b border-white/10 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Participants</p>
              <div className="space-y-2">
                {(room?.participants || []).map((participant) => {
                  const targetId = String(participant.user);
                  const canManage = isModerator && targetId !== String(user?._id) && targetId !== String(room?.host);
                  return <div key={targetId} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0"><span className="block truncate font-semibold">{participant.username} {participant.isSelf ? '(you)' : ''}</span><span className="text-[10px] text-gray-500">{participant.role}{participant.handRaised ? ' · hand raised' : ''}</span></div>
                    <div className="flex shrink-0 items-center gap-1 text-gray-400">
                      {participant.muted || participant.moderatedMute ? <MicOff className="h-3.5 w-3.5 text-red-300" /> : <Mic className="h-3.5 w-3.5 text-green-300" />}
                      {canManage && <>
                        <button onClick={() => hostModerate(targetId, 'mute', !participant.moderatedMute)} title="Mute/unmute"><MicOff className="h-3.5 w-3.5" /></button>
                        <button onClick={() => hostModerate(targetId, 'cohost', participant.role !== 'co-host')} title="Assign/remove co-host"><Shield className="h-3.5 w-3.5" /></button>
                        <button onClick={() => hostModerate(targetId, 'remove')} title="Remove participant"><X className="h-3.5 w-3.5 text-red-400" /></button>
                      </>}
                    </div>
                  </div>;
                })}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
              {messages.map((message) => <div key={message._id} className="text-xs">
                <div className="font-semibold text-gray-400">{message.username}</div>
                {message.text && <p className="mt-0.5 whitespace-pre-wrap break-words text-gray-200">{message.text}</p>}
                {message.attachment?.id && <button onClick={() => downloadAttachment(message.attachment)} className="mt-1 flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-brand-300 hover:bg-white/15">{message.attachment.name} · {(message.attachment.size / 1024).toFixed(0)} KB</button>}
              </div>)}
            </div>
            {room?.permissions?.chat && <form onSubmit={sendChat} className="flex items-center gap-2 border-t border-white/10 p-3">
              <input value={chatText} onChange={(event) => setChatText(event.target.value)} maxLength={1000} placeholder="Message the meeting" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1c1c1c] px-3 py-2 text-xs outline-none focus:border-brand-500" />
              <label className="cursor-pointer rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white" title="Share a file up to 5 MB"><FileUp className="h-4 w-4" /><input type="file" onChange={shareFile} className="hidden" /></label>
              <button className="rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold">Send</button>
            </form>}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;
