import { Router } from 'express';
import { Order, ORDER_STATUSES } from '../../models/Order.js';
import { Cake } from '../../models/Cake.js';
import { User } from '../../models/User.js';
import { Review } from '../../models/Review.js';
import { Message, Subscriber } from '../../models/Lead.js';
import { wrap } from '../../services/http.js';
import { istNow } from '../../services/pricing.js';
import { sendCsv } from '../../services/csv.js';
import { visibleOrders as visible, istDay, dayStartIST, dayEndIST, shiftDay, deliveryDateValue, customerStats, itemText } from '../../services/orderQueries.js';

const r = Router();
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sum = list => list.reduce((s, o) => s + o.totals.total, 0);
const pctChange = (c, p) => (p === 0 ? null : Math.round(((c - p) / p) * 100));
const money = n => '₹' + Math.round(n).toLocaleString('en-IN');

function topCakes(orders, limit) {
  const m = new Map();
  for (const o of orders) for (const it of o.items) {
    const k = it.cake ? String(it.cake) : `custom:${it.name}`;
    const e = m.get(k) || { name: it.kind === 'custom' ? 'Custom-built cakes' : it.name, cakeId: it.cake || null, qty: 0, revenue: 0 };
    e.qty += it.qty; e.revenue += it.unitPrice * it.qty; m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

r.get('/dashboard', wrap(async (req, res) => {
  const days = Number(req.query.days) === 30 ? 30 : 7;
  const today = istNow().date;
  const curStart = shiftDay(today, -(days - 1)), prevStart = shiftDay(today, -(days * 2 - 1)), prevEnd = shiftDay(today, -days);

  const recentOrders = await Order.find({ ...visible, createdAt: { $gte: dayStartIST(prevStart) } }).select('createdAt status totals').lean();
  const live = recentOrders.filter(o => o.status !== 'Cancelled');
  const within = (o, a, b) => { const d = istDay(o.createdAt); return d >= a && d <= b; };
  const cur = live.filter(o => within(o, curStart, today)), prev = live.filter(o => within(o, prevStart, prevEnd));

  const labels = [], ordersSeries = [], revenueSeries = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = shiftDay(today, -i); const dayOrders = live.filter(o => istDay(o.createdAt) === d);
    labels.push(d); ordersSeries.push(dayOrders.length); revenueSeries.push(sum(dayOrders));
  }

  const [ordersTotal, customers, revenueAgg, statusCounts, monthOrders, latest, lowRated, unread, tomorrowStr] = await Promise.all([
    Order.countDocuments(visible),
    User.countDocuments({ role: 'user' }),
    Order.aggregate([{ $match: { ...visible, status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: '$totals.total' } } }]),
    Promise.all(ORDER_STATUSES.map(async s => [s, await Order.countDocuments({ ...visible, status: s })])),
    Order.find({ ...visible, status: { $ne: 'Cancelled' }, createdAt: { $gte: dayStartIST(shiftDay(today, -29)) } }).select('items').lean(),
    Order.find(visible).sort({ createdAt: -1 }).limit(6).select('orderNum customer totals status createdAt items').lean(),
    Cake.find({ active: true, reviewCount: { $gte: 3 }, rating: { $lt: 3.5 } }).select('name rating reviewCount').limit(3).lean(),
    Message.countDocuments({ handled: false }),
    Promise.resolve(shiftDay(today, 1)),
  ]);
  const byStatus = Object.fromEntries(statusCounts);
  const upcoming = await Order.countDocuments({ ...visible, status: { $nin: ['Delivered', 'Cancelled'] }, 'delivery.date': { $gte: deliveryDateValue(today), $lte: deliveryDateValue(tomorrowStr) } });
  const todayOrders = live.filter(o => istDay(o.createdAt) === today);

  const top = topCakes(monthOrders, 5);
  const cakeDocs = await Cake.find({ _id: { $in: top.map(t => t.cakeId).filter(Boolean) } }).select('images category theme name').lean();
  const cakeMap = new Map(cakeDocs.map(c => [String(c._id), c]));
  const topWithImg = top.map(t => ({ ...t, cake: t.cakeId ? cakeMap.get(String(t.cakeId)) || null : null }));

  const oc = pctChange(cur.length, prev.length), rc = pctChange(sum(cur), sum(prev));
  const insights = [];
  if (byStatus['Order Placed'] > 0) insights.push({ tone: 'alert', icon: 'clock', text: `${byStatus['Order Placed']} new order${byStatus['Order Placed'] > 1 ? 's are' : ' is'} waiting for confirmation.` });
  if (upcoming > 0) insights.push({ tone: 'info', icon: 'truck', text: `${upcoming} order${upcoming > 1 ? 's are' : ' is'} scheduled for delivery today or tomorrow.` });
  if (rc !== null) insights.push({ tone: rc >= 0 ? 'good' : 'warn', icon: 'trend', text: `Sales are ${rc >= 0 ? 'up' : 'down'} ${Math.abs(rc)}% compared with the previous ${days} days.` });
  if (topWithImg[0]) insights.push({ tone: 'good', icon: 'star', text: `${topWithImg[0].name} is your top seller in the last 30 days (${topWithImg[0].qty} sold, ${money(topWithImg[0].revenue)}).` });
  if (unread > 0) insights.push({ tone: 'info', icon: 'mail', text: `${unread} customer message${unread > 1 ? 's' : ''} ${unread > 1 ? 'are' : 'is'} waiting for a reply.` });
  for (const c of lowRated) insights.push({ tone: 'warn', icon: 'alert', text: `${c.name} has a low rating (${c.rating}★ from ${c.reviewCount} reviews). Worth a look.` });

  res.json({
    days, ordersTotal, customers, revenueTotal: revenueAgg[0]?.total || 0, byStatus,
    period: { orders: cur.length, revenue: sum(cur), ordersChange: oc, revenueChange: rc },
    today: { orders: todayOrders.length, revenue: sum(todayOrders) },
    chart: { labels, orders: ordersSeries, revenue: revenueSeries },
    topCakes: topWithImg, recent: latest, insights, upcoming,
  });
}));

