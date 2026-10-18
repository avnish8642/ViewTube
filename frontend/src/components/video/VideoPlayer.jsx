import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Captions,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Theater,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDuration, resolveMediaUrl } from '../../utils/formatters';
import { historyService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

const VideoPlayer = ({ videoId, videoUrl, poster, title, nextVideo, onNext, onEnded }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const lastSaveRef = useRef(0);
  const { isAuthenticated } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resumeAt, setResumeAt] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(null);
  const [qualityLabel, setQualityLabel] = useState('');

  const finalUrl = resolveMediaUrl(videoUrl);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch (error) {
        console.warn('Video playback could not start:', error.message);
      }
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((delta) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const target = containerRef.current;
    if (!target) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await target.requestFullscreen();
    } catch (error) {
      console.warn('Fullscreen is not available:', error.message);
    }
  }, []);

  const saveProgress = useCallback((time = videoRef.current?.currentTime, length = duration) => {
    if (!videoId || !Number.isFinite(time) || !Number.isFinite(length) || length <= 0) return;
    const progress = { currentTime: time, duration: length };
    localStorage.setItem(`watch-progress:${videoId}`, JSON.stringify(progress));
    if (isAuthenticated && Date.now() - lastSaveRef.current > 9000) {
      lastSaveRef.current = Date.now();
      historyService.saveProgress(videoId, progress).catch((error) => {
        console.warn('Unable to sync playback progress:', error.response?.data?.message || error.message);
      });

      useEffect(() => {
        if (nextCountdown === null) return undefined;
        if (nextCountdown <= 0) {
          onNext?.(nextVideo?._id);
          setNextCountdown(null);
          return undefined;
        }
        const timer = window.setTimeout(() => setNextCountdown((count) => count - 1), 1000);
        return () => window.clearTimeout(timer);
      }, [nextCountdown, nextVideo, onNext]);
    }
  }, [duration, isAuthenticated, videoId]);

  useEffect(() => {
    let active = true;
    const local = localStorage.getItem(`watch-progress:${videoId}`);
    let localProgress = null;
    try {
      localProgress = local ? JSON.parse(local) : null;
    } catch {
      localStorage.removeItem(`watch-progress:${videoId}`);
    }

    if (isAuthenticated && videoId) {
      historyService.getProgress(videoId)
        .then(({ data }) => {
          if (active && data?.progress?.progressSeconds > 0) {
            setResumeAt(data.progress.progressSeconds);
          } else if (active && localProgress?.currentTime > 0) {
            setResumeAt(localProgress.currentTime);
          }
        })
        .catch((error) => {
          console.warn('Unable to load saved playback position:', error.response?.data?.message || error.message);
          if (active && localProgress?.currentTime > 0) setResumeAt(localProgress.currentTime);
        });
    } else if (localProgress?.currentTime > 0) {
      setResumeAt(localProgress.currentTime);
    }
    return () => { active = false; };
  }, [videoId, isAuthenticated]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      const largeSeek = event.shiftKey ? 60 : 10;
      switch (event.key.toLowerCase()) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
          event.preventDefault();
          seek(largeSeek);
          break;
        case 'arrowleft':
          event.preventDefault();
          seek(-largeSeek);
          break;
        case 'arrowup':
          event.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.05);
            setVolume(videoRef.current.volume);
          }
          break;
        case 'arrowdown':
          event.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.05);
            setVolume(videoRef.current.volume);
          }
          break;
        case 'm': toggleMute(); break;
        case 'f': toggleFullscreen(); break;
        case 't': setIsTheater((value) => !value); break;
        case 'c': toggleCaptions(); break;
        case 'p': togglePiP(); break;
        case 'n':
          if (nextVideo && onNext) onNext(nextVideo._id);
          break;
        case '>': cycleSpeed(1); break;
        case '<': cycleSpeed(-1); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const cycleSpeed = (direction) => {
    const index = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(index + direction + SPEEDS.length) % SPEEDS.length];
    setPlaybackRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const toggleCaptions = () => {
    const video = videoRef.current;
    if (!video?.textTracks?.length) return;
    const enabled = !captionsEnabled;
    Array.from(video.textTracks).forEach((track) => { track.mode = enabled ? 'showing' : 'disabled'; });
    setCaptionsEnabled(enabled);
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch (error) {
      console.warn('Picture-in-Picture is not available:', error.message);
    }
  };

  const handleProgress = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
    if (Date.now() - lastSaveRef.current > 10000) saveProgress(video.currentTime, video.duration);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2800);
  };

  useEffect(() => () => {
    window.clearTimeout(controlsTimeoutRef.current);
    window.clearTimeout(saveTimeoutRef.current);
    window.clearTimeout(previewTimeoutRef.current);
    saveProgress();
  }, [saveProgress]);

  const onSeekHover = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setPreviewReady(false);
    window.clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = window.setTimeout(() => {
      setPreview({ time: percent * duration, left: percent * 100 });
    }, 80);
  };

  return (
    <div className={`${isTheater ? 'fixed inset-0 z-40 bg-black p-0 sm:p-6 flex items-center' : 'w-full'} transition-all`}>
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className={`relative w-full ${isTheater ? 'max-w-[1600px] mx-auto aspect-video' : 'aspect-video'} bg-black rounded-2xl overflow-hidden shadow-2xl group select-none flex items-center justify-center outline-none`}
      >
        <video
          ref={videoRef}
          src={finalUrl}
          poster={resolveMediaUrl(poster)}
          onClick={togglePlay}
          onTimeUpdate={handleProgress}
          onProgress={handleProgress}
          onLoadStart={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onWaiting={() => setLoading(true)}
          onPlaying={() => { setLoading(false); setIsPlaying(true); }}
          onPause={() => { setIsPlaying(false); saveProgress(); }}
          onLoadedMetadata={(event) => {
            const media = event.currentTarget;
            setDuration(media.duration);
            setHasCaptions(media.textTracks.length > 0);
            setQualityLabel(media.videoWidth && media.videoHeight ? `${media.videoWidth}×${media.videoHeight}` : 'Auto');
            if (resumeAt && resumeAt < media.duration - 5) {
              media.currentTime = resumeAt;
              setCurrentTime(resumeAt);
              setResumeAt(null);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (videoId) localStorage.removeItem(`watch-progress:${videoId}`);
            if (nextVideo && onNext) setNextCountdown(10);
            else onEnded?.();
          }}
          playsInline
          preload="metadata"
          className="w-full h-full object-contain cursor-pointer"
          aria-label={title || 'Video player'}
        >
          {videoUrl?.captions?.map?.((caption) => (
            <track key={caption.src} kind="subtitles" src={resolveMediaUrl(caption.src)} srcLang={caption.lang} label={caption.label} default={caption.default} />
          ))}
        </video>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-11 w-11 rounded-full border-4 border-white/30 border-t-white animate-spin" aria-label="Buffering" />
          </div>
        )}

        {resumeAt > 0 && (
          <div className="absolute top-3 left-3 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white">
            Resuming at {formatDuration(resumeAt)}
          </div>
        )}

        {!isPlaying && !loading && (
          <button onClick={togglePlay} aria-label="Play video" className="absolute w-16 h-16 sm:w-20 sm:h-20 bg-black/60 hover:bg-brand-600/90 text-white rounded-full flex items-center justify-center backdrop-blur-xs transition transform hover:scale-110 shadow-2xl">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-current" />
          </button>
        )}

        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 sm:px-4 pt-10 pb-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="relative mb-2 group/timeline" onMouseMove={onSeekHover} onMouseLeave={() => setPreview(null)}>
            {preview && duration > 0 && (
              <div className="absolute bottom-6 z-20 -translate-x-1/2 overflow-hidden rounded-lg border border-white/20 bg-black shadow-xl" style={{ left: `${preview.left}%` }}>
                <video
                  key={finalUrl}
                  src={finalUrl}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(event) => { event.currentTarget.currentTime = preview.time; }}
                  onSeeked={() => setPreviewReady(true)}
                  ref={(element) => {
                    if (element && Math.abs(element.currentTime - preview.time) > 0.3 && element.readyState >= 1) {
                      element.currentTime = preview.time;
                    }
                  }}
                  className="h-[72px] w-32 bg-black object-contain sm:h-[90px] sm:w-40"
                />
                <div className="px-2 py-1 text-center text-[10px] text-white">{previewReady ? formatDuration(preview.time) : 'Previewing…'}</div>
              </div>
            )}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-white/25 rounded-full pointer-events-none">
              <div className="h-full bg-white/40 rounded-full" style={{ width: `${duration ? Math.min(100, buffered / duration * 100) : 0}%` }} />
              <div className="absolute inset-y-0 left-0 bg-brand-500 rounded-full" style={{ width: `${duration ? currentTime / duration * 100 : 0}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (videoRef.current) videoRef.current.currentTime = value;
                setCurrentTime(value);
              }}
              aria-label="Video timeline seek"
              className="relative z-10 w-full h-1.5 appearance-none cursor-pointer bg-transparent accent-brand-500 hover:h-2.5 transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-white text-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="p-1 hover:text-brand-400">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button onClick={() => seek(-10)} title="Rewind 10 seconds" aria-label="Rewind 10 seconds" className="p-1 hover:text-brand-400"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={() => seek(10)} title="Forward 10 seconds" aria-label="Forward 10 seconds" className="p-1 hover:text-brand-400"><RotateCw className="w-4 h-4" /></button>
              <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'} className="p-1 hover:text-brand-400">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume} onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                setIsMuted(next === 0);
                if (videoRef.current) { videoRef.current.volume = next; videoRef.current.muted = next === 0; }
              }} aria-label="Volume slider" className="w-14 sm:w-20 h-1 accent-brand-500" />
              <span className="text-[11px] font-mono text-gray-200">
                {formatDuration(currentTime)} / {formatDuration(duration)} <span className="text-gray-400">-{formatDuration(Math.max(0, duration - currentTime))}</span>
              </span>
              <span className="hidden sm:inline text-[10px] text-gray-400">{qualityLabel}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => cycleSpeed(1)} title="Change playback speed (&lt; / &gt;)" className="min-w-10 rounded px-1.5 py-1 text-xs hover:bg-white/15">{playbackRate}×</button>
              <button onClick={toggleCaptions} disabled={!hasCaptions} aria-label="Toggle captions" title="Captions (C)" className={`p-1 disabled:opacity-40 ${captionsEnabled ? 'text-brand-400' : 'hover:text-brand-400'}`}><Captions className="w-5 h-5" /></button>
              <button onClick={togglePiP} aria-label="Picture in Picture" title="Picture-in-Picture (P)" className="p-1 hover:text-brand-400"><PictureInPicture2 className="w-5 h-5" /></button>
              <button onClick={() => setIsTheater((value) => !value)} aria-label="Theater mode" title="Theater mode (T)" className={`p-1 ${isTheater ? 'text-brand-400' : 'hover:text-brand-400'}`}><Theater className="w-5 h-5" /></button>
              <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} className="p-1 hover:text-brand-400">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>

            {nextCountdown !== null && nextVideo && (
              <div className="absolute bottom-20 right-4 z-20 max-w-[min(22rem,calc(100%-2rem))] rounded-xl border border-white/20 bg-black/90 p-3 text-white shadow-xl">
                <p className="text-xs text-gray-300">Up next in {nextCountdown} seconds</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">{nextVideo.title}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setNextCountdown(null)} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs">Cancel</button>
                  <button onClick={() => onNext?.(nextVideo._id)} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold">Play now</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
