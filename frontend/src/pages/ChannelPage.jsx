import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import VideoCard from '../components/common/VideoCard';
import ChannelModal from '../components/channel/ChannelModal';
import { channelService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  formatSubscribers,
  formatViews,
  formatFullDate,
  resolveMediaUrl,
} from '../utils/formatters';
import { Edit3, CheckCircle2, Video, Info, Sparkles } from 'lucide-react';

const ChannelPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [stats, setStats] = useState({ totalVideos: 0, totalViews: 0 });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchChannelData = async () => {
    setLoading(true);
    try {
      const [channelRes, videosRes] = await Promise.all([
        channelService.getChannel(id),
        channelService.getChannelVideos(id),
      ]);

      if (channelRes.data?.success) {
        const c = channelRes.data.channel;
        setChannel(c);
        setIsSubscribed(channelRes.data.isSubscribed);
        setSubscribersCount(c.subscribersCount || 0);
        setIsOwner(channelRes.data.isOwner);
        setStats(channelRes.data.stats || { totalVideos: 0, totalViews: 0 });
      }

      if (videosRes.data?.success) {
        setVideos(videosRes.data.videos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelData();
  }, [id]);

  const handleSubscribeToggle = async () => {
    if (!isAuthenticated) {
      addToast('Please sign in to subscribe', 'error');
      return;
    }
    if (isOwner) {
      addToast('You cannot subscribe to your own channel', 'info');
      return;
    }

    try {
      const res = await channelService.toggleSubscribe(channel._id);
      if (res.data?.success) {
        setIsSubscribed(res.data.isSubscribed);
        setSubscribersCount(res.data.subscribersCount);
        addToast(
          res.data.isSubscribed ? 'Subscribed to channel' : 'Unsubscribed',
          'info'
        );
      }
    } catch (err) {
      addToast('Failed to toggle subscription', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-pulse space-y-4">
        <div className="w-full aspect-[4/1] bg-gray-200 dark:bg-[#1f1f1f] rounded-2xl" />
        <div className="flex gap-4 items-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#1f1f1f]" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-gray-200 dark:bg-[#1f1f1f] rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-[#1f1f1f] rounded w-1/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold">Channel not found</h2>
        <Link to="/" className="text-brand-500 hover:underline mt-2 inline-block">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 w-full">
      {/* Banner */}
      <div className="relative aspect-[4/1] max-h-56 w-full rounded-2xl overflow-hidden bg-gray-200 dark:bg-[#181818] shadow-sm">
        <img
          src={resolveMediaUrl(channel.banner)}
          alt={channel.name}
          className="w-full h-full object-cover"
        />
        {isOwner && (
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs font-semibold rounded-lg transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        )}
      </div>

      {/* Channel Header Information */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-[#242424]">
        <div className="flex items-center gap-4 sm:gap-6">
          <img
            src={resolveMediaUrl(channel.avatar)}
            alt={channel.name}
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white dark:border-[#0f0f0f] shadow-lg shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
                {channel.name}
              </h1>
              <CheckCircle2 className="w-5 h-5 text-brand-500" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              @{channel.handle} • {formatSubscribers(subscribersCount)} • {stats.totalVideos} videos
            </p>
            {channel.description && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-1 max-w-xl">
                {channel.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isOwner ? (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-[#252525] dark:hover:bg-[#303030] text-gray-900 dark:text-white transition"
            >
              Customize Channel
            </button>
          ) : (
            <button
              onClick={handleSubscribeToggle}
              className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition shadow-sm ${
                isSubscribed
                  ? 'bg-gray-200 dark:bg-[#272727] text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#333]'
                  : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-gray-200 dark:border-[#242424] text-sm font-semibold mt-2">
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'videos'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Videos ({videos.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`py-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'about'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>About</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'videos' && (
          <div>
            {videos.length === 0 ? (
              <div className="py-16 text-center">
                <Sparkles className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  No videos uploaded yet
                </p>
                {isOwner && (
                  <Link
                    to="/upload"
                    className="inline-block mt-3 px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-xl hover:bg-brand-600 transition"
                  >
                    Upload your first video
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 animate-fade-in">
                {videos.map((vid) => (
                  <VideoCard key={vid._id} video={vid} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-2xl space-y-6 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">
                Description
              </h3>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {channel.description || 'No channel description provided.'}
              </p>
            </div>

            <hr className="border-gray-200 dark:border-[#222]" />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
                Channel Stats
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gray-100 dark:bg-[#1a1a1a]">
                  <p className="text-xs text-gray-500">Subscribers</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatSubscribers(subscribersCount)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-100 dark:bg-[#1a1a1a]">
                  <p className="text-xs text-gray-500">Total Views</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatViews(stats.totalViews)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-100 dark:bg-[#1a1a1a]">
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatFullDate(channel.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ChannelModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          channel={channel}
          onUpdated={(updated) => {
            setChannel(updated);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ChannelPage;
