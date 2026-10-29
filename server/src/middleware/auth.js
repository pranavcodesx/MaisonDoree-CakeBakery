import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { HttpError } from '../services/http.js';

// Customers and the shop owner use DIFFERENT cookies, so logging into the admin panel
// never logs anyone into the storefront (and the other way round), even on one domain.
export const USER_COOKIE = 'token';
export const ADMIN_COOKIE = 'admin_token';

export function signToken(user, audience = 'user') {
  return jwt.sign({ sub: String(user._id), role: user.role, aud: audience }, config.jwtSecret, { expiresIn: audience === 'admin' ? '12h' : '7d' });
}

const cookieOpts = maxAge => ({ httpOnly: true, secure: config.isProd, sameSite: config.cookieSameSite, maxAge });
export const setAuthCookie = (res, token, name = USER_COOKIE) => res.cookie(name, token, cookieOpts(name === ADMIN_COOKIE ? 12 * 3600 * 1000 : 7 * 24 * 3600 * 1000));
export const clearAuthCookie = (res, name = USER_COOKIE) => res.clearCookie(name, { httpOnly: true, secure: config.isProd, sameSite: config.cookieSameSite });

async function load(req, cookieName, audience) {
  const header = req.headers.authorization;
  const token = req.cookies?.[cookieName] || (audience === 'user' && header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return null;
  try {
    const p = jwt.verify(token, config.jwtSecret);
    if ((p.aud || 'user') !== audience) return null;
    const user = await User.findById(p.sub);
    // a password reset logs out every older session
    if (user?.passwordChangedAt && p.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) return null;
    return user;
  } catch { return null; }
}

export async function optionalAuth(req, _res, next) {
  try { req.user = await load(req, USER_COOKIE, 'user'); next(); } catch (e) { next(e); }
}
export async function requireAuth(req, _res, next) {
  try {
    req.user = await load(req, USER_COOKIE, 'user');
    if (!req.user) throw new HttpError(401, 'Please log in to continue.');
    next();
  } catch (e) { next(e); }
}
export async function requireAdmin(req, _res, next) {
  try {
    req.user = await load(req, ADMIN_COOKIE, 'admin');
    if (!req.user) throw new HttpError(401, 'Please log in to the admin panel.');
    if (req.user.role !== 'admin') throw new HttpError(403, 'Admin access only.');
    next();
  } catch (e) { next(e); }
}
