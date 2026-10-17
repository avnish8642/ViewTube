import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Video as VideoIcon,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  X,
  FileVideo,
} from 'lucide-react';
import { videoService } from '../services/api';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  'Coding',
  'Tech',
  'Entertainment',
  'Music',
  'Gaming',
  'Travel',
  'Education',
  'News',
  'Sports',
];

const UploadPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tech');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState('public');

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Handle Video Selection
  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mkv|mov)$/i)) {
        setError('Please select a valid video file (MP4, WebM, MKV)');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError('');

      // Auto-populate title if empty from filename
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  // Handle Thumbnail Selection
  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG, WebP)');
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      setError('Please select a video file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title for the video.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('visibility', visibility);
      formData.append('tags', tagsInput);

      const res = await videoService.createVideo(formData, (progress) => {
        setUploadProgress(progress);
      });

      if (res.data?.success && res.data?.video?._id) {
        addToast('Video uploaded and published successfully!', 'success');
        navigate(`/watch/${res.data.video._id}`);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Video upload failed. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Upload Video
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Post high-definition videos to your channel and share with your audience.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-500 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Progress Bar if uploading */}
      {isUploading && (
        <div className="mb-6 p-5 rounded-2xl bg-brand-500/10 border border-brand-500/30">
          <div className="flex items-center justify-between text-sm font-semibold mb-2">
            <span className="text-gray-900 dark:text-white">
              Uploading & Processing Media...
            </span>
            <span className="text-brand-500 font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Details Form */}
        <div className="md:col-span-2 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Title (required)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a catchy title that describes your video"
              maxLength={100}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
            <div className="text-[11px] text-gray-400 text-right mt-1">
              {title.length}/100
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers what your video is about, include timestamps or links..."
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {/* Category & Visibility Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
              >
                <option value="public">Public (Everyone can watch)</option>
                <option value="unlisted">Unlisted (Anyone with link)</option>
                <option value="private">Private (Only you)</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="react, coding, tutorial, 2026"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Right 1 Col: Media Upload Pickers & Previews */}
        <div className="space-y-5">
          {/* Video File Dropzone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Video File *
            </label>
            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 bg-gray-50 dark:bg-[#181818] overflow-hidden transition flex flex-col items-center justify-center p-4 text-center cursor-pointer group">
              {videoPreview ? (
                <video
                  src={videoPreview}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <FileVideo className="w-10 h-10 text-brand-500 mb-2 group-hover:scale-110 transition" />
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Click to select video
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    MP4, WebM, MKV (up to 150MB)
                  </p>
                </>
              )}
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
            </div>
            {videoFile && (
              <p className="text-[11px] text-emerald-500 flex items-center gap-1 mt-1 truncate">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Selected: {videoFile.name}</span>
              </p>
            )}
          </div>

          {/* Thumbnail Dropzone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Custom Thumbnail
            </label>
            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 bg-gray-50 dark:bg-[#181818] overflow-hidden transition flex flex-col items-center justify-center p-4 text-center cursor-pointer group">
              {thumbnailPreview ? (
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-1 group-hover:scale-110 transition" />
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Upload thumbnail
                  </p>
                  <p className="text-[11px] text-gray-400">16:9 JPG, PNG, WebP</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || !videoFile || !title.trim()}
            className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Uploading Video...' : 'Publish Video'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadPage;
