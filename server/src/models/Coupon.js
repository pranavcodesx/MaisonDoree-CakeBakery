import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  desc: String,
  pct: Number,
  cap: Number,
  flat: Number,
  min: Number,
  categories: [String],
  firstOrderOnly: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  expiresAt: Date,
}, { timestamps: true });

export const Coupon = mongoose.model('Coupon', couponSchema);
