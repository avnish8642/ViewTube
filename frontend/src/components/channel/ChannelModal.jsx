import React, { useState } from 'react';
import Modal from '../common/Modal';
import { channelService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Upload, Image as ImageIcon } from 'lucide-react';

const ChannelModal = ({ isOpen, onClose, channel, onUpdated }) => {
  const { updateUser } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(channel?.name || '');
  const [handle, setHandle] = useState(channel?.handle || '');
  const [description, setDescription] = useState(channel?.description || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(channel?.avatar || '');
  const [bannerPreview, setBannerPreview] = useState(channel?.banner || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Channel name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (handle.trim()) formData.append('handle', handle.trim());
      formData.append('description', description.trim());
      if (avatarFile) formData.append('avatar', avatarFile);
      if (bannerFile) formData.append('banner', bannerFile);

      const res = await channelService.updateChannel(channel._id, formData);
      if (res.data?.success) {
        addToast('Channel details updated successfully', 'success');
        if (onUpdated) onUpdated(res.data.channel);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Channel" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
            {error}
          </div>
        )}

        {/* Banner Preview & Upload */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Channel Banner
          </label>
          <div className="relative aspect-[3/1] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-gray-700">
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="Banner Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-xs">No banner uploaded</span>
              </div>
            )}
            <label className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition text-white text-xs font-semibold gap-1.5">
              <Upload className="w-4 h-4" />
              <span>Change Banner</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Avatar Preview & Upload */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-gray-700 shrink-0">
            <img
              src={avatarPreview || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
              alt="Avatar Preview"
              className="w-full h-full object-cover"
            />
            <label className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition text-white">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Channel Avatar
            </p>
            <p className="text-[11px] text-gray-500">
              Recommended: Square JPG or PNG, at least 400x400.
            </p>
          </div>
        </div>

        {/* Channel Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Channel Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-[#333] bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Handle */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Handle
          </label>
          <div className="flex items-center">
            <span className="px-3 py-2 bg-gray-100 dark:bg-[#2b2b2b] border border-r-0 border-gray-200 dark:border-[#333] rounded-l-xl text-sm text-gray-500">
              @
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
              placeholder="channel_handle"
              className="flex-1 px-3.5 py-2 rounded-r-xl border border-gray-200 dark:border-[#333] bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Channel Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Tell viewers about your channel..."
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-[#333] bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#2c2c2c]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272727] transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChannelModal;
