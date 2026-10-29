import { Router } from 'express';
import { z } from 'zod';
import { Order, ORDER_STATUSES } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { wrap, parse, HttpError } from '../../services/http.js';
import { visibleOrders as visible, dayStartIST, dayEndIST, deliveryDateValue, FLOW } from '../../services/orderQueries.js';
import { pointsFor } from '../../services/rewards.js';
import { getSettings } from '../../services/settings.js';
import { notifyOrder } from '../../services/notify.js';
import { restoreSpinCoupon } from '../../services/spin.js';

const r = Router();
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

function baseFilter(q) {
  const f = { ...visible };
  if (q.kind === 'custom') f['items.kind'] = 'custom';
  if (['cod', 'online'].includes(q.method)) f['payment.method'] = q.method;
  if (q.paymentStatus) f['payment.status'] = String(q.paymentStatus);
  if (isDay(q.deliveryDate)) f['delivery.date'] = deliveryDateValue(q.deliveryDate);
  if (isDay(q.from) || isDay(q.to)) f.createdAt = { ...(isDay(q.from) && { $gte: dayStartIST(q.from) }), ...(isDay(q.to) && { $lte: dayEndIST(q.to) }) };
  if (q.q) { const re = new RegExp(esc(String(q.q).trim().slice(0, 40)), 'i'); f.$or = [{ orderNum: re }, { 'customer.name': re }, { 'customer.phone': re }, { 'customer.email': re }]; }
  return f;
}

r.get('/orders', wrap(async (req, res) => {
  const base = baseFilter(req.query);
  const f = { ...base };
  if (ORDER_STATUSES.includes(req.query.status)) f.status = req.query.status;
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(50, Math.max(5, Number(req.query.limit) || 15));
  const [items, total, counts] = await Promise.all([
    Order.find(f).select('+adminNote').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(f),
    Promise.all(ORDER_STATUSES.map(async s => [s, await Order.countDocuments({ ...base, status: s })])),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit), counts: Object.fromEntries(counts) });
}));

r.get('/orders/:orderNum', wrap(async (req, res) => {
  const order = await Order.findOne({ orderNum: req.params.orderNum }).select('+adminNote').lean();
  if (!order) throw new HttpError(404, 'Order not found.');
  const customer = await User.findById(order.user).select('name email phone createdAt notifPrefs').lean();
  const orderCount = await Order.countDocuments({ user: order.user, ...visible });
  res.json({ order, customer: customer && { ...customer, orderCount } });
}));

r.patch('/orders/:orderNum/status', wrap(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(ORDER_STATUSES) }), req.body);
  const order = await Order.findOne({ orderNum: req.params.orderNum });
  if (!order) throw new HttpError(404, 'Order not found.');
  if (['Delivered', 'Cancelled'].includes(order.status)) throw new HttpError(400, `This order is already ${order.status.toLowerCase()} and can't be changed.`);
  if (status === order.status) throw new HttpError(400, `The order is already "${status}".`);

  if (status === 'Cancelled') {
    order.status = 'Cancelled'; order.statusHistory.push({ status });
    if (order.payment.status === 'paid') order.payment.status = 'refund_pending';   // money must go back to the customer
  } else {
    const from = FLOW.indexOf(order.status), to = FLOW.indexOf(status);
    if (to <= from) throw new HttpError(400, 'Orders can only move forward. Use Cancel to stop an order.');
    const now = new Date();
    for (const s of FLOW.slice(from + 1, to + 1)) order.statusHistory.push({ status: s, at: now });   // keeps the customer's tracker complete if a step is skipped
    order.status = status;
    if (status === 'Delivered') {
      order.pointsAwarded = pointsFor(order.totals.total, await getSettings());
      if (order.payment.method === 'cod') order.payment.status = 'paid';   // cash collected on delivery
    }
  }
  await order.save();
  if (status === 'Cancelled') await restoreSpinCoupon(order);
  notifyOrder(order, 'status');
  res.json({ order });
}));

r.patch('/orders/:orderNum/payment', wrap(async (req, res) => {
  const { status } = parse(z.object({ status: z.literal('refunded') }), req.body);
  const order = await Order.findOne({ orderNum: req.params.orderNum });
  if (!order) throw new HttpError(404, 'Order not found.');
  if (order.payment.status !== 'refund_pending') throw new HttpError(400, 'No refund is pending for this order.');
  order.payment.status = status; await order.save();
  res.json({ order });
}));

r.patch('/orders/:orderNum/note', wrap(async (req, res) => {
  const { note } = parse(z.object({ note: z.string().trim().max(500) }), req.body);
  const order = await Order.findOneAndUpdate({ orderNum: req.params.orderNum }, { adminNote: note }, { new: true }).select('+adminNote');
  if (!order) throw new HttpError(404, 'Order not found.');
  res.json({ order });
}));

// ---------- payments (derived from orders) ----------
r.get('/payments', wrap(async (req, res) => {
  const f = { ...visible };
  if (['cod', 'online'].includes(req.query.method)) f['payment.method'] = req.query.method;
  if (req.query.status) f['payment.status'] = String(req.query.status);
  if (req.query.q) { const re = new RegExp(esc(String(req.query.q).slice(0, 40)), 'i'); f.$or = [{ orderNum: re }, { 'customer.name': re }]; }
  const page = Math.max(1, Number(req.query.page) || 1), limit = 15;
  const all = await Order.find(visible).select('payment totals.total status').lean();
  const tot = fn => all.filter(fn).reduce((s, o) => s + o.totals.total, 0);
  const cnt = fn => all.filter(fn).length;
  const summary = {
    onlinePaid: tot(o => o.payment.method === 'online' && o.payment.status === 'paid' && o.status !== 'Cancelled'),
    codCollected: tot(o => o.payment.method === 'cod' && o.payment.status === 'paid'),
    codToCollect: tot(o => o.payment.method === 'cod' && o.payment.status === 'cod' && o.status !== 'Cancelled'),
    refundPending: tot(o => o.payment.status === 'refund_pending'), refundPendingCount: cnt(o => o.payment.status === 'refund_pending'),
    refunded: tot(o => o.payment.status === 'refunded'),
  };
  const [items, total] = await Promise.all([
    Order.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('orderNum customer.name totals.total payment status createdAt').lean(),
    Order.countDocuments(f),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit), summary });
}));

export default r;
