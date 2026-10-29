import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { wrap, parse, HttpError, normalizePhone, isEmail } from '../services/http.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth.js';
import { verifyGoogleToken } from '../services/google.js';
import { sendMail, mailEnabled } from '../services/mailer.js';
import { config } from '../config.js';
import crypto from 'crypto';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' } });

// "identifier" is the single email-or-phone field your login form already has
function splitIdentifier(identifier) {
  const v = identifier.trim();
  if (isEmail(v)) return { email: v.toLowerCase() };
  const phone = normalizePhone(v);
  if (phone) return { phone };
  throw new HttpError(400, 'Enter a valid email address or 10-digit mobile number.', 'identifier');
}

r.post('/signup', limiter, wrap(async (req, res) => {
  const body = parse(z.object({
    name: z.string().trim().min(2, 'Please enter your full name.').max(80),
    identifier: z.string().min(1, 'Please enter your email or phone number.'),
    password: z.string().min(8, 'Use at least 8 characters for a stronger password.').max(128),
  }), req.body);
  const key = splitIdentifier(body.identifier);
  if (await User.exists(key)) throw new HttpError(409, 'An account with this email or phone already exists. Try logging in instead.', 'identifier');
  const user = await User.create({ name: body.name, ...key, passwordHash: await bcrypt.hash(body.password, 12) });
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: user.toPublic() });
}));

r.post('/login', limiter, wrap(async (req, res) => {
  const body = parse(z.object({ identifier: z.string().min(1, 'Please enter your email or phone number.'), password: z.string().min(1, 'Please enter your password.') }), req.body);
  const user = await User.findOne(splitIdentifier(body.identifier)).select('+passwordHash');
  if (user && !user.passwordHash) throw new HttpError(401, 'This account uses Google sign-in. Please tap "Continue with Google".');
  const ok = user && await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Incorrect email/phone or password.');
  setAuthCookie(res, signToken(user));
  res.json({ user: user.toPublic() });
}));

// "Continue with Google": the browser sends the ID token Google gave it; we verify it with Google's public keys.
r.post('/google', limiter, wrap(async (req, res) => {
  const { credential } = parse(z.object({ credential: z.string().min(20).max(5000) }), req.body);
  const g = await verifyGoogleToken(credential);
  let user = await User.findOne({ googleId: g.sub });
  if (!user) {
    user = await User.findOne({ email: g.email });
    if (user?.role === 'admin') throw new HttpError(403, 'Admin accounts cannot use Google sign-in.');
    if (user) { user.googleId = g.sub; if (!user.avatar) user.avatar = g.picture; await user.save(); }   // same verified email: link it to the existing account
    else user = await User.create({ name: g.name.slice(0, 80), email: g.email, googleId: g.sub, avatar: g.picture, hasPassword: false });
  }
  if (user.role === 'admin') throw new HttpError(403, 'Admin accounts cannot use Google sign-in.');
  setAuthCookie(res, signToken(user));
  res.json({ user: user.toPublic() });
}));

// ---- forgot / reset password (by e-mail link) ----
const RESET_MINUTES = 30;
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again in a few minutes.' } });
const SENT = { ok: true, message: 'If an account exists for that email, a reset link is on its way. It works for 30 minutes.' };

r.post('/forgot-password', forgotLimiter, wrap(async (req, res) => {
  const { email } = parse(z.object({ email: z.string().trim().toLowerCase().refine(isEmail, 'Enter the email address of your account.') }), req.body);
  if (!mailEnabled() && config.isProd) throw new HttpError(503, "Password reset by email isn't set up on this shop yet. Please contact us and we'll help you.");
  const user = await User.findOne({ email }).select('+resetExpires');
  // Same answer whether or not the account exists, so nobody can use this form to find out who has an account.
  // Admin accounts are not reset from the website (the owner uses `npm run create-admin`).
  const lastSent = user?.resetExpires ? user.resetExpires.getTime() - RESET_MINUTES * 60_000 : 0;
  if (!user || user.role === 'admin' || Date.now() - lastSent < 60_000) return res.json(SENT);
  const token = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = sha256(token);
  user.resetExpires = new Date(Date.now() + RESET_MINUTES * 60_000);
  await user.save();
  const link = `${config.publicUrl}/reset-password?token=${token}`;
  const first = user.name.split(' ')[0];
  try {
    await sendMail({
      to: user.email,
      subject: 'Reset your Maison Dorée password',
      text: `Hi ${first},\n\nSomeone asked to reset the password of your Maison Dorée account. Open this link to choose a new one (it works for ${RESET_MINUTES} minutes):\n\n${link}\n\nIf this wasn't you, just ignore this email. Your password stays the same.\n\nMaison Dorée`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2b1810"><h2 style="font-weight:600">Reset your password</h2><p>Hi ${first.replace(/[<>&"]/g, '')},</p><p>Someone asked to reset the password of your Maison Dorée account. This link works for ${RESET_MINUTES} minutes.</p><p style="margin:26px 0"><a href="${link}" style="background:#2b1810;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Choose a new password</a></p><p style="font-size:13px;color:#6b5a50">If this wasn't you, ignore this email. Your password stays the same.</p></div>`,
    });
  } catch (e) {
    console.error('Could not send reset email:', e.message);
    user.resetTokenHash = undefined; user.resetExpires = undefined; await user.save();
    throw new HttpError(502, "We couldn't send the email right now. Please try again in a little while.");
  }
  res.json(SENT);
}));

r.post('/reset-password', limiter, wrap(async (req, res) => {
  const b = parse(z.object({ token: z.string().length(64, 'This reset link is not valid.'), password: z.string().min(8, 'Use at least 8 characters for a stronger password.').max(128) }), req.body);
  const user = await User.findOne({ resetTokenHash: sha256(b.token), resetExpires: { $gt: new Date() } }).select('+resetTokenHash +resetExpires');
  if (!user || user.role === 'admin') throw new HttpError(400, 'This reset link has expired or was already used. Please request a new one.', 'token');
  user.passwordHash = await bcrypt.hash(b.password, 12);
  user.hasPassword = true;
  user.resetTokenHash = undefined; user.resetExpires = undefined;
  user.passwordChangedAt = new Date();
  await user.save();
  setAuthCookie(res, signToken(user));     // the new password also logs them in
  res.json({ user: user.toPublic() });
}));

r.post('/logout', (_req, res) => { clearAuthCookie(res); res.json({ ok: true }); });
r.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

export default r;
