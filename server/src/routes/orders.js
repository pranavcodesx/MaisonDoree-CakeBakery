import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { Pincode } from '../models/Pincode.js';
import { User } from '../models/User.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, parse, HttpError, normalizePhone, isEmail, objectId } from '../services/http.js';
import { loadLines, resolveCoupon, cartItemSchema } from '../services/checkout.js';
import { computeTotals, istNow } from '../services/pricing.js';
import { getSettings } from '../services/settings.js';
import { pointsSummary, planRedemption } from '../services/rewards.js';
import { notifyOrder } from '../services/notify.js';
import { restoreSpinCoupon } from '../services/spin.js';

const r = Router();
r.use(requireAuth);

const razor = config.razorpay.keyId && config.razorpay.keySecret
  ? new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret }) : null;

const bodySchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Your cart is empty.').max(30),
  customer: z.object({
    name: z.string().trim().min(2, 'Please add your full name to continue.'),
    phone: z.string(), email: z.string().trim().optional().default(''),
  }),
  address: z.object({ label: z.string().trim().min(1).max(30), line: z.string().trim().min(8, 'Please enter your full address.'), pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode.') }),
  delivery: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), slot: z.string(), note: z.string().max(200).optional() }),
  paymentMethod: z.enum(['cod', 'online']),
  couponCode: z.string().optional(),
  usePoints: z.boolean().optional(),
});

async function newOrderNum() {
  for (let i = 0; i < 8; i++) {
    const num = 'MD-' + crypto.randomInt(100000, 1000000);
    if (!(await Order.exists({ orderNum: num }))) return num;
  }
  throw new HttpError(500, 'Could not generate an order number. Please try again.');
}

// Called once an order is confirmed (COD at placement, online after payment verifies).
export async function onConfirmed(order) {   // exported so the (commented-out) Razorpay webhook can reuse it
  notifyOrder(order, 'placed');
  if (order.couponCode?.startsWith('SPIN')) {
    await User.updateOne({ _id: order.user, spinCoupon: order.couponCode }, { $unset: { spinCoupon: 1 } });
  }
}

r.post('/', wrap(async (req, res) => {
  const b = parse(bodySchema, req.body);
  const S = await getSettings();

  const phone = normalizePhone(b.customer.phone);
  if (!phone) throw new HttpError(400, 'Please enter a valid phone number.', 'phone');
  if (b.customer.email && !isEmail(b.customer.email)) throw new HttpError(400, 'Please enter a valid email address.', 'email');

  const zone = await Pincode.findOne({ pincode: b.address.pincode, active: true });
  if (!zone) throw new HttpError(400, "We don't deliver to this pincode yet. Try a different address.", 'pincode');

  const now = istNow();
  const maxDate = new Date(`${now.date}T00:00:00Z`); maxDate.setUTCDate(maxDate.getUTCDate() + S.delivery.maxAdvanceDays);
  if (b.delivery.date < now.date || new Date(`${b.delivery.date}T00:00:00Z`) > maxDate) throw new HttpError(400, 'Please choose a valid delivery date.', 'date');
  if (b.delivery.date === now.date && now.hour >= S.delivery.cutoffHour) throw new HttpError(400, `Same-day delivery orders close at ${S.delivery.cutoffHour > 12 ? S.delivery.cutoffHour - 12 : S.delivery.cutoffHour} ${S.delivery.cutoffHour >= 12 ? 'PM' : 'AM'}. Pick tomorrow or later.`, 'date');
  if (!S.delivery.slots.includes(b.delivery.slot)) throw new HttpError(400, 'Please choose a delivery time slot.', 'slot');

  if (b.paymentMethod === 'online' && !razor) throw new HttpError(400, 'Online payment is not available right now. Please choose Cash on Delivery.');

  const lines = await loadLines(b.items, S);
  const coupon = b.couponCode ? await resolveCoupon(b.couponCode, lines, req.user) : null;
  let totals = computeTotals(lines, coupon, zone.deliveryCharge, S.tax.rate);
  let pointsRedeemed = 0;
  if (b.usePoints) {
    const plan = planRedemption((await pointsSummary(req.user._id)).balance, S, totals.subtotal - totals.discount);
    if (plan.points) { pointsRedeemed = plan.points; totals = computeTotals(lines, coupon, zone.deliveryCharge, S.tax.rate, plan.discount); }
  }
  if (b.paymentMethod === 'cod' && totals.total > S.delivery.codMax) throw new HttpError(400, `Cash on Delivery is available for orders up to ₹${S.delivery.codMax.toLocaleString('en-IN')}. Please pay online.`);

  const order = await Order.create({
    orderNum: await newOrderNum(),
    user: req.user._id,
    items: lines.map(({ category, ...l }) => l),   // keeps message, candle, knife, photo and custom-cake spec
    customer: { name: b.customer.name, phone, email: b.customer.email || req.user.email },
    address: b.address,
    delivery: { date: new Date(`${b.delivery.date}T00:00:00Z`), slot: b.delivery.slot, note: b.delivery.note },
    payment: { method: b.paymentMethod, status: b.paymentMethod === 'cod' ? 'cod' : 'pending' },
    totals, pointsRedeemed, couponCode: coupon?.code,
    statusHistory: [{ status: 'Order Placed' }],
  });

  if (b.paymentMethod === 'cod') {
    await onConfirmed(order);
    return res.status(201).json({ order });
  }

  const rp = await razor.orders.create({ amount: totals.total * 100, currency: 'INR', receipt: order.orderNum });
  order.payment.razorpayOrderId = rp.id;
  await order.save();
  res.status(201).json({ order, razorpay: { keyId: config.razorpay.keyId, orderId: rp.id, amount: rp.amount, currency: rp.currency } });
}));

