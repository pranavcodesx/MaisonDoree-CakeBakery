import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Cake } from '../models/Cake.js';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { Review } from '../models/Review.js';
import { requireAuth } from '../middleware/auth.js';
import { pointsSummary, tierFor } from '../services/rewards.js';
import { getSettings } from '../services/settings.js';
import { spinSegments } from '../services/spin.js';
import { wrap, parse, HttpError, normalizePhone, isEmail, objectId } from '../services/http.js';

const r = Router();
r.use(requireAuth);

r.put('/', wrap(async (req, res) => {
  const b = parse(z.object({
    name: z.string().trim().min(2, 'Please enter your full name.').max(80),
    email: z.string().trim().optional().default(''),
    phone: z.string().trim().optional().default(''),
  }), req.body);
  const email = b.email ? b.email.toLowerCase() : undefined;
  const phone = b.phone ? normalizePhone(b.phone) : undefined;
  if (email && !isEmail(email)) throw new HttpError(400, 'Enter a valid email address.', 'email');
  if (b.phone && !phone) throw new HttpError(400, 'Enter a valid 10-digit mobile number.', 'phone');
  if (!email && !phone) throw new HttpError(400, 'Keep at least an email or a phone number.');
  if (email && await User.exists({ email, _id: { $ne: req.user._id } })) throw new HttpError(409, 'This email is already used by another account.', 'email');
  if (phone && await User.exists({ phone, _id: { $ne: req.user._id } })) throw new HttpError(409, 'This phone is already used by another account.', 'phone');
  req.user.name = b.name;
  req.user.email = email;
  req.user.phone = phone;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}));

