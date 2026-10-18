import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import DownloadQuota from '../models/DownloadQuota.js';
import DownloadRecord from '../models/DownloadRecord.js';
import PaymentRecord from '../models/PaymentRecord.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import { getRequestIp, isAllowedRemoteMediaUrl, parseUserAgent } from '../utils/security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANS = {
  free: { name: 'Free', price: 0, dailyDownloads: 1, monthlyDownloads: 5, premium: false, features: ['Public video catalog', 'No premium video access', '1 download each day', '5 downloads per month'] },
  bronze: { name: 'Bronze', price: 299, dailyDownloads: 5, monthlyDownloads: 50, premium: true, features: ['Full premium catalog', '5 downloads each day', '50 downloads per month', 'Membership access'] },
  silver: { name: 'Silver', price: 599, dailyDownloads: 15, monthlyDownloads: 200, premium: true, features: ['Full premium catalog', '15 downloads each day', '200 downloads per month', 'Membership access'] },
  gold: { name: 'Gold', price: 1199, dailyDownloads: 50, monthlyDownloads: 1000000000, premium: true, features: ['Full premium catalog', '50 downloads each day', 'Unlimited monthly downloads', 'Membership access'] },
};

const dateKeys = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { dayKey: `${values.year}-${values.month}-${values.day}`, monthKey: `${values.year}-${values.month}` };
};

const ensureActiveMembership = async (user) => {
  if (user.membership?.plan !== 'free' && user.membership?.expiresAt && user.membership.expiresAt <= new Date()) {
    user.membership = { plan: 'free', status: 'expired', startedAt: null, expiresAt: null, renew: false };
    await user.save();
  }
  return user.membership?.plan || 'free';
};

const getLimits = (plan) => PLANS[plan] || PLANS.free;

const createRazorpayOrder = async ({ amount, receipt, notes }) => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    const error = new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for test checkout.');
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, currency: 'INR', receipt, notes }),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (!response.ok || !result.id) {
    const error = new Error(result.error?.description || 'Razorpay could not create an order.');
    error.statusCode = 502;
    throw error;
  }
  return result;
};

const sendReceipt = async (user, payment) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) return false;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    ...(SMTP_USER && SMTP_PASS ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
  });
  await transporter.sendMail({
    from: SMTP_FROM,
    to: user.email,
    subject: `VidSphere ${payment.plan} membership receipt`,
    text: [
      `Hi ${user.username},`,
      `Your ${payment.plan} membership is active.`,
      `Invoice: ${payment.invoiceNumber}`,
      `Razorpay order: ${payment.orderId}`,
      `Payment: ${payment.paymentId}`,
      `Amount: INR ${(payment.amount / 100).toFixed(2)}`,
      `Valid: ${payment.startsAt.toISOString()} through ${payment.expiresAt.toISOString()}`,
      'This is a one-time payment. Memberships do not auto-renew.',
    ].join('\n'),
  });
  return true;
};

export const getPlans = (_req, res) => {
  res.status(200).json({
    success: true,
    plans: Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan, currency: 'INR' })),
    periods: [
      { id: 'monthly', months: 1, discount: 0 },
      { id: 'quarterly', months: 3, discount: 0.05 },
      { id: 'yearly', months: 12, discount: 0.2 },
    ],
  });
};

export const getMembershipDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const plan = await ensureActiveMembership(user);
    const { dayKey, monthKey } = dateKeys();
    const [usage, payments, downloads] = await Promise.all([
      DownloadQuota.findOne({ user: user._id, dayKey }),
      PaymentRecord.find({ user: user._id }).sort({ createdAt: -1 }).limit(25).select('-signature'),
      DownloadRecord.find({ user: user._id }).sort({ requestedAt: -1 }).limit(25).populate('video', 'title thumbnailUrl duration'),
    ]);
    const limits = getLimits(plan);
    const dailyUsed = usage?.dailyCount || 0;
    const monthlyUsed = usage?.monthKey === monthKey ? usage.monthlyCount : 0;
    res.status(200).json({
      success: true,
      membership: user.membership,
      plan: { id: plan, ...limits },
      quota: {
        dayKey,
        monthKey,
        dailyUsed,
        dailyLimit: limits.dailyDownloads,
        dailyRemaining: Math.max(0, limits.dailyDownloads - dailyUsed),
        monthlyUsed,
        monthlyLimit: plan === 'gold' ? null : limits.monthlyDownloads,
        monthlyRemaining: plan === 'gold' ? null : Math.max(0, limits.monthlyDownloads - monthlyUsed),
      },
      payments,
      downloads,
    });
  } catch (error) {
    next(error);
  }
};

