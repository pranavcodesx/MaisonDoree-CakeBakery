import { Router } from 'express';
import { Cake } from '../models/Cake.js';
import { Review } from '../models/Review.js';
import { wrap, HttpError } from '../services/http.js';

const r = Router();
const csv = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

r.get('/', wrap(async (req, res) => {
  const q = req.query;
  const f = { active: true };
  if (q.category) f.category = q.category;
  if (csv(q.occasions).length) f.occasions = { $in: csv(q.occasions) };
  if (csv(q.flavors).length) f.flavor = { $in: csv(q.flavors) };
  if (csv(q.tags).length) f.tags = { $in: csv(q.tags) };
  if (q.eggless === 'true') f.egg = false;
  if (q.egg === 'true') f.egg = true;
  if (q.onOffer === 'true') f.was = { $gt: 0 };
  if (q.minRating) f.rating = { $gte: Number(q.minRating) || 0 };
  if (q.maxPrice || q.minPrice) f.price = { ...(q.minPrice && { $gte: Number(q.minPrice) }), ...(q.maxPrice && { $lte: Number(q.maxPrice) }) };
  if (q.q) { const re = new RegExp(esc(String(q.q).slice(0, 60)), 'i'); f.$or = [{ name: re }, { flavor: re }, { tags: re }, { category: re }]; }

  const sorts = { popular: { reviewCount: -1, rating: -1 }, 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, rating: { rating: -1 }, new: { createdAt: -1 } };
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(q.limit) || 12));
  const [items, total] = await Promise.all([
    Cake.find(f).sort(sorts[q.sort] || sorts.popular).skip((page - 1) * limit).limit(limit),
    Cake.countDocuments(f),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

r.get('/meta', wrap(async (_req, res) => {
  const [flavors, categories, cheapest, priciest] = await Promise.all([
    Cake.distinct('flavor', { active: true }),
    Cake.distinct('category', { active: true }),
    Cake.findOne({ active: true }).sort({ price: 1 }).select('price'),
    Cake.findOne({ active: true }).sort({ price: -1 }).select('price'),
  ]);
  res.json({ flavors: flavors.filter(Boolean).sort(), categories, minPrice: cheapest?.price || 0, maxPrice: priciest?.price || 0 });
}));

r.get('/:id', wrap(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new HttpError(404, 'Cake not found.');
  const cake = await Cake.findOne({ _id: req.params.id, active: true });
  if (!cake) throw new HttpError(404, 'Cake not found.');
  res.json({ cake });
}));

r.get('/:id/reviews', wrap(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new HttpError(404, 'Cake not found.');
  const items = await Review.find({ cake: req.params.id, status: 'approved' }).sort({ createdAt: -1 }).limit(30).populate('user', 'name');
  res.json({ items: items.map(x => ({ id: x._id, name: x.user?.name || 'Customer', rating: x.rating, comment: x.comment, date: x.createdAt })) });
}));

export default r;
