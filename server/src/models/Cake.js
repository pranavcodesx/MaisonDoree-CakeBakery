import mongoose from 'mongoose';

const cakeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, index: true },
  occasions: [String],
  flavor: String,
  price: { type: Number, required: true, min: 0 },   // price at its natural size (weightG)
  was: Number,                                        // strike-through price
  egg: { type: Boolean, default: true },              // true = contains egg
  tags: [String],
  theme: String,
  weightG: { type: Number, default: 1000 },
  desc: String,
  images: [String],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

cakeSchema.index({ name: 'text', flavor: 'text', tags: 'text' });
export const Cake = mongoose.model('Cake', cakeSchema);
