import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import VideoCard from '../components/common/VideoCard';
import { SkeletonGrid } from '../components/common/SkeletonCard';
import { searchService, channelService } from '../services/api';
import { Search as SearchIcon, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { formatSubscribers, resolveMediaUrl } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || 'All';
  const currentSort = searchParams.get('sort') || 'views';

  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [videos, setVideos] = useState([]);
  const [matchingChannels, setMatchingChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchResults = async () => {
    if (!query.trim()) {
      setVideos([]);
      setMatchingChannels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await searchService.search({
        q: query,
        category: currentCategory !== 'All' ? currentCategory : undefined,
        sort: currentSort,
      });

      if (res.data?.success) {
        setVideos(res.data.videos || []);
        setMatchingChannels(res.data.matchingChannels || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [query, currentCategory, currentSort]);

  const handleSortChange = (sortVal) => {
    searchParams.set('sort', sortVal);
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 w-full">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-200 dark:border-[#222222]">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Search results for: <span className="text-brand-500 font-bold">"{query}"</span>
          {!loading && <span className="text-gray-400 font-normal ml-2">({total} found)</span>}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500 font-medium">Sort by:</span>
          {['views', 'latest', 'rating'].map((s) => (
            <button
              key={s}
              onClick={() => handleSortChange(s)}
              className={`capitalize px-3 py-1 rounded-full font-medium transition ${
                currentSort === s
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-[#202020] text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Matching Channel Feature Card */}
      {!loading && matchingChannels.length > 0 && (
        <div className="space-y-3 mb-6">
          {matchingChannels.map((channel) => (
            <Link
              key={channel._id}
              to={`/channel/${channel._id}`}
              className="flex items-center gap-4 sm:gap-6 p-4 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200/70 dark:hover:bg-[#222] transition border border-gray-200 dark:border-[#282828]"
            >
              <img
                src={resolveMediaUrl(channel.avatar)}
                alt={channel.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-brand-500/20"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {channel.name}
                  </h3>
                  <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  @{channel.handle} • {formatSubscribers(channel.subscribersCount)}
                </p>
                {channel.description && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                    {channel.description}
                  </p>
                )}
              </div>
              <span className="hidden sm:inline-block px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-full shadow-sm">
                View Channel
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && <SkeletonGrid count={5} layout="horizontal" />}

      {/* Empty State */}
      {!loading && videos.length === 0 && matchingChannels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SearchIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            No matching videos found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            Try different search terms or check spelling.
          </p>
          <Link
            to="/"
            className="text-xs font-semibold text-brand-500 hover:underline"
          >
            Explore trending videos
          </Link>
        </div>
      )}

      {/* Video Results in Horizontal YouTube Search Style */}
      {!loading && videos.length > 0 && (
        <div className="flex flex-col gap-4">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} layout="horizontal" />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
