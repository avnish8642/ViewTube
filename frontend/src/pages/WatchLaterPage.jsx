import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { watchLaterService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatViews, formatTimeAgo, resolveMediaUrl } from '../utils/formatters';
import { Clock, Play, Trash2, Video } from 'lucide-react';

const WatchLaterPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchLater = async () => {
    setLoading(true);
    try {
      const res = await watchLaterService.getWatchLater();
      if (res.data?.success) {
        setVideos(res.data.videos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchLater();
  }, []);

  const handleRemove = async (e, videoId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await watchLaterService.removeFromWatchLater(videoId);
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
      addToast('Removed from Watch Later', 'info');
    } catch (err) {
      addToast('Failed to remove video', 'error');
    }
  };

  const handlePlayAll = () => {
    if (videos.length > 0) {
      navigate(`/watch/${videos[0]._id}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 w-full">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Playlist Card Banner */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-20 p-5 rounded-3xl bg-gradient-to-br from-red-600/20 via-brand-500/10 to-transparent border border-brand-500/20 backdrop-blur-md">
            {/* Top Thumbnail Preview */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-200 dark:bg-[#1a1a1a] shadow-md mb-4">
              {videos.length > 0 ? (
                <img
                  src={resolveMediaUrl(videos[0].thumbnailUrl)}
                  alt="Watch Later Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Clock className="w-10 h-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Clock className="w-8 h-8 text-white drop-shadow-md" />
              </div>
            </div>

            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              Watch Later
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {videos.length} {videos.length === 1 ? 'video' : 'videos'} saved
            </p>

            {videos.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/30 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play All</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Videos List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-2">
                  <div className="w-48 aspect-video bg-gray-200 dark:bg-[#202020] rounded-xl" />
                  <div className="flex-1 space-y-2 py-2">
                    <div className="h-4 bg-gray-200 dark:bg-[#202020] rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-[#202020] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="py-24 text-center">
              <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                No videos saved yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                Click "Save to Watch Later" on any video to bookmark it here.
              </p>
              <Link
                to="/"
                className="inline-block px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition"
              >
                Explore videos
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((vid, idx) => (
                <div
                  key={vid._id}
                  className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition relative"
                >
                  <span className="hidden sm:inline-block w-6 text-center text-xs font-bold text-gray-400">
                    {idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <Link
                    to={`/watch/${vid._id}`}
                    className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-[#222] shrink-0"
                  >
                    <img
                      src={resolveMediaUrl(vid.thumbnailUrl)}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-semibold px-1 rounded">
                      {vid.duration || '0:00'}
                    </span>
                  </Link>

                  {/* Meta */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/watch/${vid._id}`}>
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 group-hover:text-brand-500 transition leading-snug">
                        {vid.title}
                      </h3>
                    </Link>

                    {vid.channel && (
                      <Link
                        to={`/channel/${vid.channel._id}`}
                        className="mt-1 block text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        {vid.channel.name}
                      </Link>
                    )}

                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                      <span>{formatViews(vid.views)}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(vid.createdAt)}</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemove(e, vid._id)}
                    title="Remove from Watch Later"
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-[#2b2b2b] text-gray-500 hover:text-red-500 transition self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchLaterPage;