r.post('/:orderNum/verify-payment', wrap(async (req, res) => {
  const b = parse(z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() }), req.body);
  const order = await Order.findOne({ orderNum: req.params.orderNum, user: req.user._id });
  if (!order || order.payment.razorpayOrderId !== b.razorpay_order_id) throw new HttpError(404, 'Order not found.');
  if (order.payment.status === 'paid') return res.json({ order });

  const expected = crypto.createHmac('sha256', config.razorpay.keySecret).update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`).digest('hex');
  const a = Buffer.from(expected), c = Buffer.from(b.razorpay_signature);
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) {
    order.payment.status = 'failed'; await order.save();
    throw new HttpError(400, 'Payment could not be verified. If money was deducted, it will be refunded automatically.');
  }
  order.payment.status = 'paid';
  order.payment.razorpayPaymentId = b.razorpay_payment_id;
  await order.save();
  await onConfirmed(order);
  res.json({ order });
}));

// A user's confirmed orders. Online orders that were never paid are hidden.
const visible = { $nor: [{ 'payment.method': 'online', 'payment.status': { $in: ['pending', 'failed'] } }] };

r.get('/', wrap(async (req, res) => {
  const items = await Order.find({ user: req.user._id, ...visible }).sort({ createdAt: -1 }).limit(100);
  const active = items.find(o => !['Delivered', 'Cancelled'].includes(o.status)) || null;
  res.json({ items, active });
}));

r.get('/:orderNum', wrap(async (req, res) => {
  const order = await Order.findOne({ orderNum: req.params.orderNum, user: req.user._id });
  if (!order) throw new HttpError(404, 'Order not found.');
  res.json({ order });
}));

r.post('/:orderNum/cancel', wrap(async (req, res) => {
  const order = await Order.findOne({ orderNum: req.params.orderNum, user: req.user._id });
  if (!order) throw new HttpError(404, 'Order not found.');
  if (!['Order Placed', 'Confirmed'].includes(order.status)) throw new HttpError(400, 'This order is already being baked and can no longer be cancelled. Please contact support.');
  order.status = 'Cancelled';
  order.statusHistory.push({ status: 'Cancelled' });
  if (order.payment.status === 'paid') order.payment.status = 'refund_pending';   // the owner refunds it from the admin panel
  await order.save();
  await restoreSpinCoupon(order);      // a cancelled order gives back its spin prize (reward points are freed automatically)
  notifyOrder(order, 'status');
  res.json({ order });
}));

export default r;
