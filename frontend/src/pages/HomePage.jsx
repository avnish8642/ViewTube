import React, { useEffect, useState } from 'react';
import VideoCard from '../components/common/VideoCard';
import { SkeletonGrid } from '../components/common/SkeletonCard';
import { videoService } from '../services/api';
import { AlertCircle, RefreshCw, Flame, Sparkles } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Coding',
  'Tech',
  'Entertainment',
  'Music',
  'Gaming',
  'Travel',
  'Education',
];

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVideos = async (category = selectedCategory) => {
    setLoading(true);
    setError(null);
    try {
      const params = category !== 'All' ? { category } : {};
      const res = await videoService.getVideos(params);
      if (res.data?.success) {
        setVideos(res.data.videos);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load videos. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Category Pills Bar */}
      <div className="sticky top-14 z-30 bg-gray-50 dark:bg-[#0f0f0f] pb-3 pt-2 mb-4 border-b border-transparent">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-200/70 dark:bg-[#222222] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#2e2e2e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 my-10 bg-red-500/10 rounded-2xl border border-red-500/20 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {error}
          </p>
          <button
            onClick={() => fetchVideos(selectedCategory)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !error && <SkeletonGrid count={8} />}

      {/* Empty State */}
      {!loading && !error && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#202020] flex items-center justify-center mb-4 text-gray-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            No videos found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            No videos uploaded yet in the "{selectedCategory}" category.
          </p>
          {selectedCategory !== 'All' && (
            <button
              onClick={() => setSelectedCategory('All')}
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              View all videos
            </button>
          )}
        </div>
      )}

      {/* Videos Grid */}
      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 animate-fade-in">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
