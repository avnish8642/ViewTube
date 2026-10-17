import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload folders exist
const uploadsDir = path.join(__dirname, '../uploads');
const videosDir = path.join(uploadsDir, 'videos');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const avatarsDir = path.join(uploadsDir, 'avatars');

[uploadsDir, videosDir, thumbnailsDir, avatarsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, videosDir);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, thumbnailsDir);
    } else {
      cb(null, avatarsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter validation
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    const allowedVideoMimes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-matroska',
    ];
    if (allowedVideoMimes.includes(file.mimetype) || file.originalname.match(/\.(mp4|webm|mkv|mov)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Supported: MP4, WebM, MKV, MOV'), false);
    }
  } else if (file.fieldname === 'thumbnail' || file.fieldname === 'avatar' || file.fieldname === 'banner') {
    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedImageMimes.includes(file.mimetype) || file.originalname.match(/\.(jpeg|jpg|png|webp|gif)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Supported: JPG, PNG, WEBP, GIF'), false);
    }
  } else {
    cb(null, true);
  }
};

export const uploadMedia = multer({
  storage,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB video limit
  },
  fileFilter,
});

/**
 * Upload a local file to Cloudinary if configured; otherwise returns local relative URL
 */
export const processUpload = async (file, folder = 'viewtube', resourceType = 'auto') => {
  if (!file) return null;

  if (isCloudinaryConfigured) {
    try {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: `viewtube/${folder}`,
        resource_type: resourceType,
      });

      // Cleanup local temp file after Cloudinary upload
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.warn('Could not remove temporary local file:', err.message);
      }

      return uploadResult.secure_url;
    } catch (cloudErr) {
      console.error('[Cloudinary] Upload failed, falling back to local storage:', cloudErr.message);
    }
  }

  // Fallback: Local URL
  const subfolder = file.fieldname === 'video' ? 'videos' : (file.fieldname === 'thumbnail' ? 'thumbnails' : 'avatars');
  return `/uploads/${subfolder}/${file.filename}`;
};
