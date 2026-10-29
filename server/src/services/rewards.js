import { Order } from '../models/Order.js';

// Reward points: earned when an order is delivered, spent as a discount at checkout.
// All the numbers (points per ₹100, what a point is worth, tiers ...) are set by the owner in the admin panel (Settings).
export const pointsFor = (total, S) => Math.floor((total || 0) / 100) * S.rewards.earnPer100;
export const tierFor = (spend, S) => (spend >= S.rewards.goldFrom ? 'Gold' : spend >= S.rewards.silverFrom ? 'Silver' : 'Bronze');

// An online order that is still waiting for payment holds its points for an hour; a failed or abandoned one gives them back.
const HOLD_MS = 60 * 60 * 1000;
const holdsPoints = o => o.status !== 'Cancelled'
  && !(o.payment?.method === 'online' && (o.payment.status === 'failed' || (o.payment.status === 'pending' && Date.now() - new Date(o.createdAt) > HOLD_MS)));

export async function pointsSummary(userId) {
  const orders = await Order.find({ user: userId }).select('status pointsAwarded pointsRedeemed payment createdAt orderNum').sort({ createdAt: -1 }).lean();
  const earned = orders.reduce((s, o) => s + (o.status === 'Delivered' ? o.pointsAwarded || 0 : 0), 0);
  const redeemedOrders = orders.filter(o => o.pointsRedeemed > 0 && holdsPoints(o));
  const redeemed = redeemedOrders.reduce((s, o) => s + o.pointsRedeemed, 0);
  return { orders, earned, redeemed, balance: Math.max(earned - redeemed, 0), redeemedOrders };
}

// How many points (and how many rupees off) this customer can use on a cart worth `payable` rupees.
export function planRedemption(balance, S, payable) {
  const { pointValue, minRedeem, maxPct } = S.rewards;
  const discount = Math.min(Math.floor(payable * maxPct / 100), Math.floor(balance * pointValue));
  if (balance < minRedeem || discount <= 0) return { points: 0, discount: 0 };
  return { points: Math.ceil(discount / pointValue), discount };
}
