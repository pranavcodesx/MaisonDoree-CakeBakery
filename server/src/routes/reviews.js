import { Router } from 'express';
import { z } from 'zod';
import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { Cake } from '../models/Cake.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, parse, HttpError, objectId } from '../services/http.js';

const r = Router();

export async function refreshCakeRating(cakeId) {
  const [sum, n] = await Promise.all([
    Review.aggregate([{ $match: { cake: cakeId, status: 'approved' } }, { $group: { _id: '$cake', total: { $sum: '$rating' } } }]),
    Review.countDocuments({ cake: cakeId, status: 'approved' }),
  ]);
  await Cake.updateOne({ _id: cakeId }, { rating: n ? Math.round((sum[0].total / n) * 10) / 10 : 0, reviewCount: n });
}

// Only delivered orders can be reviewed, once per cake per order.
r.post('/', requireAuth, wrap(async (req, res) => {
  const b = parse(z.object({
    orderNum: z.string(), cakeId: objectId,
    rating: z.number().int().min(1, 'Please select a star rating.').max(5),
    comment: z.string().trim().min(3, 'Please write a short comment.').max(1000),
  }), req.body);
  const order = await Order.findOne({ orderNum: b.orderNum, user: req.user._id });
  if (!order) throw new HttpError(404, 'Order not found.');
  if (order.status !== 'Delivered') throw new HttpError(400, 'You can review a cake once your order is delivered.');
  if (!order.items.some(i => i.cake && String(i.cake) === b.cakeId)) throw new HttpError(400, 'This cake is not part of that order.');
  try {
    const review = await Review.create({ user: req.user._id, cake: b.cakeId, order: order._id, rating: b.rating, comment: b.comment });
    await refreshCakeRating(review.cake);
    res.status(201).json({ review });
  } catch (e) {
    if (e.code === 11000) throw new HttpError(409, 'You have already reviewed this cake for this order.');
    throw e;
  }
}));

// Customers can edit their own review.
r.put('/:id', requireAuth, wrap(async (req, res) => {
  const b = parse(z.object({
    rating: z.number().int().min(1, 'Please select a star rating.').max(5),
    comment: z.string().trim().min(3, 'Please write a short comment.').max(1000),
  }), req.body);
  const review = await Review.findOne({ _id: parse(objectId, req.params.id), user: req.user._id });
  if (!review) throw new HttpError(404, 'Review not found.');
  review.rating = b.rating; review.comment = b.comment;
  await review.save();
  await refreshCakeRating(review.cake);
  res.json({ review });
}));

export default r;
