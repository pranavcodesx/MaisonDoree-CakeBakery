import mongoose from 'mongoose';

const pincodeSchema = new mongoose.Schema({
  pincode: { type: String, required: true, unique: true, match: /^\d{6}$/ },
  area: String,
  deliveryCharge: { type: Number, default: 49 },
  active: { type: Boolean, default: true },
});

export const Pincode = mongoose.model('Pincode', pincodeSchema);
