import { Router } from 'express';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { Review } from '../../models/Review.js';
import { Message, Subscriber } from '../../models/Lead.js';
import { wrap, parse, HttpError, objectId } from '../../services/http.js';
import { refreshCakeRating } from '../reviews.js';
import { recipientsFor, sendAnnouncement } from '../../services/notify.js';
import { mailEnabled } from '../../services/mailer.js';
import { visibleOrders as visible, customerStats } from '../../services/orderQueries.js';

const r = Router();
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ======================= customers =======================
r.get('/customers', wrap(async (req, res) => {
  const f = { role: 'user' };
  if (req.query.q) { const re = new RegExp(esc(String(req.query.q).trim().slice(0, 40)), 'i'); f.$or = [{ name: re }, { email: re }, { phone: re }]; }
  const page = Math.max(1, Number(req.query.page) || 1), limit = 15;
  const [users, total] = await Promise.all([User.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(f)]);
  const stats = await customerStats(users.map(u => u._id));
  res.json({ items: users.map(u => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt, addresses: u.addresses?.length || 0, ...stats.get(String(u._id)) })), total, page, pages: Math.ceil(total / limit) });
}));

r.get('/customers/:id', wrap(async (req, res) => {
  const u = await User.findOne({ _id: parse(objectId, req.params.id), role: 'user' }).lean();
  if (!u) throw new HttpError(404, 'Customer not found.');
  const [orders, reviews, stats] = await Promise.all([
    Order.find({ user: u._id, ...visible }).sort({ createdAt: -1 }).limit(50).select('orderNum status totals.total createdAt items.name items.qty').lean(),
    Review.countDocuments({ user: u._id }),
    customerStats([u._id]),
  ]);
  const { passwordHash, ...safe } = u;
  res.json({ customer: { ...safe, ...stats.get(String(u._id)), reviews }, orders });
}));

// ======================= reviews =======================
r.get('/reviews', wrap(async (req, res) => {
  const f = {};
  if (['approved', 'hidden'].includes(req.query.status)) f.status = req.query.status;
  const page = Math.max(1, Number(req.query.page) || 1), limit = 12;
  const [items, total, approved, hidden] = await Promise.all([
    Review.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').populate('cake', 'name images category theme').populate('order', 'orderNum').lean(),
    Review.countDocuments(f), Review.countDocuments({ status: 'approved' }), Review.countDocuments({ status: 'hidden' }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit), counts: { approved, hidden } });
}));
r.patch('/reviews/:id', wrap(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['approved', 'hidden']) }), req.body);
  const review = await Review.findByIdAndUpdate(parse(objectId, req.params.id), { status }, { new: true });
  if (!review) throw new HttpError(404, 'Review not found.');
  await refreshCakeRating(review.cake);   // hidden reviews don't count towards the cake's stars
  res.json({ review });
}));
r.delete('/reviews/:id', wrap(async (req, res) => {
  const review = await Review.findByIdAndDelete(parse(objectId, req.params.id));
  if (!review) throw new HttpError(404, 'Review not found.');
  await refreshCakeRating(review.cake);
  res.json({ ok: true });
}));

// ======================= inbox: contact-form messages + newsletter =======================
r.get('/messages', wrap(async (req, res) => {
  const f = req.query.handled === 'true' ? { handled: true } : req.query.handled === 'false' ? { handled: false } : {};
  const page = Math.max(1, Number(req.query.page) || 1), limit = 15;
  const [items, total, open] = await Promise.all([
    Message.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Message.countDocuments(f), Message.countDocuments({ handled: false }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit), open });
}));
r.patch('/messages/:id', wrap(async (req, res) => {
  const { handled } = parse(z.object({ handled: z.boolean() }), req.body);
  const item = await Message.findByIdAndUpdate(parse(objectId, req.params.id), { handled }, { new: true });
  if (!item) throw new HttpError(404, 'Message not found.');
  res.json({ item });
}));
r.delete('/messages/:id', wrap(async (req, res) => { await Message.findByIdAndDelete(parse(objectId, req.params.id)); res.json({ ok: true }); }));

r.get('/subscribers', wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = 25;
  const [items, total] = await Promise.all([Subscriber.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Subscriber.countDocuments()]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));
r.delete('/subscribers/:id', wrap(async (req, res) => { await Subscriber.findByIdAndDelete(parse(objectId, req.params.id)); res.json({ ok: true }); }));

// ---- announcements: an offer / new-arrival e-mail to the customers who chose to get them ----
r.get('/announcements/audience', wrap(async (_req, res) => {
  const [offers, newArrivals] = await Promise.all([recipientsFor('offers'), recipientsFor('newArrivals')]);
  res.json({ offers: offers.length, newArrivals: newArrivals.length, emailReady: mailEnabled() });
}));
r.post('/announcements', wrap(async (req, res) => {
  const b = parse(z.object({
    audience: z.enum(['offers', 'newArrivals']),
    subject: z.string().trim().min(3, 'Write a subject.').max(120),
    message: z.string().trim().min(10, 'Write a message (at least a sentence).').max(3000),
  }), req.body);
  if (!mailEnabled()) throw new HttpError(400, 'E-mail is not set up yet. Add the SMTP settings (see README → Forgot password) and restart the server.');
  res.json(await sendAnnouncement(b));
}));

export default r;
