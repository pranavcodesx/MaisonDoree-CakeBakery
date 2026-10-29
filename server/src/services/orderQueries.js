import { Order } from '../models/Order.js';
import { pointsFor, tierFor } from './rewards.js';
import { getSettings } from './settings.js';

// Online orders that were never paid are not real orders yet.
export const visibleOrders = { $nor: [{ 'payment.method': 'online', 'payment.status': { $in: ['pending', 'failed'] } }] };

// IST calendar-day helpers (the bakery works in IST, the database stores UTC).
export const istDay = d => new Date(new Date(d).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
export const dayStartIST = s => new Date(`${s}T00:00:00+05:30`);
export const dayEndIST = s => new Date(`${s}T23:59:59.999+05:30`);
export const shiftDay = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const deliveryDateValue = s => new Date(`${s}T00:00:00Z`);   // how delivery.date is stored by the checkout

export const FLOW = ['Order Placed', 'Confirmed', 'Baking', 'Decorating', 'Packed', 'Out for Delivery', 'Delivered'];

// orders / spend / points / tier for a list of customers
export async function customerStats(userIds) {
  const S = await getSettings();
  const orders = await Order.find({ user: { $in: userIds }, ...visibleOrders }).select('user totals.total status pointsAwarded pointsRedeemed createdAt').lean();
  const map = new Map(userIds.map(id => [String(id), { orders: 0, spent: 0, deliveredSpend: 0, points: 0, lastOrderAt: null }]));
  for (const o of orders) {
    const s = map.get(String(o.user)); if (!s || o.status === 'Cancelled') continue;
    s.orders += 1; s.spent += o.totals.total; s.points += (o.pointsAwarded || 0) - (o.pointsRedeemed || 0);
    if (o.status === 'Delivered') s.deliveredSpend += o.totals.total;
    if (!s.lastOrderAt || o.createdAt > s.lastOrderAt) s.lastOrderAt = o.createdAt;
  }
  for (const s of map.values()) s.tier = tierFor(s.deliveredSpend, S);
  return map;
}

// one line describing what was ordered, including personalisation (used in CSV exports)
export const itemText = it => [`${it.qty} x ${it.name}`, it.weight, it.flavor,
  it.custom?.shape ? `${it.custom.shape}/${it.custom.layers} tier/${it.custom.cream}/${it.custom.topper}/${it.custom.color}` : '',
  it.candle && `candle: ${it.candle}`, it.knife && `knife: ${it.knife}`, it.message && `message: "${it.message}"`, it.photoUrl && `photo: ${it.photoUrl}`,
].filter(Boolean).join(' | ');
