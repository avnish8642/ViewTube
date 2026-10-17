import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, Clock, Share2, Check, BookmarkPlus } from 'lucide-react';
import { formatViews, formatTimeAgo, resolveMediaUrl } from '../../utils/formatters';
import { watchLaterService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const VideoCard = ({ video, layout = 'grid' }) => {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleWatchLater = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);

    if (!isAuthenticated) {
      addToast('Please log in to save videos', 'error');
      return;
    }

    try {
      const res = await watchLaterService.toggleWatchLater(video._id);
      addToast(res.data?.message || 'Updated Watch Later', 'success');
    } catch (err) {
      addToast('Failed to update Watch Later', 'error');
    }
  };

  const handleCopyLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    const url = `${window.location.origin}/watch/${video._id}`;
    navigator.clipboard.writeText(url);
    addToast('Link copied to clipboard!', 'success');
  };

  if (layout === 'horizontal') {
    return (
      <div className="group flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#1f1f1f] transition duration-200 relative">
        {/* Thumbnail */}
        <Link
          to={`/watch/${video._id}`}
          className="relative w-full sm:w-64 aspect-video sm:h-36 rounded-xl overflow-hidden bg-gray-200 dark:bg-[#1a1a1a] shrink-0"
        >
          <img
            src={resolveMediaUrl(video.thumbnailUrl)}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
            {video.duration || '0:00'}
          </div>
        </Link>

        {/* Video Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-start">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/watch/${video._id}`}>
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-brand-500 transition leading-snug">
                {video.title}
              </h3>
            </Link>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatViews(video.views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
          </div>

          {video.channel && (
            <Link
              to={`/channel/${video.channel._id}`}
              className="mt-2.5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <img
                src={resolveMediaUrl(video.channel.avatar)}
                alt={video.channel.name}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="font-medium truncate">{video.channel.name}</span>
            </Link>
          )}

          {video.description && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 hidden sm:block">
              {video.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Grid layout (Standard YouTube Home Card)
  return (
    <div className="group flex flex-col relative">
      {/* Thumbnail */}
      <Link
        to={`/watch/${video._id}`}
        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-200 dark:bg-[#1a1a1a] shadow-xs"
      >
        <img
          src={resolveMediaUrl(video.thumbnailUrl)}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
          {video.duration || '0:00'}
        </div>
      </Link>

      {/* Meta */}
      <div className="mt-3 flex items-start gap-3">
        {video.channel && (
          <Link
            to={`/channel/${video.channel._id}`}
            className="shrink-0 mt-0.5"
          >
            <img
              src={resolveMediaUrl(video.channel.avatar)}
              alt={video.channel.name}
              className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-[#2a2a2a] hover:opacity-90 transition"
            />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <Link to={`/watch/${video._id}`}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-brand-500 transition leading-snug">
              {video.title}
            </h3>
          </Link>

          {video.channel && (
            <Link
              to={`/channel/${video.channel._id}`}
              className="mt-1 block text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition truncate"
            >
              {video.channel.name}
            </Link>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <span>{formatViews(video.views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
          </div>
        </div>

        {/* Card Options Menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Video options"
            className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#2b2b2b] text-gray-500 dark:text-gray-400 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#212121] rounded-xl shadow-xl border border-gray-200 dark:border-[#2d2d2d] py-1.5 z-30 text-xs animate-fade-in">
              <button
                onClick={handleWatchLater}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2b2b2b] text-left"
              >
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Save to Watch Later</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2b2b2b] text-left"
              >
                <Share2 className="w-4 h-4 text-gray-400" />
                <span>Copy Video Link</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
