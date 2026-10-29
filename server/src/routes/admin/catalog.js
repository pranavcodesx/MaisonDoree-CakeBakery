import { Router } from 'express';
import { z } from 'zod';
import { Cake } from '../../models/Cake.js';
import { Category } from '../../models/Category.js';
import { Coupon } from '../../models/Coupon.js';
import { Pincode } from '../../models/Pincode.js';
import { Order } from '../../models/Order.js';
import { Review } from '../../models/Review.js';
import { User } from '../../models/User.js';
import { wrap, parse, HttpError, objectId } from '../../services/http.js';

const r = Router();
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

// ======================= cakes =======================
export const THEMES = ['chocolate', 'vanilla', 'redvelvet', 'fruit', 'pistachio', 'gold', 'blush', 'caramel'];
const imageUrl = z.string().refine(u => /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(u) || /^https:\/\/\S+$/.test(u), 'Invalid image address.');
const cakeSchema = z.object({
  name: z.string().trim().min(2, 'Enter the cake name.').max(80),
  category: z.string().min(1, 'Choose a category.'),
  occasions: z.array(z.string().regex(/^[a-z-]{2,30}$/)).max(14).default([]),
  flavor: z.string().trim().min(1, 'Enter the main flavor.').max(40),
  price: z.number({ error: 'Enter the price.' }).int().min(1, 'Enter the price.').max(100000),
  was: z.number().int().min(0).max(100000).nullable().optional(),
  egg: z.boolean(),
  tags: z.array(z.string().regex(/^[a-z-]{2,20}$/)).max(8).default([]),
  theme: z.enum(THEMES).default('chocolate'),
  weightG: z.number().int().min(100).max(10000).default(1000),
  desc: z.string().trim().max(600).default(''),
  images: z.array(imageUrl).max(5, 'Add up to 5 photos.').default([]),
  active: z.boolean().default(true),
}).refine(c => !c.was || c.was > c.price, { message: 'The original price must be higher than the selling price.', path: ['was'] });

async function checkCategory(slug) {
  if (!(await Category.exists({ slug }))) throw new HttpError(400, 'That category does not exist.', 'category');
}

r.get('/cakes', wrap(async (req, res) => {
  const f = {};
  if (req.query.status === 'archived') f.active = false; else if (req.query.status !== 'all') f.active = true;
  if (req.query.category) f.category = String(req.query.category);
  if (req.query.q) { const re = new RegExp(esc(String(req.query.q).slice(0, 40)), 'i'); f.$or = [{ name: re }, { flavor: re }]; }
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(60, Number(req.query.limit) || 12);
  const [items, total, active, archived] = await Promise.all([
    Cake.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Cake.countDocuments(f), Cake.countDocuments({ active: true }), Cake.countDocuments({ active: false }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit), counts: { active, archived } });
}));

r.post('/cakes', wrap(async (req, res) => {
  const b = parse(cakeSchema, req.body); await checkCategory(b.category);
  res.status(201).json({ item: await Cake.create({ ...b, was: b.was || undefined }) });
}));
r.put('/cakes/:id', wrap(async (req, res) => {
  const b = parse(cakeSchema, req.body); await checkCategory(b.category);
  const item = await Cake.findByIdAndUpdate(parse(objectId, req.params.id), { ...b, was: b.was || undefined }, { new: true, runValidators: true });
  if (!item) throw new HttpError(404, 'Cake not found.');
  res.json({ item });
}));
r.patch('/cakes/:id', wrap(async (req, res) => {   // archive / restore
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  const item = await Cake.findByIdAndUpdate(parse(objectId, req.params.id), { active }, { new: true });
  if (!item) throw new HttpError(404, 'Cake not found.');
  res.json({ item });
}));
r.post('/cakes/:id/duplicate', wrap(async (req, res) => {
  const c = await Cake.findById(parse(objectId, req.params.id)).lean();
  if (!c) throw new HttpError(404, 'Cake not found.');
  const { _id, createdAt, updatedAt, __v, rating, reviewCount, ...rest } = c;
  res.status(201).json({ item: await Cake.create({ ...rest, name: `${c.name} (Copy)`.slice(0, 80), active: false }) });
}));
r.delete('/cakes/:id', wrap(async (req, res) => {
  const id = parse(objectId, req.params.id);
  if (await Order.exists({ 'items.cake': id })) throw new HttpError(409, 'This cake has been ordered before, so it can only be archived (its order history stays intact).');
  const gone = await Cake.findByIdAndDelete(id);
  if (!gone) throw new HttpError(404, 'Cake not found.');
  await Promise.all([Review.deleteMany({ cake: id }), User.updateMany({ wishlist: id }, { $pull: { wishlist: id } })]);
  res.json({ ok: true });
}));

// ======================= categories =======================
const catSchema = z.object({
  name: z.string().trim().min(2, 'Enter a category name.').max(40),
  emoji: z.string().trim().min(1).max(8).default('🎂'),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});
r.get('/categories', wrap(async (_req, res) => {
  const cats = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await Promise.all(cats.map(c => Cake.countDocuments({ category: c.slug })));
  res.json({ items: cats.map((c, i) => ({ ...c, cakeCount: counts[i] })) });
}));
r.post('/categories', wrap(async (req, res) => {
  const b = parse(catSchema, req.body);
  const slug = slugify(b.name);
  if (!slug) throw new HttpError(400, 'Use letters or numbers in the name.', 'name');
  if (await Category.exists({ slug })) throw new HttpError(409, 'A category with this name already exists.', 'name');
  res.status(201).json({ item: await Category.create({ ...b, slug }) });
}));
r.put('/categories/:id', wrap(async (req, res) => {
  const b = parse(catSchema, req.body);
  const item = await Category.findByIdAndUpdate(parse(objectId, req.params.id), b, { new: true });
  if (!item) throw new HttpError(404, 'Category not found.');
  res.json({ item });
}));
r.delete('/categories/:id', wrap(async (req, res) => {
  const cat = await Category.findById(parse(objectId, req.params.id));
  if (!cat) throw new HttpError(404, 'Category not found.');
  const n = await Cake.countDocuments({ category: cat.slug });
  if (n) throw new HttpError(409, `${n} cake${n > 1 ? 's use' : ' uses'} this category. Move them to another category first, or hide this category instead.`);
  await cat.deleteOne(); res.json({ ok: true });
}));

