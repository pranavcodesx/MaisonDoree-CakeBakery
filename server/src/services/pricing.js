// Server-side pricing. The client never decides what it pays.
const WEIGHT_MULT = { '500 g': 0.6, '1 kg': 1, '1.5 kg': 1.45, '2 kg': 1.85, '3 kg': 2.7 };
const KG_TIER = { 1000: '1 kg', 1500: '1.5 kg', 2000: '2 kg', 3000: '3 kg' };

export const WEIGHTS = Object.keys(WEIGHT_MULT);

// Only cakes whose natural size is 1, 1.5, 2 or 3 kg can be bought in several sizes.
// Anything else (a 300 g cupcake box, a 900 g cheesecake) is sold as ONE fixed pack at its own price.
export const isFixedSize = cake => !KG_TIER[cake.weightG];
export const sizeLabel = g => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);

export function unitPrice(cake, weight) {
  if (isFixedSize(cake)) return cake.price;
  const base = KG_TIER[cake.weightG];
  return Math.round(cake.price * WEIGHT_MULT[weight] / WEIGHT_MULT[base]);
}

// Returns the discount (integer rupees) a coupon gives on these priced lines, or 0.
export function couponDiscount(coupon, lines, subtotal) {
  if (!coupon) return 0;
  if (coupon.min && subtotal < coupon.min) return 0;
  const base = coupon.categories?.length
    ? lines.filter(l => coupon.categories.includes(l.category)).reduce((s, l) => s + l.unitPrice * l.qty, 0)
    : subtotal;
  if (base <= 0) return 0;
  let d = 0;
  if (coupon.pct) d = Math.min(base * coupon.pct / 100, coupon.cap || Infinity);
  else if (coupon.flat) d = Math.min(coupon.flat, base);
  return Math.round(d);
}

export function computeTotals(lines, coupon, deliveryCharge, taxRatePct = 5, pointsDiscount = 0) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discount = couponDiscount(coupon, lines, subtotal);
  const tax = Math.round(subtotal * taxRatePct / 100);
  const afterCoupon = Math.max(subtotal - discount, 0);
  const pts = Math.min(Math.max(pointsDiscount, 0), afterCoupon);     // reward points can never push the price below zero
  const total = afterCoupon - pts + deliveryCharge + tax;
  return { subtotal, discount, pointsDiscount: pts, delivery: deliveryCharge, tax, total };
}

// Dates are handled as IST calendar days (YYYY-MM-DD).
export function istNow() {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return { date: ist.toISOString().slice(0, 10), hour: ist.getUTCHours() };
}

// ---- personalisation options (same choices as the product popup + Custom Cake Builder) ----
// Candle and knife choices are managed in the admin panel (Website → Cake personalisation); these are only the starting lists.
export const DEFAULT_CANDLES = ['Number Candle', 'Spiral Candles', 'No Candle'];
export const DEFAULT_KNIVES = ['Classic Knife', 'Gold-Edge Knife', 'No Knife'];
// The *choices* are fixed by the builder's drawings; the *prices* come from settings.
export const BUILDER_OPTIONS = {
  shapes: ['round', 'square', 'heart'],
  toppers: ['candles', 'cherries', 'gold', 'berries', 'none'],
  creams: ['Buttercream', 'Whipped Cream', 'Fondant', 'Ganache'],
  flavors: ['Chocolate', 'Vanilla', 'Red Velvet', 'Butterscotch', 'Fruit'],
};
export const customPrice = (c, builder) => builder.base[c.layers] + builder.topper[c.topper] + builder.cream[c.cream];