r.put('/password', wrap(async (req, res) => {
  const b = parse(z.object({ current: z.string().optional().default(''), next: z.string().min(8, 'Use at least 8 characters.').max(128) }), req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  // people who signed up with Google have no password yet, so they can simply set one
  if (user.passwordHash && !(await bcrypt.compare(b.current, user.passwordHash))) throw new HttpError(400, 'Current password is incorrect.', 'current');
  user.passwordHash = await bcrypt.hash(b.next, 12);
  user.hasPassword = true;
  await user.save();
  res.json({ ok: true });
}));

r.put('/notifications', wrap(async (req, res) => {
  const b = parse(z.object({ orderUpdates: z.boolean(), offers: z.boolean(), newArrivals: z.boolean(), whatsapp: z.boolean() }).partial(), req.body);
  Object.assign(req.user.notifPrefs, b);
  await req.user.save();
  res.json({ notifPrefs: req.user.notifPrefs });
}));

// ---- addresses ----
const addrSchema = z.object({
  label: z.string().trim().min(1, 'Please give this address a label.').max(30),
  line: z.string().trim().min(8, 'Please enter your full address.').max(300),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode.'),
  isDefault: z.boolean().optional(),
});
function applyDefault(user, addr) {
  if (addr.isDefault) user.addresses.forEach(a => { if (String(a._id) !== String(addr._id)) a.isDefault = false; });
  if (!user.addresses.some(a => a.isDefault) && user.addresses.length) user.addresses[0].isDefault = true;
}
r.post('/addresses', wrap(async (req, res) => {
  const b = parse(addrSchema, req.body);
  if (req.user.addresses.length >= 10) throw new HttpError(400, 'You can save up to 10 addresses.');
  if (!req.user.addresses.length) b.isDefault = true;
  req.user.addresses.push(b);
  const addr = req.user.addresses[req.user.addresses.length - 1];
  applyDefault(req.user, addr);
  await req.user.save();
  res.status(201).json({ addresses: req.user.addresses });
}));
r.put('/addresses/:id', wrap(async (req, res) => {
  const addr = req.user.addresses.id(req.params.id);
  if (!addr) throw new HttpError(404, 'Address not found.');
  addr.set(parse(addrSchema, req.body));
  applyDefault(req.user, addr);
  await req.user.save();
  res.json({ addresses: req.user.addresses });
}));
r.delete('/addresses/:id', wrap(async (req, res) => {
  const addr = req.user.addresses.id(req.params.id);
  if (!addr) throw new HttpError(404, 'Address not found.');
  addr.deleteOne();
  applyDefault(req.user, {});
  await req.user.save();
  res.json({ addresses: req.user.addresses });
}));

// ---- wishlist ----
r.get('/wishlist', wrap(async (req, res) => {
  const cakes = await Cake.find({ _id: { $in: req.user.wishlist }, active: true });
  res.json({ items: cakes });
}));
r.post('/wishlist/:cakeId', wrap(async (req, res) => {
  const id = parse(objectId, req.params.cakeId);
  if (!(await Cake.exists({ _id: id }))) throw new HttpError(404, 'Cake not found.');
  const has = req.user.wishlist.some(c => String(c) === id);
  req.user.wishlist = has ? req.user.wishlist.filter(c => String(c) !== id) : [...req.user.wishlist, id];
  await req.user.save();
  res.json({ wishlist: req.user.wishlist, added: !has });
}));

// ---- rewards: earned when an order is delivered, spent at checkout (rules are set in the admin panel) ----
r.get('/rewards', wrap(async (req, res) => {
  const S = await getSettings(); const R = S.rewards;
  const { orders, earned, redeemed, balance, redeemedOrders } = await pointsSummary(req.user._id);
  const delivered = orders.filter(o => o.status === 'Delivered');
  const spend = (await Order.find({ user: req.user._id, status: 'Delivered' }).select('totals.total').lean()).reduce((s, o) => s + o.totals.total, 0);
  const tier = tierFor(spend, S);
  const next = tier === 'Bronze' ? { tier: 'Silver', at: R.silverFrom } : tier === 'Silver' ? { tier: 'Gold', at: R.goldFrom } : null;
  res.json({
    points: balance, earned, redeemed, tier, spend,
    next: next && { tier: next.tier, remaining: Math.max(next.at - spend, 0) },
    rules: { earnPer100: R.earnPer100, pointValue: R.pointValue, minRedeem: R.minRedeem, maxPct: R.maxPct, silverFrom: R.silverFrom, goldFrom: R.goldFrom },
    totalOrders: await Order.countDocuments({ user: req.user._id, status: { $ne: 'Cancelled' } }),
    history: [
      ...delivered.filter(o => o.pointsAwarded).map(o => ({ type: 'earned', orderNum: o.orderNum, points: o.pointsAwarded, date: o.createdAt })),
      ...redeemedOrders.map(o => ({ type: 'redeemed', orderNum: o.orderNum, points: o.pointsRedeemed, date: o.createdAt })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)),
  });
}));

// ---- spin & win: one spin per account, decided on the server. The wheel is built from the SPIN… coupons in the admin panel ----
r.post('/spin', wrap(async (req, res) => {
  if (req.user.spinUsedAt) throw new HttpError(400, 'You have already used your spin.');
  const { enabled, segments } = await spinSegments();
  if (!enabled) throw new HttpError(400, 'Spin & Win is not running right now.');
  const index = Math.floor(Math.random() * segments.length);
  const prize = segments[index];
  req.user.spinUsedAt = new Date();
  req.user.spinCoupon = prize.code || undefined;
  await req.user.save();
  res.json({ index, prize, segments: segments.map(s => s.label) });
}));

// coupons this user can use right now (public ones + their spin prize)
r.get('/coupons', wrap(async (req, res) => {
  const now = new Date();
  const list = await Coupon.find({ active: true, code: { $not: /^SPIN/ }, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
  if (req.user.spinCoupon) {
    const spin = await Coupon.findOne({ code: req.user.spinCoupon });      // still theirs even if the owner has since switched it off
    if (spin) list.push(spin);
  }
  res.json({ items: list });
}));

r.get('/reviews', wrap(async (req, res) => {
  const items = await Review.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('cake', 'name images theme category').populate('order', 'orderNum');
  res.json({ items });
}));

export default r;
