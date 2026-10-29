import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { wrap, parse, HttpError, isEmail } from '../../services/http.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAdmin, ADMIN_COOKIE } from '../../middleware/auth.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again in a few minutes.' } });
const pub = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });

// There is no public "create admin" form: admins are created with `npm run create-admin`.
r.post('/login', limiter, wrap(async (req, res) => {
  const b = parse(z.object({ email: z.string().trim().toLowerCase().refine(isEmail, 'Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') }), req.body);
  const user = await User.findOne({ email: b.email }).select('+passwordHash');
  const ok = user && user.role === 'admin' && await bcrypt.compare(b.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Incorrect email or password.');
  setAuthCookie(res, signToken(user, 'admin'), ADMIN_COOKIE);
  res.json({ user: pub(user) });
}));

r.post('/logout', (_req, res) => { clearAuthCookie(res, ADMIN_COOKIE); res.json({ ok: true }); });
r.get('/me', requireAdmin, (req, res) => res.json({ user: pub(req.user) }));

r.put('/password', requireAdmin, wrap(async (req, res) => {
  const b = parse(z.object({ current: z.string().min(1), next: z.string().min(8, 'Use at least 8 characters.').max(128) }), req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(b.current, user.passwordHash))) throw new HttpError(400, 'Current password is incorrect.', 'current');
  user.passwordHash = await bcrypt.hash(b.next, 12);
  await user.save();
  res.json({ ok: true });
}));

r.put('/profile', requireAdmin, wrap(async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2).max(80) }), req.body);
  req.user.name = b.name; await req.user.save();
  res.json({ user: pub(req.user) });
}));

export default r;