// bell + sidebar badge, polled by the admin app
r.get('/notifications', wrap(async (req, res) => {
  const since = req.query.since && !Number.isNaN(Date.parse(req.query.since)) ? new Date(req.query.since) : null;
  const [pending, unread, recent, fresh] = await Promise.all([
    Order.countDocuments({ ...visible, status: 'Order Placed' }),
    Message.countDocuments({ handled: false }),
    Order.find(visible).sort({ createdAt: -1 }).limit(5).select('orderNum customer.name totals.total status createdAt').lean(),
    since ? Order.find({ ...visible, createdAt: { $gt: since } }).sort({ createdAt: -1 }).limit(10).select('orderNum customer.name totals.total createdAt').lean() : Promise.resolve([]),
  ]);
  res.json({ pending, unreadMessages: unread, recent, fresh, now: new Date().toISOString() });
}));

r.get('/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40);
  if (q.length < 2) return res.json({ orders: [], cakes: [], customers: [] });
  const re = new RegExp(esc(q), 'i');
  const [orders, cakes, customers] = await Promise.all([
    Order.find({ ...visible, $or: [{ orderNum: re }, { 'customer.name': re }, { 'customer.phone': re }] }).sort({ createdAt: -1 }).limit(5).select('orderNum customer.name totals.total status').lean(),
    Cake.find({ $or: [{ name: re }, { flavor: re }] }).limit(5).select('name category price active images').lean(),
    User.find({ role: 'user', $or: [{ name: re }, { email: re }, { phone: re }] }).limit(5).select('name email phone').lean(),
  ]);
  res.json({ orders, cakes, customers });
}));

// ---------- reports ----------
function range(q) {
  const today = istNow().date;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(q.to || '') ? q.to : today;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(q.from || '') ? q.from : shiftDay(to, -29);
  return { from, to, filter: { ...visible, createdAt: { $gte: dayStartIST(from), $lte: dayEndIST(to) } } };
}

