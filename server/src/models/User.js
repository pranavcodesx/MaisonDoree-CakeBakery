import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  line: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, match: /^\d{6}$/ },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
  phone: { type: String, trim: true, unique: true, sparse: true },
  passwordHash: { type: String, default: '', select: false },     // empty for people who only use Google sign-in
  hasPassword: { type: Boolean, default: true },
  googleId: { type: String, unique: true, sparse: true },
  avatar: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  addresses: [addressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cake' }],
  notifPrefs: {
    orderUpdates: { type: Boolean, default: true },
    offers: { type: Boolean, default: true },
    newArrivals: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: true },
  },
  resetTokenHash: { type: String, select: false },    // password-reset link: only a fingerprint (sha256) of the token is stored
  resetExpires: { type: Date, select: false },
  passwordChangedAt: Date,                            // sessions started before this are logged out (set when a password is reset)
  spinUsedAt: Date,
  spinCoupon: String,
}, { timestamps: true });

userSchema.methods.toPublic = function () {
  return {
    id: this._id, name: this.name, email: this.email, phone: this.phone, role: this.role, avatar: this.avatar, hasPassword: this.hasPassword, googleLinked: !!this.googleId,
    addresses: this.addresses, wishlist: this.wishlist, notifPrefs: this.notifPrefs,
    spinUsed: !!this.spinUsedAt, createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
