import mongoose from 'mongoose';

export const ORDER_STATUSES = ['Order Placed', 'Confirmed', 'Baking', 'Decorating', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

const itemSchema = new mongoose.Schema({
  kind: { type: String, enum: ['catalog', 'custom'], default: 'catalog' },
  cake: { type: mongoose.Schema.Types.ObjectId, ref: 'Cake' },   // empty for custom-built cakes
  name: String,             // snapshot, so old orders survive cake edits
  image: String,
  weight: String,
  flavor: String,
  qty: { type: Number, min: 1, max: 20 },
  unitPrice: Number,
  message: String,          // text on the cake
  candle: String,
  knife: String,
  photoUrl: String,         // reference photo uploaded by the customer (photo cakes / custom cakes)
  custom: {                 // only for kind === 'custom' (Custom Cake Builder)
    shape: String, layers: Number, cream: String, color: String, topper: String,
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNum: { type: String, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [itemSchema],
  customer: { name: String, phone: String, email: String },
  address: { label: String, line: String, pincode: String },
  delivery: { date: Date, slot: String, note: String },
  payment: {
    method: { type: String, enum: ['cod', 'online'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cod', 'refund_pending', 'refunded'], default: 'pending' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  totals: { subtotal: Number, discount: Number, pointsDiscount: { type: Number, default: 0 }, delivery: Number, tax: Number, total: Number },
  pointsRedeemed: { type: Number, default: 0 },   // reward points spent on this order
  couponCode: String,
  status: { type: String, enum: ORDER_STATUSES, default: 'Order Placed', index: true },
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, _id: false }],
  pointsAwarded: { type: Number, default: 0 },
  adminNote: { type: String, select: false },   // internal: never sent to customers unless a query asks for '+adminNote'
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);
