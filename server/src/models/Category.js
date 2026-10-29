import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },  // never changes: cakes point to it
  name: { type: String, required: true, trim: true, maxlength: 40 },
  emoji: { type: String, default: '🎂', maxlength: 8 },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);
