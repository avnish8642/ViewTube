// Format view counts to YouTube style (e.g. 1.2K, 3.4M)
export const formatViews = (views) => {
  if (!views && views !== 0) return '0 views';
  const num = Number(views);
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B views';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M views';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K views';
  }
  return num === 1 ? '1 view' : `${num} views`;
};

// Format subscriber counts (e.g. 120K subscribers)
export const formatSubscribers = (subscribers) => {
  if (!subscribers && subscribers !== 0) return '0 subscribers';
  const num = Number(subscribers);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M subscribers';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K subscribers';
  }
  return num === 1 ? '1 subscriber' : `${num} subscribers`;
};

// Format upload date to relative time ago (e.g. 2 hours ago, 3 days ago)
export const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

// Format seconds into MM:SS or HH:MM:SS
export const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  if (typeof seconds === 'string' && seconds.includes(':')) return seconds;
  const num = Math.floor(Number(seconds));
  const hrs = Math.floor(num / 3600);
  const mins = Math.floor((num % 3600) / 60);
  const secs = num % 60;

  const paddedSecs = secs < 10 ? `0${secs}` : secs;
  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : mins;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
};

// Format full readable date (e.g. Oct 14, 2026)
export const formatFullDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Resolve local upload URLs or external URLs
export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Local upload served through Vite proxy or backend
  return url;
};