// ======================= coupons =======================
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, 'Use 3–20 letters or numbers, no spaces.'),
  desc: z.string().trim().max(120).default(''),
  type: z.enum(['pct', 'flat']),
  value: z.number({ error: 'Enter the discount.' }).positive('Enter the discount.'),
  cap: z.number().min(0).nullable().optional(),
  min: z.number().min(0).nullable().optional(),
  categories: z.array(z.string()).default([]),
  firstOrderOnly: z.boolean().default(false),
  active: z.boolean().default(true),
  expiresAt: z.string().nullable().optional(),
}).superRefine((c, ctx) => {
  if (c.type === 'pct' && c.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percentage cannot be more than 100.' });
  if (c.expiresAt && Number.isNaN(Date.parse(c.expiresAt))) ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Enter a valid date.' });
});
const toCoupon = b => ({ code: b.code, desc: b.desc, pct: b.type === 'pct' ? b.value : undefined, flat: b.type === 'flat' ? b.value : undefined, cap: b.type === 'pct' && b.cap ? b.cap : undefined, min: b.min || undefined, categories: b.categories, firstOrderOnly: b.firstOrderOnly, active: b.active, expiresAt: b.expiresAt ? new Date(b.expiresAt) : null });

r.get('/coupons', wrap(async (_req, res) => {
  const items = await Coupon.find().sort({ createdAt: -1 }).lean();
  const used = await Promise.all(items.map(c => Order.countDocuments({ couponCode: c.code, status: { $ne: 'Cancelled' } })));
  res.json({ items: items.map((c, i) => ({ ...c, used: used[i] })) });
}));
r.post('/coupons', wrap(async (req, res) => {
  const b = parse(couponSchema, req.body);
  if (await Coupon.exists({ code: b.code })) throw new HttpError(409, 'This coupon code already exists.', 'code');
  res.status(201).json({ item: await Coupon.create(toCoupon(b)) });
}));
r.put('/coupons/:id', wrap(async (req, res) => {
  const b = parse(couponSchema, req.body);
  const cur = await Coupon.findById(parse(objectId, req.params.id));
  if (!cur) throw new HttpError(404, 'Coupon not found.');
  if (cur.code !== b.code) throw new HttpError(400, "A coupon's code can't be changed. Create a new coupon instead.", 'code');
  cur.set({ pct: undefined, flat: undefined, cap: undefined, min: undefined }); cur.set(toCoupon(b));
  await cur.save(); res.json({ item: cur });
}));
r.patch('/coupons/:id', wrap(async (req, res) => {
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  const item = await Coupon.findByIdAndUpdate(parse(objectId, req.params.id), { active }, { new: true });
  if (!item) throw new HttpError(404, 'Coupon not found.');
  res.json({ item });
}));
r.delete('/coupons/:id', wrap(async (req, res) => {
  const c = await Coupon.findById(parse(objectId, req.params.id));
  if (!c) throw new HttpError(404, 'Coupon not found.');
  if (c.code.startsWith('SPIN')) throw new HttpError(400, 'Spin & Win coupons are used by the wheel on the website. Switch it off instead: it leaves the wheel, and people who already won it can still use it.');
  await c.deleteOne(); res.json({ ok: true });
}));

// ======================= delivery pincodes =======================
r.get('/pincodes', wrap(async (_req, res) => res.json({ items: await Pincode.find().sort({ pincode: 1 }).lean() })));
r.post('/pincodes', wrap(async (req, res) => {
  const b = parse(z.object({
    pincodes: z.string().min(6, 'Enter at least one 6-digit pincode.'),
    area: z.string().trim().max(60).optional(), deliveryCharge: z.number().int().min(0).max(5000).default(49), active: z.boolean().default(true),
  }), req.body);
  const list = [...new Set(b.pincodes.split(/[\s,;]+/).filter(Boolean))];
  if (!list.length || list.some(p => !/^\d{6}$/.test(p))) throw new HttpError(400, 'Every pincode must be exactly 6 digits (separate several with commas).', 'pincodes');
  let added = 0;
  for (const pincode of list) { const x = await Pincode.updateOne({ pincode }, { $setOnInsert: { pincode, area: b.area, deliveryCharge: b.deliveryCharge, active: b.active } }, { upsert: true }); added += x.upsertedCount; }
  res.status(201).json({ added, skipped: list.length - added });
}));
r.put('/pincodes/:id', wrap(async (req, res) => {
  const b = parse(z.object({ area: z.string().trim().max(60).optional(), deliveryCharge: z.number().int().min(0).max(5000), active: z.boolean() }), req.body);
  const item = await Pincode.findByIdAndUpdate(parse(objectId, req.params.id), b, { new: true });
  if (!item) throw new HttpError(404, 'Pincode not found.');
  res.json({ item });
}));
r.delete('/pincodes/:id', wrap(async (req, res) => { await Pincode.findByIdAndDelete(parse(objectId, req.params.id)); res.json({ ok: true }); }));

export default r;
