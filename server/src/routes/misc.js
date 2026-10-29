import { Router } from 'express';
import { Coupon } from '../models/Coupon.js';
import { Pincode } from '../models/Pincode.js';
import { Review } from '../models/Review.js';
import { Cake } from '../models/Cake.js';
import { optionalAuth } from '../middleware/auth.js';
import { wrap, parse, HttpError, objectId } from '../services/http.js';
import { loadLines, resolveCoupon, cartItemSchema } from '../services/checkout.js';
import { computeTotals, istNow } from '../services/pricing.js';
import { getSettings, publicSettings } from '../services/settings.js';
import { pointsSummary, planRedemption } from '../services/rewards.js';
import { spinSegments } from '../services/spin.js';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';
import { Subscriber, Message } from '../models/Lead.js';
import rateLimit from 'express-rate-limit';
import { isEmail } from '../services/http.js';
import { z } from 'zod';

const r = Router();

r.get('/pincodes/:pin', wrap(async (req, res) => {
  if (!/^\d{6}$/.test(req.params.pin)) return res.json({ deliverable: false, message: 'Please enter a valid 6-digit pincode.' });
  const p = await Pincode.findOne({ pincode: req.params.pin, active: true });
  res.json(p ? { deliverable: true, deliveryCharge: p.deliveryCharge, area: p.area } : { deliverable: false, message: "We don't deliver to this pincode yet." });
}));

// offers shown on the home page (spin prizes are private to the user who won them)
r.get('/coupons', wrap(async (_req, res) => {
  const items = await Coupon.find({ active: true, code: { $not: /^SPIN/ }, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
  res.json({ items });
}));

// cart summary + coupon check using the real prices from the database
r.post('/cart/quote', optionalAuth, wrap(async (req, res) => {
  const b = parse(z.object({
    items: z.array(cartItemSchema).max(30),
    couponCode: z.string().optional(),
    pincode: z.string().regex(/^\d{6}$/).optional(),
    usePoints: z.boolean().optional(),
  }), req.body);
  const S = await getSettings();
  const lines = await loadLines(b.items, S);
  let coupon = null, couponError = null;
  if (b.couponCode) {
    try { coupon = await resolveCoupon(b.couponCode, lines, req.user); } catch (e) { couponError = e.message; }
  }
  const zone = b.pincode ? await Pincode.findOne({ pincode: b.pincode, active: true }) : null;
  const delivery = zone?.deliveryCharge ?? S.delivery.defaultCharge;
  let totals = computeTotals(lines, coupon, delivery, S.tax.rate);
  // reward points: tell a logged-in customer what they could use, and apply it when they switch it on
  let points = null;
  if (req.user) {
    const balance = (await pointsSummary(req.user._id)).balance;
    const plan = planRedemption(balance, S, totals.subtotal - totals.discount);
    points = { balance, canUse: plan.points, discount: plan.discount, applied: !!b.usePoints && plan.points > 0, minRedeem: S.rewards.minRedeem };
    if (points.applied) totals = computeTotals(lines, coupon, delivery, S.tax.rate, plan.discount);
  }
  res.json({ points, lines: lines.map(l => ({ kind: l.kind, cakeId: l.cake, name: l.name, weight: l.weight, qty: l.qty, unitPrice: l.unitPrice })), totals, coupon: coupon && { code: coupon.code, desc: coupon.desc }, couponError });
}));

r.get('/delivery/slots', wrap(async (_req, res) => {
  const S = await getSettings();
  const now = istNow();
  const days = [];
  for (let i = 0; i <= 4; i++) {
    const d = new Date(`${now.date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i);
    days.push({ date: d.toISOString().slice(0, 10), available: i > 0 || now.hour < S.delivery.cutoffHour });
  }
  res.json({ days, slots: S.delivery.slots, cutoffHour: S.delivery.cutoffHour, maxAdvanceDays: S.delivery.maxAdvanceDays });
}));

// store info, FAQs, team, builder prices, tax and delivery rules for the storefront
r.get('/settings/public', wrap(async (_req, res) => res.json({ ...publicSettings(await getSettings()), spinEnabled: (await spinSegments()).enabled })));

// the wheel's segments, built from the SPIN… coupons the owner has switched on
r.get('/spin/prizes', wrap(async (_req, res) => { const { enabled, segments } = await spinSegments(); res.json({ enabled, segments: segments.map(s => s.label) }); }));

r.get('/categories', wrap(async (_req, res) => {
  res.json({ items: await Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }) });
}));

// real reviews for the home page
r.get('/reviews/featured', wrap(async (_req, res) => {
  const items = await Review.find({ status: 'approved', rating: { $gte: 4 }, comment: { $exists: true, $ne: '' } }).sort({ createdAt: -1 }).limit(6).populate('user', 'name').populate('cake', 'name');
  res.json({ items: items.map(x => ({ id: x._id, name: x.user?.name || 'Customer', rating: x.rating, comment: x.comment, cake: x.cake?.name, date: x.createdAt })) });
}));

// Real numbers for the home/about pages (no hard-coded "12,000 orders").
r.get('/reviews/summary', wrap(async (_req, res) => {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  await Promise.all([1, 2, 3, 4, 5].map(async n => { dist[n] = await Review.countDocuments({ status: 'approved', rating: n }); }));
  const count = Object.values(dist).reduce((a, b) => a + b, 0);
  const avg = count ? Object.entries(dist).reduce((s, [k, n]) => s + k * n, 0) / count : 0;
  res.json({ count, avg: Math.round(avg * 10) / 10, distribution: dist });
}));

r.get('/stats/public', wrap(async (_req, res) => {
  res.json({ deliveredOrders: await Order.countDocuments({ status: 'Delivered' }) });
}));

const formLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } });

r.post('/newsletter', formLimit, wrap(async (req, res) => {
  const { email } = parse(z.object({ email: z.string().trim().toLowerCase().refine(isEmail, 'Enter a valid email address.') }), req.body);
  await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
  res.status(201).json({ ok: true });
}));

r.post('/contact', formLimit, wrap(async (req, res) => {
  const b = parse(z.object({
    name: z.string().trim().min(2, 'Please enter your name.').max(80),
    email: z.string().trim().toLowerCase().refine(isEmail, 'Enter a valid email address.'),
    phone: z.string().trim().max(20).optional(),
    subject: z.string().trim().max(80).optional(),
    message: z.string().trim().min(5, 'Please write a short message.').max(2000),
  }), req.body);
  await Message.create(b);
  res.status(201).json({ ok: true });
}));

export default r;
