import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VideoCard from '../components/common/VideoCard';
import { SkeletonGrid } from '../components/common/SkeletonCard';
import { videoService } from '../services/api';
import { ThumbsUp } from 'lucide-react';

const LikedVideosPage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    videoService
      .getMyLikedVideos()
      .then((res) => {
        if (res.data?.success) {
          setVideos(res.data.videos || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full">
      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-gray-200 dark:border-[#222]">
        <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
          <ThumbsUp className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Liked Videos
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {videos.length} {videos.length === 1 ? 'video' : 'videos'} you have liked
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={8} />
      ) : videos.length === 0 ? (
        <div className="py-24 text-center">
          <ThumbsUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            No liked videos yet
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Like videos you enjoy to easily find them again here.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition"
          >
            Explore videos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 animate-fade-in">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedVideosPage;
