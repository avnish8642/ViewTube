import crypto from 'crypto';

export const getRequestIp = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
};

export const getUserAgentHash = (userAgent) => crypto.createHash('sha256').update(userAgent || '').digest('hex');

export const parseUserAgent = (userAgent = '') => {
  let browser = 'Unknown';
  let browserVersion = '';
  const browserMatch =
    userAgent.match(/Edg\/([\d.]+)/i) ||
    userAgent.match(/Firefox\/([\d.]+)/i) ||
    userAgent.match(/Chrome\/([\d.]+)/i) ||
    userAgent.match(/Version\/([\d.]+).*Safari/i);
  if (browserMatch) {
    browserVersion = browserMatch[1];
    browser = browserMatch[0].startsWith('Edg/') ? 'Edge'
      : browserMatch[0].startsWith('Firefox/') ? 'Firefox'
        : browserMatch[0].startsWith('Chrome/') ? 'Chrome'
          : 'Safari';
  }

  let operatingSystem = 'Unknown';
  if (/Windows NT/i.test(userAgent)) operatingSystem = 'Windows';
  else if (/Android/i.test(userAgent)) operatingSystem = 'Android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) operatingSystem = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(userAgent)) operatingSystem = 'macOS';
  else if (/Linux/i.test(userAgent)) operatingSystem = 'Linux';

  let deviceType = 'Desktop';
  if (/iPad|Tablet/i.test(userAgent)) deviceType = 'Tablet';
  else if (/Mobile|iPhone|Android/i.test(userAgent)) deviceType = 'Mobile';

  const androidModel = userAgent.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i);
  const deviceModel = /iPhone/i.test(userAgent) ? 'iPhone'
    : /iPad/i.test(userAgent) ? 'iPad'
      : androidModel?.[1]?.trim() || '';

  return { browser, browserVersion, operatingSystem, deviceType, deviceModel };
};

export const resolveTheme = (user) => {
  if (user.themePreference === 'light' || user.themePreference === 'dark') return user.themePreference;
  const localTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(new Date());
  const hour = Number(localTime);
  return hour >= 5 && hour < 12 ? 'light' : 'dark';
};

export const serializeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  channel: user.channel,
  themePreference: user.themePreference || 'auto',
  effectiveTheme: resolveTheme(user),
  membership: user.membership,
});

export const isAllowedRemoteMediaUrl = (value) => {
  try {
    const mediaUrl = new URL(value);
    if (mediaUrl.protocol !== 'https:') return false;
    const allowedHosts = (process.env.VIDEO_MEDIA_HOSTS || 'res.cloudinary.com')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    return allowedHosts.some((host) => mediaUrl.hostname.toLowerCase() === host || mediaUrl.hostname.toLowerCase().endsWith(`.${host}`));
  } catch {
    return false;
  }
};

export const createIpRateLimiter = ({ limit, windowMs, message }) => {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = getRequestIp(req) || 'unknown';
    let bucket = buckets.get(ip);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }
    if (buckets.size > 5000) {
      for (const [key, value] of buckets) {
        if (now >= value.resetAt) buckets.delete(key);
      }
    }
    if (bucket.count >= limit) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }
    bucket.count += 1;
    return next();
  };
};
