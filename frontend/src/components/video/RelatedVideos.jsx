import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { videoService } from '../../services/api';
import { formatViews, formatTimeAgo, resolveMediaUrl } from '../../utils/formatters';

const RelatedVideos = ({ currentVideoId, category, onVideosLoaded }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const params = { limit: 15 };
    if (activeFilter !== 'All') {
      params.category = activeFilter;
    } else if (category) {
      // Prioritize related category by default
      params.category = category;
    }

    videoService
      .getVideos(params)
      .then((res) => {
        if (isMounted && res.data?.videos) {
          // Exclude current video
          const related = res.data.videos.filter((v) => v._id !== currentVideoId);
          setVideos(related);
          onVideosLoaded?.(related);
        }
      })
      .catch((err) => {
        console.error('Failed to load related videos:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentVideoId, category, activeFilter, onVideosLoaded]);

  const categories = ['All', 'Related', 'Coding', 'Tech', 'Music', 'Gaming'];

  return (
    <div className="w-full">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat === 'Related' ? category || 'All' : cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              activeFilter === cat || (cat === 'Related' && activeFilter === category)
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-[#202020] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Videos List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-2.5 animate-pulse">
              <div className="w-40 aspect-video rounded-xl bg-gray-200 dark:bg-[#202020] shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 bg-gray-200 dark:bg-[#202020] rounded w-5/6" />
                <div className="h-3 bg-gray-200 dark:bg-[#202020] rounded w-1/2" />
                <div className="h-2.5 bg-gray-200 dark:bg-[#202020] rounded w-2/3" />
              </div>
            </div>
          ))
        ) : videos.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
            No related videos found
          </p>
        ) : (
          videos.map((vid) => (
            <Link
              key={vid._id}
              to={`/watch/${vid._id}`}
              className="flex gap-2.5 group rounded-xl p-1 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] transition"
            >
              {/* Thumbnail */}
              <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-[#1a1a1a] shrink-0">
                <img
                  src={resolveMediaUrl(vid.thumbnailUrl)}
                  alt={vid.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-semibold px-1 rounded">
                  {vid.duration || '0:00'}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-start">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-brand-500 transition leading-snug">
                  {vid.title}
                </h4>
                <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400 truncate">
                  {vid.channel?.name}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  <span>{formatViews(vid.views)}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(vid.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default RelatedVideos;
