import mongoose from 'mongoose';

const paymentRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['bronze', 'silver', 'gold'], required: true },
  period: { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true },
  orderId: { type: String, required: true, unique: true },
  paymentId: { type: String, default: '' },
  signature: { type: String, default: '' },
  invoiceNumber: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created', 'paid', 'failed', 'cancelled'], default: 'created' },
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  receiptEmailed: { type: Boolean, default: false },
}, { timestamps: true });

paymentRecordSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
paymentRecordSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('PaymentRecord', paymentRecordSchema);