export const createMembershipOrder = async (req, res, next) => {
  try {
    const { plan, period = 'monthly' } = req.body;
    if (!['bronze', 'silver', 'gold'].includes(plan) || !['monthly', 'quarterly', 'yearly'].includes(period)) {
      return res.status(400).json({ success: false, message: 'Choose a paid plan and valid billing period.' });
    }
    const idempotencyKey = String(req.get('Idempotency-Key') || '');
    if (!/^[a-zA-Z0-9-]{16,128}$/.test(idempotencyKey)) {
      return res.status(400).json({ success: false, message: 'A valid Idempotency-Key header is required.' });
    }
    const existing = await PaymentRecord.findOne({ user: req.user._id, idempotencyKey });
    if (existing) {
      return res.status(200).json({
        success: true,
        order: { id: existing.orderId, amount: existing.amount, currency: existing.currency, key: process.env.RAZORPAY_KEY_ID },
        payment: existing,
        reused: true,
      });
    }

    const planInfo = PLANS[plan];
    const months = period === 'yearly' ? 12 : period === 'quarterly' ? 3 : 1;
    const discount = period === 'yearly' ? 0.2 : period === 'quarterly' ? 0.05 : 0;
    const amount = Math.round(planInfo.price * months * 100 * (1 - discount));
    const invoiceNumber = `VS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const order = await createRazorpayOrder({
      amount,
      receipt: invoiceNumber.slice(0, 40),
      notes: { userId: String(req.user._id), plan, period, invoiceNumber },
    });
    const payment = await PaymentRecord.create({
      user: req.user._id,
      plan,
      period,
      orderId: order.id,
      invoiceNumber,
      idempotencyKey,
      amount,
      currency: 'INR',
    });
    res.status(201).json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID },
      payment,
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return res.status(504).json({ success: false, message: 'Razorpay order request timed out. Retry safely with the same idempotency key.' });
    next(error);
  }
};

export const verifyMembershipPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (![orderId, paymentId, signature].every((value) => typeof value === 'string' && value.length > 0)) {
      return res.status(400).json({ success: false, message: 'Payment verification details are incomplete.' });
    }
    const payment = await PaymentRecord.findOne({ user: req.user._id, orderId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment order not found.' });
    if (payment.status === 'paid') {
      return res.status(200).json({ success: true, message: 'Payment already verified.', payment, membership: req.user.membership });
    }
    if (payment.status !== 'created') return res.status(409).json({ success: false, message: 'This order is no longer payable.' });

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${orderId}|${paymentId}`)
      .digest();
    let supplied;
    try {
      supplied = Buffer.from(signature, 'hex');
    } catch {
      supplied = Buffer.alloc(0);
    }
    if (!process.env.RAZORPAY_KEY_SECRET || supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) {
      await PaymentRecord.updateOne({ _id: payment._id, status: 'created' }, { $set: { status: 'failed' } });
      return res.status(400).json({ success: false, message: 'Payment signature verification failed. Membership was not activated.' });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    const monthCount = payment.period === 'yearly' ? 12 : payment.period === 'quarterly' ? 3 : 1;
    expiresAt.setMonth(expiresAt.getMonth() + monthCount);
    const activated = await PaymentRecord.findOneAndUpdate(
      { _id: payment._id, status: 'created' },
      { $set: { status: 'paid', paymentId, signature, startsAt: now, expiresAt } },
      { new: true }
    );
    if (!activated) {
      const latest = await PaymentRecord.findById(payment._id);
      if (latest?.status === 'paid') return res.status(200).json({ success: true, message: 'Payment already verified.', payment: latest });
      return res.status(409).json({ success: false, message: 'Payment state changed; reload your membership dashboard.' });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $set: { membership: { plan: activated.plan, status: 'active', startedAt: now, expiresAt, renew: false } } }
    );
    const member = await User.findById(req.user._id).populate('channel');
    let receiptEmailed = false;
    try {
      receiptEmailed = await sendReceipt(member, activated);
    } catch (emailError) {
      console.error('[Billing] Payment verified but receipt email failed:', emailError.message);
    }
    activated.receiptEmailed = receiptEmailed;
    await activated.save();
    res.status(200).json({
      success: true,
      message: 'Payment verified and membership activated.',
      payment: { ...activated.toObject(), signature: undefined },
      membership: member.membership,
      receiptEmailed,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelMembershipRenewal = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const plan = await ensureActiveMembership(user);
    if (plan === 'free') return res.status(400).json({ success: false, message: 'There is no paid membership to cancel.' });
    user.membership.renew = false;
    await user.save();
    res.status(200).json({ success: true, message: 'Auto-renew is disabled. Your paid access remains active until expiry.', membership: user.membership });
  } catch (error) {
    next(error);
  }
};

const resolveLocalMedia = (videoUrl) => {
  let filename = '';
  if (videoUrl?.startsWith('/uploads/videos/')) filename = path.basename(videoUrl);
  else if (videoUrl?.startsWith('/api/videos/stream/')) filename = path.basename(videoUrl);
  if (!filename || filename === '.' || filename === path.sep) return null;
  return path.join(__dirname, '../uploads/videos', filename);
};

export const createVideoDownload = async (req, res, next) => {
  let quotaReserved = false;
  let record = null;
  try {
    const { videoId } = req.params;
    const idempotencyKey = String(req.get('Idempotency-Key') || '');
    if (!/^[a-zA-Z0-9-]{16,128}$/.test(idempotencyKey)) return res.status(400).json({ success: false, message: 'A valid Idempotency-Key header is required.' });
    const existingRequest = await DownloadRecord.findOne({ user: req.user._id, idempotencyKey });
    if (existingRequest) {
      if (String(existingRequest.video) !== String(videoId)) return res.status(409).json({ success: false, message: 'This idempotency key was already used for another video.' });
      return res.status(200).json({ success: true, download: existingRequest, reused: true });
    }

    const video = await Video.findById(videoId);
    if (!video || video.visibility === 'private') return res.status(404).json({ success: false, message: 'Video not found or inaccessible.' });
    const user = await User.findById(req.user._id);
    const plan = await ensureActiveMembership(user);
    if (video.premium && !getLimits(plan).premium) return res.status(403).json({ success: false, message: 'This premium video requires an active paid membership.' });

    const priorDuplicate = await DownloadRecord.findOne({
      user: user._id,
      video: video._id,
      requestedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: { $in: ['started', 'complete', 'interrupted'] },
    }).sort({ requestedAt: -1 });
    if (priorDuplicate) return res.status(200).json({ success: true, download: priorDuplicate, reused: true, duplicateWindow: true });

    const now = new Date();
    await DownloadRecord.updateMany(
      { user: user._id, video: video._id, dedupeActive: true, dedupeUntil: { $lte: now } },
      { $set: { dedupeActive: false } }
    );
    const mediaPath = resolveLocalMedia(video.videoUrl);
    if (mediaPath && !fs.existsSync(mediaPath)) return res.status(404).json({ success: false, message: 'The video file is not available for download.' });
    if (!mediaPath && !isAllowedRemoteMediaUrl(video.videoUrl)) return res.status(400).json({ success: false, message: 'Video media host is not approved for secure downloads.' });

    const { dayKey, monthKey } = dateKeys();
    const recordFields = {
      user: user._id,
      video: video._id,
      idempotencyKey,
      dedupeActive: true,
      dedupeUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      plan,
      dayKey,
      monthKey,
      ipAddress: getRequestIp(req),
      device: req.get('user-agent') || '',
      browser: parseUserAgent(req.get('user-agent') || '').browser,
    };
    try {
      record = await DownloadRecord.create(recordFields);
    } catch (error) {
      if (error.code === 11000) {
        const reused = await DownloadRecord.findOne({ user: user._id, idempotencyKey })
          || await DownloadRecord.findOne({ user: user._id, video: video._id, dedupeActive: true });
        if (reused && String(reused.video) === String(video._id)) return res.status(200).json({ success: true, download: reused, reused: true });
      }
      throw error;
    }

    try {
      await DownloadQuota.updateOne(
        { user: user._id, dayKey },
        { $setOnInsert: { user: user._id, dayKey, monthKey, dailyCount: 0, monthlyCount: 0 } },
        { upsert: true }
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
    const limits = getLimits(plan);
    const quota = await DownloadQuota.findOneAndUpdate(
      {
        user: user._id,
        dayKey,
        monthKey,
        $expr: { $and: [{ $lt: ['$dailyCount', limits.dailyDownloads] }, { $lt: ['$monthlyCount', limits.monthlyDownloads] }] },
      },
      { $inc: { dailyCount: 1, monthlyCount: 1 } },
      { new: true }
    );
    if (!quota) {
      await DownloadRecord.deleteOne({ _id: record._id });
      const usage = await DownloadQuota.findOne({ user: user._id, dayKey });
      return res.status(429).json({
        success: false,
        message: 'Download quota exhausted for this billing period.',
        quota: {
          dailyUsed: usage?.dailyCount || 0,
          dailyLimit: limits.dailyDownloads,
          monthlyUsed: usage?.monthlyCount || 0,
          monthlyLimit: plan === 'gold' ? null : limits.monthlyDownloads,
        },
      });
    }
    quotaReserved = true;
    record.status = 'started';
    await record.save();
    res.status(201).json({
      success: true,
      download: { _id: record._id, status: record.status, title: video.title, fileUrl: `/api/downloads/${record._id}/file` },
      quota: { dailyRemaining: Math.max(0, limits.dailyDownloads - quota.dailyCount), monthlyRemaining: plan === 'gold' ? null : Math.max(0, limits.monthlyDownloads - quota.monthlyCount) },
    });
  } catch (error) {
    if (record && !quotaReserved) await DownloadRecord.deleteOne({ _id: record._id }).catch((cleanupError) => console.error('[Downloads] Could not remove unreserved record:', cleanupError.message));
    next(error);
  }
};

export const streamAuthorizedDownload = async (req, res, next) => {
  let record = null;
  try {
    record = await DownloadRecord.findOne({ _id: req.params.downloadId, user: req.user._id }).populate('video');
    if (!record || !record.video) return res.status(404).json({ success: false, message: 'Download record not found.' });
    if (!['started', 'interrupted', 'complete'].includes(record.status)) return res.status(409).json({ success: false, message: 'Download is not available.' });
    const user = await User.findById(req.user._id);
    const plan = await ensureActiveMembership(user);
    if (record.video.premium && !getLimits(plan).premium) return res.status(403).json({ success: false, message: 'Your premium access has expired.' });

    const mediaPath = resolveLocalMedia(record.video.videoUrl);
    let stream;
    let size = 0;
    let contentType = 'application/octet-stream';
    if (mediaPath) {
      if (!fs.existsSync(mediaPath)) {
        const error = new Error('Video file not found.');
        error.statusCode = 404;
        throw error;
      }
      const stats = fs.statSync(mediaPath);
      size = stats.size;
      contentType = record.video.videoUrl.endsWith('.webm') ? 'video/webm' : record.video.videoUrl.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
      stream = fs.createReadStream(mediaPath);
    } else {
      if (!isAllowedRemoteMediaUrl(record.video.videoUrl)) {
        const error = new Error('Video source host is not approved for secure streaming.');
        error.statusCode = 502;
        throw error;
      }
      const upstream = await fetch(record.video.videoUrl, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      if (!upstream.ok || !upstream.body) {
        const error = new Error('Unable to fetch the source video.');
        error.statusCode = 502;
        throw error;
      }
      size = Number(upstream.headers.get('content-length')) || 0;
      contentType = upstream.headers.get('content-type') || contentType;
      const { Readable } = await import('stream');
      stream = Readable.fromWeb(upstream.body);
    }

    const safeName = record.video.title.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'video';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.mp4"`);
    if (size) res.setHeader('Content-Length', String(size));
    record.status = 'started';
    record.fileSize = size;
    await record.save();
    stream.on('error', (error) => {
      console.error('[Downloads] File stream failed:', error.message);
      if (!res.headersSent) res.status(500).json({ success: false, message: 'The download stream failed.' });
      else res.destroy(error);
    });
    res.on('finish', () => {
      DownloadRecord.updateOne({ _id: record._id }, { $set: { status: 'complete', completedAt: new Date() } })
        .catch((error) => console.error('[Downloads] Could not record completion:', error.message));
    });
    res.on('close', () => {
      if (!res.writableFinished) {
        DownloadRecord.updateOne({ _id: record._id }, { $set: { status: 'interrupted' } })
          .catch((error) => console.error('[Downloads] Could not record interruption:', error.message));
      }
    });
    stream.pipe(res);
  } catch (error) {
    if (record && !res.headersSent && record.status === 'started') {
      record.status = 'failed';
      record.dedupeActive = false;
      await record.save().catch((saveError) => console.error('[Downloads] Could not record failed download:', saveError.message));
      await DownloadQuota.updateOne(
        { user: record.user, dayKey: record.dayKey, monthKey: record.monthKey, dailyCount: { $gt: 0 }, monthlyCount: { $gt: 0 } },
        { $inc: { dailyCount: -1, monthlyCount: -1 } }
      ).catch((quotaError) => console.error('[Downloads] Could not restore quota after failed transfer:', quotaError.message));
    }
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return res.status(504).json({ success: false, message: 'Source video timed out.' });
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

export const getDownloadHistory = async (req, res, next) => {
  try {
    const downloads = await DownloadRecord.find({ user: req.user._id })
      .sort({ requestedAt: -1 })
      .limit(100)
      .populate('video', 'title thumbnailUrl duration');
    const { dayKey, monthKey } = dateKeys();
    const usage = await DownloadQuota.findOne({ user: req.user._id, dayKey, monthKey });
    res.status(200).json({ success: true, downloads, quota: usage || { dailyCount: 0, monthlyCount: 0 } });
  } catch (error) {
    next(error);
  }
};
