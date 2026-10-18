import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Clock,
  Check,
  BookmarkCheck,
  BookmarkPlus,
  Eye,
  Calendar,
  AlertCircle,
  Copy,
  Download,
} from 'lucide-react';
import VideoPlayer from '../components/video/VideoPlayer';
import CommentSection from '../components/video/CommentSection';
import RelatedVideos from '../components/video/RelatedVideos';
import Modal from '../components/common/Modal';
import { videoService, channelService, watchLaterService, membershipService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  formatViews,
  formatSubscribers,
  formatFullDate,
  formatTimeAgo,
  resolveMediaUrl,
} from '../utils/formatters';

const VideoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interaction states
  const [userReaction, setUserReaction] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [nextVideo, setNextVideo] = useState(null);

  const handleRelatedVideos = useCallback((videos) => {
    setNextVideo(videos[0] || null);
  }, []);
  const handleNextVideo = useCallback((nextId) => {
    navigate(`/watch/${nextId}`);
  }, [navigate]);

  // Fetch video details
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setShowFullDesc(false);

    videoService
      .getVideoById(id)
      .then((res) => {
        if (isMounted && res.data?.success) {
          const v = res.data.video;
          setVideo(v);
          setUserReaction(res.data.userReaction);
          setLikesCount(v.likesCount || 0);
          setDislikesCount(v.dislikesCount || 0);
          setIsSubscribed(res.data.isSubscribed || false);
          setSubscribersCount(v.channel?.subscribersCount || 0);
          setIsWatchLater(res.data.isWatchLater || false);

          // Increment view count on mount
          videoService.recordView(id).catch(() => {});
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Video not found');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle Like
  const handleLike = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to like this video', 'error');
      return;
    }
    try {
      const res = await videoService.toggleLike(id);
      if (res.data?.success) {
        setUserReaction(res.data.userReaction);
        setLikesCount(res.data.likesCount);
        setDislikesCount(res.data.dislikesCount);
      }
    } catch (err) {
      addToast('Failed to update reaction', 'error');
    }
  };

  // Handle Dislike
  const handleDislike = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to dislike this video', 'error');
      return;
    }
    try {
      const res = await videoService.toggleDislike(id);
      if (res.data?.success) {
        setUserReaction(res.data.userReaction);
        setLikesCount(res.data.likesCount);
        setDislikesCount(res.data.dislikesCount);
      }
    } catch (err) {
      addToast('Failed to update reaction', 'error');
    }
  };

  // Handle Subscribe
  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to subscribe', 'error');
      return;
    }
    if (!video?.channel?._id) return;

    if (user?.channel?._id === video.channel._id) {
      addToast('You cannot subscribe to your own channel', 'info');
      return;
    }

    try {
      const res = await channelService.toggleSubscribe(video.channel._id);
      if (res.data?.success) {
        setIsSubscribed(res.data.isSubscribed);
        setSubscribersCount(res.data.subscribersCount);
        addToast(
          res.data.isSubscribed ? 'Subscribed to channel' : 'Unsubscribed',
          'info'
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update subscription', 'error');
    }
  };

  // Handle Watch Later
  const handleToggleWatchLater = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to save videos', 'error');
      return;
    }
    try {
      const res = await watchLaterService.toggleWatchLater(id);
      if (res.data?.success) {
        setIsWatchLater(res.data.isWatchLater);
        addToast(res.data.message, 'success');
      }
    } catch (err) {
      addToast('Failed to update Watch Later', 'error');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('Link copied to clipboard!', 'success');
    setShowShareModal(false);
  };

  const handleDownload = async () => {
    if (!isAuthenticated) {
      addToast('Sign in to use your membership download quota.', 'error');
      return;
    }
    setIsDownloading(true);
    try {
      const key = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await membershipService.requestDownload(id, key);
      const file = await membershipService.downloadFile(response.data.download._id);
      const url = URL.createObjectURL(file.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${video.title.replace(/[^\w.-]+/g, '_') || 'video'}.mp4`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast('Download started. Quota usage is shown in Membership.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Download could not be authorized.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-gray-200 dark:bg-[#1a1a1a] rounded-2xl w-full" />
          <div className="h-6 bg-gray-200 dark:bg-[#1a1a1a] rounded-md w-3/4" />
          <div className="h-10 bg-gray-200 dark:bg-[#1a1a1a] rounded-xl w-full" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-36 aspect-video bg-gray-200 dark:bg-[#1a1a1a] rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 dark:bg-[#1a1a1a] rounded w-5/6" />
                <div className="h-3 bg-gray-200 dark:bg-[#1a1a1a] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Video Unavailable
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {error || 'This video may have been removed or is currently private.'}
        </p>
        {error?.toLowerCase().includes('premium') && (
          <Link
            to="/membership"
            className="mb-3 inline-block rounded-xl border border-brand-500/30 px-5 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-400"
          >
            View membership plans
          </Link>
        )}
        <Link
          to="/"
          className="inline-block px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition"
        >
          Back to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player, Video Meta, Comments */}
        <div className="lg:col-span-2">
          {/* Video Player */}
          <VideoPlayer
            key={id}
            videoId={id}
            videoUrl={video.videoUrl}
            poster={video.thumbnailUrl}
            title={video.title}
            nextVideo={nextVideo}
            onNext={handleNextVideo}
          />

          {/* Title */}
          <h1 className="mt-4 text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
            {video.title}
          </h1>

          {/* Channel Bar & Action Buttons */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#222222]">
            {/* Channel Info */}
            <div className="flex items-center gap-3">
              <Link to={`/channel/${video.channel?._id}`}>
                <img
                  src={resolveMediaUrl(video.channel?.avatar)}
                  alt={video.channel?.name}
                  className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />
              </Link>
              <div>
                <Link
                  to={`/channel/${video.channel?._id}`}
                  className="font-bold text-sm sm:text-base text-gray-900 dark:text-white hover:text-brand-500 transition block leading-tight"
                >
                  {video.channel?.name}
                </Link>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatSubscribers(subscribersCount)}
                </span>
              </div>

              {/* Subscribe Button */}
              {user?.channel?._id !== video.channel?._id && (
                <button
                  onClick={handleSubscribe}
                  className={`ml-3 px-4 py-2 rounded-full text-xs font-semibold transition shadow-sm ${
                    isSubscribed
                      ? 'bg-gray-200 dark:bg-[#272727] text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#333]'
                      : 'bg-brand-500 hover:bg-brand-600 text-white'
                  }`}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>

            {/* Interaction Buttons */}
            <div className="flex items-center gap-2">
              {/* Like / Dislike pill button group */}
              <div className="flex items-center rounded-full bg-gray-100 dark:bg-[#222222] border border-gray-200 dark:border-[#2d2d2d] overflow-hidden">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium hover:bg-gray-200 dark:hover:bg-[#2b2b2b] transition border-r border-gray-300 dark:border-[#333] ${
                    userReaction === 'like'
                      ? 'text-brand-500 font-bold bg-brand-500/10'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${userReaction === 'like' ? 'fill-current' : ''}`} />
                  <span>{formatViews(likesCount).replace(' views', '')}</span>
                </button>

                <button
                  onClick={handleDislike}
                  className={`flex items-center px-3 py-2 text-xs font-medium hover:bg-gray-200 dark:hover:bg-[#2b2b2b] transition ${
                    userReaction === 'dislike'
                      ? 'text-brand-500 font-bold bg-brand-500/10'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <ThumbsDown className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Watch Later Save */}
              <button
                onClick={handleToggleWatchLater}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222222] border border-gray-200 dark:border-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#2b2b2b] transition ${
                  isWatchLater ? 'text-brand-500 font-bold' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {isWatchLater ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Saved</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Save</span>
                  </>
                )}
              </button>

              {/* Share */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                title="Download using your plan quota"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222222] border border-gray-200 dark:border-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#2b2b2b] text-gray-700 dark:text-gray-200 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{isDownloading ? 'Downloading…' : 'Download'}</span>
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222222] border border-gray-200 dark:border-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#2b2b2b] text-gray-700 dark:text-gray-200 transition"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>

          {/* Description Box */}
          <div className="mt-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200/60 dark:border-[#252525]">
            <div className="flex items-center gap-3 text-xs font-bold text-gray-900 dark:text-white mb-2">
              <span>{formatViews(video.views)}</span>
              <span>•</span>
              <span>{formatFullDate(video.createdAt)}</span>
              {video.category && (
                <span className="px-2 py-0.5 rounded-md bg-gray-200 dark:bg-[#292929] text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {video.category}
                </span>
              )}
            </div>

            {/* Description Text */}
            <p
              className={`text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap leading-relaxed ${
                !showFullDesc && 'line-clamp-3'
              }`}
            >
              {video.description || 'No description provided.'}
            </p>

            {/* Tags */}
            {video.tags && video.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {video.tags.map((tag, idx) => (
                  <Link
                    key={idx}
                    to={`/search?q=${encodeURIComponent(tag)}`}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {video.description && video.description.length > 150 && (
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-2 text-xs font-bold text-gray-900 dark:text-white hover:underline block"
              >
                {showFullDesc ? 'Show less' : '...more'}
              </button>
            )}
          </div>

          {/* Real Comment Section */}
          <CommentSection
            videoId={video._id}
            commentsCount={video.commentsCount || 0}
          />
        </div>

        {/* Right Column: Related Videos */}
        <div className="lg:col-span-1">
          <RelatedVideos
            currentVideoId={video._id}
            category={video.category}
            onVideosLoaded={handleRelatedVideos}
          />
        </div>
      </div>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Video"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Share this video link with your friends or audience:
        </p>
        <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-gray-700">
          <input
            type="text"
            readOnly
            value={window.location.href}
            className="flex-1 bg-transparent text-xs text-gray-800 dark:text-gray-200 focus:outline-none truncate"
          />
          <button
            onClick={copyShareLink}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default VideoPage;
