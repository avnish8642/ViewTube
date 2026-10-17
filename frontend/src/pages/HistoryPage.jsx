import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { historyService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatViews, formatTimeAgo, resolveMediaUrl } from '../utils/formatters';
import { History as HistoryIcon, Trash2, X, Play } from 'lucide-react';
import Modal from '../components/common/Modal';

const HistoryPage = () => {
  const { addToast } = useToast();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await historyService.getHistory();
      if (res.data?.success) {
        setHistoryItems(res.data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRemove = async (e, videoId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await historyService.removeFromHistory(videoId);
      setHistoryItems((prev) => prev.filter((item) => item.video._id !== videoId));
      addToast('Removed from history', 'info');
    } catch (err) {
      addToast('Failed to remove item', 'error');
    }
  };

  const handleClearAll = async () => {
    try {
      await historyService.clearHistory();
      setHistoryItems([]);
      setShowClearModal(false);
      addToast('Watch history cleared', 'info');
    } catch (err) {
      addToast('Failed to clear history', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-200 dark:border-[#222]">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Watch History
          </h1>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear all history</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-2">
              <div className="w-56 aspect-video bg-gray-200 dark:bg-[#202020] rounded-xl" />
              <div className="flex-1 space-y-2 py-2">
                <div className="h-4 bg-gray-200 dark:bg-[#202020] rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-[#202020] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : historyItems.length === 0 ? (
        <div className="py-20 text-center">
          <HistoryIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            No watch history
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Videos that you watch will appear here.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition"
          >
            Browse videos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {historyItems.map((item) => {
            const vid = item.video;
            if (!vid) return null;

            return (
              <div
                key={item._id}
                className="group flex flex-col sm:flex-row gap-4 p-2.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition relative"
              >
                {/* Thumbnail */}
                <Link
                  to={`/watch/${vid._id}`}
                  className="relative w-full sm:w-56 aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-[#222] shrink-0"
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
                <div className="flex-1 min-w-0 flex flex-col justify-start">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/watch/${vid._id}`}>
                      <h3 className="font-semibold text-base text-gray-900 dark:text-white line-clamp-2 group-hover:text-brand-500 transition leading-snug">
                        {vid.title}
                      </h3>
                    </Link>
                    <button
                      onClick={(e) => handleRemove(e, vid._id)}
                      title="Remove from history"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#2c2c2c] text-gray-500 hover:text-red-500 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {vid.channel && (
                    <Link
                      to={`/channel/${vid.channel._id}`}
                      className="mt-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      {vid.channel.name}
                    </Link>
                  )}

                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <span>{formatViews(vid.views)}</span>
                    <span>•</span>
                    <span>Watched {formatTimeAgo(item.watchedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear Watch History?"
      >
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Your watch history will be deleted from all devices. You cannot undo this action.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowClearModal(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition"
          >
            Clear History
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default HistoryPage;
