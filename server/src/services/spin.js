import { Coupon } from '../models/Coupon.js';
import { User } from '../models/User.js';

// The Spin & Win wheel is built from the coupons the owner created: every ACTIVE coupon whose code starts with "SPIN"
// is a prize. Switch one off in the admin panel and it leaves the wheel; people who already won it can still use it.
const label = c => (c.pct ? `${c.pct}% OFF` : `₹${c.flat} OFF`);

export async function spinSegments() {
  const coupons = await Coupon.find({ active: true, code: /^SPIN/, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).sort({ code: 1 }).limit(4);
  if (!coupons.length) return { enabled: false, segments: [] };
  const size = Math.max(6, coupons.length * 3);
  let n = 0;
  const segments = Array.from({ length: size }, (_, i) => (i % 3 === 1 ? { label: 'Try Again', code: null } : (c => ({ label: label(c), code: c.code }))(coupons[n++ % coupons.length])));
  return { enabled: true, segments };
}

// If an order that used a spin prize is cancelled, the prize goes back to the customer (unless they won another since).
export async function restoreSpinCoupon(order) {
  if (order.couponCode?.startsWith('SPIN')) await User.updateOne({ _id: order.user, spinCoupon: null }, { $set: { spinCoupon: order.couponCode } });
}
