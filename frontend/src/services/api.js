import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for centralized error response handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token expired, clear local storage
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      if (!isAuthRoute && localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  getDefaultAccountSession: () => api.post('/auth/default-account'),
  login: (credentials) => api.post('/auth/login', credentials),
  verifyLoginOtp: (data) => api.post('/auth/verify-otp', data),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// User Services
export const userService = {
  getUser: (id) => api.get(`/users/${id}`),
  updateProfile: (formData) =>
    api.put('/users/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (data) => api.put('/users/password', data),
  getUserVideos: (id) => api.get(`/users/${id}/videos`),
  updateThemePreference: (themePreference) => api.put('/users/preferences/theme', { themePreference }),
  getSecurityActivity: () => api.get('/users/security/activity'),
  getTrustedDevices: () => api.get('/users/security/devices'),
  revokeTrustedDevice: (deviceId) => api.delete(`/users/security/devices/${deviceId}`),
};

// Video Services
export const videoService = {
  getVideos: (params) => api.get('/videos', { params }),
  getVideoById: (id) => api.get(`/videos/${id}`),
  createVideo: (formData, onProgress) =>
    api.post('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }),
  updateVideo: (id, formData) =>
    api.put(`/videos/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteVideo: (id) => api.delete(`/videos/${id}`),
  recordView: (id) => api.post(`/videos/${id}/view`),
  toggleLike: (id) => api.post(`/videos/${id}/like`),
  toggleDislike: (id) => api.post(`/videos/${id}/dislike`),
  getMyLikedVideos: () => api.get('/videos/liked/my'),
};

// Channel Services
export const channelService = {
  getChannel: (id) => api.get(`/channels/${id}`),
  updateChannel: (id, formData) =>
    api.put(`/channels/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getChannelVideos: (id) => api.get(`/channels/${id}/videos`),
  toggleSubscribe: (id) => api.post(`/channels/${id}/subscribe`),
  getMySubscriptions: () => api.get('/channels/subscriptions/my'),
};

// Comment Services
export const commentService = {
  getVideoComments: (videoId, params) => api.get(`/videos/${videoId}/comments`, { params }),
  createComment: (videoId, data) => api.post(`/videos/${videoId}/comments`, data),
  updateComment: (id, data) => api.put(`/comments/${id}`, data),
  deleteComment: (id) => api.delete(`/comments/${id}`),
  createCaptcha: () => api.post('/comments/captcha'),
  vote: (id, type) => api.post(`/comments/${id}/vote`, { type }),
  report: (id, data) => api.post(`/comments/${id}/reports`, data),
  history: (id) => api.get(`/comments/${id}/history`),
  translate: (data) => api.post('/comments/translate', data),
};

// Watch Later Services
export const watchLaterService = {
  getWatchLater: () => api.get('/watch-later'),
  addToWatchLater: (videoId) => api.post(`/watch-later/${videoId}`),
  removeFromWatchLater: (videoId) => api.delete(`/watch-later/${videoId}`),
  toggleWatchLater: (videoId) => api.post(`/watch-later/${videoId}/toggle`),
};

// Watch History Services
export const historyService = {
  getHistory: () => api.get('/history'),
  getProgress: (videoId) => api.get(`/history/progress/${videoId}`),
  saveProgress: (videoId, data) => api.put(`/history/progress/${videoId}`, data),
  removeFromHistory: (videoId) => api.delete(`/history/${videoId}`),
  clearHistory: () => api.delete('/history'),
};

// Search Services
export const searchService = {
  search: (params) => api.get('/search', { params }),
};

export const featureSuiteService = {
  getPlatformModules: () => api.get('/feature-suite'),
};

export const membershipService = {
  getPlans: () => api.get('/membership/plans'),
  getDashboard: () => api.get('/membership/current'),
  createOrder: (data, idempotencyKey) => api.post('/membership/orders', data, { headers: { 'Idempotency-Key': idempotencyKey } }),
  verifyPayment: (data) => api.post('/membership/verify', data),
  cancel: () => api.post('/membership/cancel'),
  getDownloads: () => api.get('/downloads'),
  requestDownload: (videoId, idempotencyKey) => api.post(`/downloads/${videoId}`, {}, { headers: { 'Idempotency-Key': idempotencyKey } }),
  downloadFile: (downloadId) => api.get(`/downloads/${downloadId}/file`, { responseType: 'blob' }),
};

export const meetingService = {
  create: (data) => api.post('/meetings', data),
  join: (roomId, password) => api.post(`/meetings/${roomId}/join`, { password }),
  getRoom: (roomId) => api.get(`/meetings/${roomId}`),
  updateRoom: (roomId, data) => api.patch(`/meetings/${roomId}`, data),
  updateParticipant: (roomId, userId, data) => api.patch(`/meetings/${roomId}/participants/${userId}`, data),
  updateStatus: (roomId, data) => api.patch(`/meetings/${roomId}/status`, data),
  leave: (roomId) => api.post(`/meetings/${roomId}/leave`),
  sendSignal: (roomId, data) => api.post(`/meetings/${roomId}/signals`, data),
  pollSignals: (roomId, after) => api.get(`/meetings/${roomId}/signals`, { params: { after } }),
  sendMessage: (roomId, data) => api.post(`/meetings/${roomId}/messages`, data),
  uploadFile: (roomId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/meetings/${roomId}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadFile: (roomId, attachmentId) => api.get(`/meetings/${roomId}/attachments/${attachmentId}`, { responseType: 'blob' }),
};

export default api;
