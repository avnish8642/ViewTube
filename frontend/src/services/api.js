import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
  login: (credentials) => api.post('/auth/login', credentials),
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
  removeFromHistory: (videoId) => api.delete(`/history/${videoId}`),
  clearHistory: () => api.delete('/history'),
};

// Search Services
export const searchService = {
  search: (params) => api.get('/search', { params }),
};

export default api;