r.get('/reports/summary', wrap(async (req, res) => {
  const { from, to, filter } = range(req.query);
  const orders = await Order.find(filter).lean();
  const live = orders.filter(o => o.status !== 'Cancelled');
  const cakes = await Cake.find({ _id: { $in: [...new Set(live.flatMap(o => o.items.map(i => i.cake)).filter(Boolean))] } }).select('category').lean();
  const catOf = new Map(cakes.map(c => [String(c._id), c.category]));
  const byCategory = {};
  for (const o of live) for (const it of o.items) { const c = it.kind === 'custom' ? 'custom cakes' : catOf.get(String(it.cake)) || 'other'; byCategory[c] = (byCategory[c] || 0) + it.unitPrice * it.qty; }
  const delivered = orders.filter(o => o.status === 'Delivered');
  res.json({
    from, to, orders: orders.length, cancelled: orders.length - live.length, sales: sum(live), delivered: delivered.length, deliveredSales: sum(delivered),
    avgOrder: live.length ? Math.round(sum(live) / live.length) : 0,
    discounts: live.reduce((s, o) => s + o.totals.discount, 0), deliveryCharges: live.reduce((s, o) => s + o.totals.delivery, 0), tax: live.reduce((s, o) => s + o.totals.tax, 0),
    byPayment: { cod: sum(live.filter(o => o.payment.method === 'cod')), online: sum(live.filter(o => o.payment.method === 'online')) },
    byCategory: Object.entries(byCategory).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
    topCakes: topCakes(live, 10),
  });
}));

r.get('/reports/orders.csv', wrap(async (req, res) => {
  const { from, to, filter } = range(req.query);
  const orders = await Order.find(filter).select('+adminNote').sort({ createdAt: -1 }).lean();
  sendCsv(res, `orders_${from}_to_${to}.csv`,
    ['Order #', 'Placed on', 'Customer', 'Phone', 'Email', 'Items', 'Address', 'Pincode', 'Delivery date', 'Slot', 'Payment', 'Payment status', 'Subtotal', 'Discount', 'Delivery', 'Tax', 'Total', 'Coupon', 'Status', 'Customer note', 'Internal note'],
    orders.map(o => [o.orderNum, istDay(o.createdAt), o.customer.name, o.customer.phone, o.customer.email, o.items.map(itemText).join(' ;; '), `${o.address.label}: ${o.address.line}`, o.address.pincode,
      o.delivery.date.toISOString().slice(0, 10), o.delivery.slot, o.payment.method, o.payment.status, o.totals.subtotal, o.totals.discount, o.totals.delivery, o.totals.tax, o.totals.total, o.couponCode, o.status, o.delivery.note, o.adminNote]));
}));

r.get('/reports/cakes.csv', wrap(async (_req, res) => {
  const cakes = await Cake.find().sort({ category: 1, name: 1 }).lean();
  sendCsv(res, 'cakes.csv', ['Name', 'Category', 'Flavor', 'Price', 'Original price', 'Eggless', 'Weight (g)', 'Tags', 'Occasions', 'Rating', 'Reviews', 'Images', 'Active'],
    cakes.map(c => [c.name, c.category, c.flavor, c.price, c.was, c.egg ? 'No' : 'Yes', c.weightG, (c.tags || []).join(' '), (c.occasions || []).join(' '), c.rating, c.reviewCount, (c.images || []).length, c.active ? 'Yes' : 'Archived']));
}));

r.get('/reports/customers.csv', wrap(async (_req, res) => {
  const users = await User.find({ role: 'user' }).sort({ createdAt: -1 }).lean();
  const stats = await customerStats(users.map(u => u._id));
  sendCsv(res, 'customers.csv', ['Name', 'Email', 'Phone', 'Joined', 'Orders', 'Total spent', 'Points', 'Tier', 'Last order'],
    users.map(u => { const s = stats.get(String(u._id)); return [u.name, u.email, u.phone, istDay(u.createdAt), s.orders, s.spent, s.points, s.tier, s.lastOrderAt ? istDay(s.lastOrderAt) : '']; }));
}));

r.get('/reports/subscribers.csv', wrap(async (_req, res) => {
  const subs = await Subscriber.find().sort({ createdAt: -1 }).lean();
  sendCsv(res, 'newsletter_subscribers.csv', ['Email', 'Subscribed on'], subs.map(s => [s.email, istDay(s.createdAt)]));
}));

export default r;
