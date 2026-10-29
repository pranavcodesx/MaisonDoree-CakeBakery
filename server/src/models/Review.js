import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cake: { type: mongoose.Schema.Types.ObjectId, ref: 'Cake', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['approved', 'hidden'], default: 'approved', index: true },   // admin can hide a review
}, { timestamps: true });

reviewSchema.index({ user: 1, order: 1, cake: 1 }, { unique: true });
export const Review = mongoose.model('Review', reviewSchema);
