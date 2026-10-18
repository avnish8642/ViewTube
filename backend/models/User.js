import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
    themePreference: {
      type: String,
      enum: ['auto', 'light', 'dark'],
      default: 'auto',
    },
    membership: {
      plan: { type: String, enum: ['free', 'bronze', 'silver', 'gold'], default: 'free' },
      status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
      startedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, default: null },
      renew: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, username: this.username, email: this.email },
    process.env.JWT_SECRET || 'super_secret_viewtube_jwt_key_2026_xyz',
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

export default mongoose.model('User', userSchema);
