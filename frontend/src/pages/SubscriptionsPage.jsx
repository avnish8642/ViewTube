import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VideoCard from '../components/common/VideoCard';
import { SkeletonGrid } from '../components/common/SkeletonCard';
import { channelService, videoService } from '../services/api';
import { Tv, Sparkles } from 'lucide-react';
import { formatSubscribers, resolveMediaUrl } from '../utils/formatters';

const SubscriptionsPage = () => {
  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const subRes = await channelService.getMySubscriptions();
        if (subRes.data?.success) {
          const subs = subRes.data.subscriptions || [];
          setChannels(subs);

          // Fetch videos from these channels or recent videos
          const vidRes = await videoService.getVideos({ limit: 20 });
          if (vidRes.data?.success) {
            // Highlight videos from subscribed channels if any
            const subIds = new Set(subs.map((s) => s._id));
            const subVideos = vidRes.data.videos.filter((v) =>
              subIds.has(v.channel?._id)
            );
            // If few or none, display all recent so the feed isn't barren
            setVideos(subVideos.length > 0 ? subVideos : vidRes.data.videos);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full">
      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-gray-200 dark:border-[#222]">
        <Tv className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Subscriptions
        </h1>
      </div>

      {/* Subscribed Channels Avatar Reel */}
      {channels.length > 0 && (
        <div className="mb-8 overflow-x-auto no-scrollbar pb-2">
          <div className="flex items-center gap-5">
            {channels.map((chan) => (
              <Link
                key={chan._id}
                to={`/channel/${chan._id}`}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="relative w-14 h-14 rounded-full p-0.5 border-2 border-brand-500 group-hover:scale-105 transition-transform">
                  <img
                    src={resolveMediaUrl(chan.avatar)}
                    alt={chan.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 max-w-[80px] truncate text-center">
                  {chan.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonGrid count={8} />
      ) : channels.length === 0 ? (
        <div className="py-24 text-center">
          <Tv className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Don't miss new videos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Sign in and subscribe to your favorite channels to see their latest uploads here.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition"
          >
            Discover channels
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
            Latest from your subscriptions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 animate-fade-in">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
