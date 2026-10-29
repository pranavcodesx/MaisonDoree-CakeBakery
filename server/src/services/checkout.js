import { z } from 'zod';
import { Cake } from '../models/Cake.js';
import { Coupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { HttpError, objectId } from './http.js';
import { unitPrice, WEIGHTS, BUILDER_OPTIONS, customPrice, isFixedSize, sizeLabel } from './pricing.js';

// a photo the server stored: either on its own disk or on Cloudinary
const photoUrl = z.string().refine(u => /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(u) || /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/\S+$/.test(u), 'Invalid photo.').optional();

// One cart line, exactly what the popup / builder collects.
export const cartItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('catalog'),
    cakeId: objectId, weight: z.string(), flavor: z.string().optional(),
    qty: z.number().int().min(1).max(20),
    message: z.string().trim().max(24).optional(),
    candle: z.string().trim().max(40).optional(),     // checked against the admin's list in loadLines
    knife: z.string().trim().max(40).optional(),
    photoUrl,
  }),
  z.object({
    kind: z.literal('custom'),
    qty: z.number().int().min(1).max(5),
    message: z.string().trim().max(24).optional(),
    photoUrl,
    custom: z.object({
      shape: z.enum(BUILDER_OPTIONS.shapes), layers: z.number().int().min(1).max(3),
      flavor: z.enum(BUILDER_OPTIONS.flavors), cream: z.enum(BUILDER_OPTIONS.creams),
      topper: z.enum(BUILDER_OPTIONS.toppers), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
  }),
]);

// Turn cart items into priced lines using DB prices (the client never decides what it pays).
export async function loadLines(items, settings) {
  if (!items?.length) throw new HttpError(400, 'Your cart is empty.');
  const ids = items.filter(i => i.kind === 'catalog').map(i => i.cakeId);
  const cakes = ids.length ? await Cake.find({ _id: { $in: ids }, active: true }) : [];
  const byId = new Map(cakes.map(c => [String(c._id), c]));

  return items.map(i => {
    if (i.kind === 'custom') {
      const c = i.custom;
      const shape = c.shape[0].toUpperCase() + c.shape.slice(1);
      return {
        kind: 'custom', category: 'designer', name: `Custom ${shape} Cake (${c.layers} tier)`,
        weight: '1 kg', flavor: c.flavor, qty: i.qty, message: i.message || '', photoUrl: i.photoUrl,
        unitPrice: customPrice(c, settings.builder), custom: { shape: c.shape, layers: c.layers, cream: c.cream, color: c.color, topper: c.topper },
      };
    }
    const cake = byId.get(String(i.cakeId));
    if (!cake) throw new HttpError(400, 'One of the cakes in your cart is no longer available.');
    const fixed = isFixedSize(cake);
    if (!fixed && !WEIGHTS.includes(i.weight)) throw new HttpError(400, `Invalid weight for ${cake.name}.`);
    const pick = (list, v, what) => { if (v == null || v === '') return list[0]; if (!list.includes(v)) throw new HttpError(400, `This ${what} choice is not available any more. Please choose again.`); return v; };
    return {
      kind: 'catalog', cake: cake._id, category: cake.category, name: cake.name, image: cake.images?.[0],
      weight: fixed ? sizeLabel(cake.weightG) : i.weight, flavor: i.flavor || cake.flavor, qty: i.qty,
      message: i.message || '', candle: pick(settings.content.personalize.candles, i.candle, 'candle'), knife: pick(settings.content.personalize.knives, i.knife, 'knife'), photoUrl: i.photoUrl,
      unitPrice: unitPrice(cake, i.weight),
    };
  });
}

// Validates a coupon code for this user + cart; throws HttpError with a friendly message.
export async function resolveCoupon(code, lines, user) {
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
  // switching a Spin & Win coupon off only stops new wins: whoever already won it can still use it
  const heldSpin = coupon?.code.startsWith('SPIN') && user?.spinCoupon === coupon.code;
  if (!coupon || (!coupon.active && !heldSpin)) throw new HttpError(400, 'This coupon code is not valid.');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new HttpError(400, 'This coupon has expired.');
  if (coupon.code.startsWith('SPIN') && user?.spinCoupon !== coupon.code) throw new HttpError(400, 'This coupon is not available on your account.');
  if (coupon.firstOrderOnly) {
    if (!user) throw new HttpError(400, 'Log in to use this coupon.');
    // an online order that was never paid (popup closed, payment failed) is not a real order, so it must not use up "first order"
    const unpaidOnline = { 'payment.method': 'online', 'payment.status': { $in: ['pending', 'failed'] } };
    if (await Order.exists({ user: user._id, status: { $ne: 'Cancelled' }, $nor: [unpaidOnline] })) throw new HttpError(400, 'This coupon is only for your first order.');
  }
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  if (coupon.min && subtotal < coupon.min) throw new HttpError(400, `Add items worth ₹${coupon.min} to use this coupon.`);
  if (coupon.categories?.length && !lines.some(l => coupon.categories.includes(l.category))) {
    throw new HttpError(400, `This coupon only applies to ${coupon.categories.join(' & ')} cakes.`);
  }
  return coupon;
}
