import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userService, videoService } from '../services/api';
import { resolveMediaUrl, formatViews, formatTimeAgo } from '../utils/formatters';
import {
  User,
  Settings,
  Lock,
  Upload,
  Tv,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [userVideos, setUserVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Profile Edit State
  const [username, setUsername] = useState(user?.username || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [securityActivity, setSecurityActivity] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [themePreference, setThemePreference] = useState(user?.themePreference || 'auto');

  useEffect(() => {
    if (user?._id) {
      setLoadingVideos(true);
      userService
        .getUserVideos(user._id)
        .then((res) => {
          if (res.data?.success) {
            setUserVideos(res.data.videos || []);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoadingVideos(false));
    }
  }, [user?._id]);

  useEffect(() => {
    if (activeTab !== 'security') return;
    Promise.all([userService.getSecurityActivity(), userService.getTrustedDevices()])
      .then(([activityResponse, devicesResponse]) => {
        setSecurityActivity(activityResponse.data.events || []);
        setTrustedDevices(devicesResponse.data.devices || []);
      })
      .catch((error) => addToast(error.response?.data?.message || 'Unable to load account security activity.', 'error'));
  }, [activeTab, addToast]);

  const handleThemePreferenceChange = async (preference) => {
    setThemePreference(preference);
    try {
      const response = await userService.updateThemePreference(preference);
      updateUser({ ...user, ...response.data.user });
      window.dispatchEvent(new CustomEvent('vidsphere-theme', {
        detail: { theme: response.data.user.effectiveTheme, preference },
      }));
      addToast('Theme preference saved.', 'success');
    } catch (error) {
      setThemePreference(user?.themePreference || 'auto');
      addToast(error.response?.data?.message || 'Unable to save theme preference.', 'error');
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    try {
      await userService.revokeTrustedDevice(deviceId);
      setTrustedDevices((previous) => previous.filter((device) => device._id !== deviceId));
      addToast('Trusted device revoked. It will need email verification next time.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Unable to revoke device.', 'error');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const formData = new FormData();
      if (username !== user.username) {
        formData.append('username', username.trim());
      }
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await userService.updateProfile(formData);
      if (res.data?.success) {
        updateUser(res.data.user);
        addToast('Profile updated successfully', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await userService.changePassword({
        currentPassword,
        newPassword,
      });
      if (res.data?.success) {
        addToast('Password changed successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to permanently delete this video?')) return;
    try {
      await videoService.deleteVideo(videoId);
      setUserVideos((prev) => prev.filter((v) => v._id !== videoId));
      addToast('Video deleted', 'info');
    } catch (err) {
      addToast('Failed to delete video', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 w-full">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6 rounded-3xl bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#282828] mb-8">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-[#252525] border-2 border-brand-500 shrink-0">
          <img
            src={resolveMediaUrl(avatarPreview)}
            alt={user?.username}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {user?.channel?.name || user?.username}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            @{user?.username} • {user?.email}
          </p>
          {user?.channel && (
            <Link
              to={`/channel/${user.channel._id}`}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-brand-500 transition shadow-2xs"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Go to Public Channel</span>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-[#242424] text-sm font-semibold mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'profile'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`py-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'security'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </button>
        <button
          onClick={() => setActiveTab('manage-videos')}
          className={`py-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'manage-videos'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Your Videos ({userVideos.length})</span>
        </button>
      </div>

      {/* Profile Edit Form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-xl animate-fade-in">
          {/* Avatar Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
              Profile Avatar
            </label>
            <div className="flex items-center gap-4">
              <img
                src={resolveMediaUrl(avatarPreview)}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border border-gray-300 dark:border-gray-700"
              />
              <label className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#303030] text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload New Picture</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#121212] text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed.</p>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition"
          >
            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      )}

      {/* Password Change Form */}
      {activeTab === 'security' && (
        <div className="space-y-8 animate-fade-in">
        <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-white dark:bg-[#181818] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition"
          >
            {changingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <section className="max-w-2xl rounded-2xl border border-gray-200 dark:border-[#282828] bg-white dark:bg-[#181818] p-5">
          <h2 className="font-bold text-gray-900 dark:text-white">Theme preference</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto uses light mode from 5:00 AM to noon IST and dark mode the rest of the day. A manual choice syncs to your account.</p>
          <select value={themePreference} onChange={(event) => handleThemePreferenceChange(event.target.value)} className="mt-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181818] px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
            <option value="auto">Automatic (IST)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </section>

        <section className="max-w-3xl">
          <h2 className="mb-3 font-bold text-gray-900 dark:text-white">Trusted devices</h2>
          <div className="space-y-2">
            {trustedDevices.length === 0 && <p className="text-sm text-gray-500">No active trusted devices.</p>}
            {trustedDevices.map((device) => (
              <div key={device._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-[#282828] bg-white dark:bg-[#181818] p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{device.label}</p>
                  <p className="text-xs text-gray-500">IP {device.ipAddress || 'unavailable'} · Last used {new Date(device.lastSeenAt).toLocaleString()} · Trusted until {new Date(device.trustedUntil).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleRevokeDevice(device._id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">Revoke</button>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-3xl">
          <h2 className="mb-3 font-bold text-gray-900 dark:text-white">Recent sign-in activity</h2>
          <div className="space-y-2">
            {securityActivity.length === 0 && <p className="text-sm text-gray-500">No recorded sign-ins yet.</p>}
            {securityActivity.map((event) => (
              <div key={event._id} className="rounded-xl border border-gray-200 dark:border-[#282828] bg-white dark:bg-[#181818] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{event.browser} {event.browserVersion} · {event.operatingSystem} · {event.deviceType}{event.deviceModel ? ` (${event.deviceModel})` : ''}</p>
                  <span className={`text-xs font-semibold ${event.success ? 'text-green-600' : 'text-amber-600'}`}>{event.success ? 'Verified' : event.reason.replaceAll('_', ' ')}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{event.ipAddress || 'IP unavailable'} · {[event.city, event.state, event.country].filter(Boolean).join(', ') || 'Location unavailable'} · {new Date(event.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
        </div>
      )}

      {/* Manage Uploaded Videos */}
      {activeTab === 'manage-videos' && (
        <div className="space-y-4 animate-fade-in">
          {loadingVideos ? (
            <p className="text-sm text-gray-500">Loading videos...</p>
          ) : userVideos.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                You haven't uploaded any videos yet.
              </p>
              <Link
                to="/upload"
                className="px-4 py-2 bg-brand-500 text-white text-xs font-semibold rounded-xl hover:bg-brand-600 transition"
              >
                Upload a video now
              </Link>
            </div>
          ) : (
            userVideos.map((vid) => (
              <div
                key={vid._id}
                className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-[#181818] border border-gray-200 dark:border-[#282828] hover:shadow-xs transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={resolveMediaUrl(vid.thumbnailUrl)}
                    alt={vid.title}
                    className="w-24 aspect-video rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <Link
                      to={`/watch/${vid._id}`}
                      className="font-semibold text-sm text-gray-900 dark:text-white hover:text-brand-500 truncate block"
                    >
                      {vid.title}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatViews(vid.views)} • {formatTimeAgo(vid.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/watch/${vid._id}`}
                    title="Watch"
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252525] transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDeleteVideo(vid._id)}
                    title="Delete Video"
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
