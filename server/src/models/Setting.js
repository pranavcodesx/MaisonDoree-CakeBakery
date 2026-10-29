import mongoose from 'mongoose';

// One document holding every setting the owner can change from the admin panel.
const settingSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

export const Setting = mongoose.model('Setting', settingSchema);
