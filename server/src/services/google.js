import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from './http.js';

// Verifies a "Sign in with Google" ID token: signature (Google's public keys), audience (our client id),
// issuer, expiry and a verified email. Nothing the browser says is trusted until this passes.
let keys = null; let keysAt = 0;
async function loadKeys(force = false) {
  if (!force && keys && Date.now() - keysAt < 3600_000) return keys;
  let res;
  try { res = await fetch(config.googleJwksUrl); } catch { throw new HttpError(502, "Couldn't reach Google to verify your sign-in. Please try again."); }
  if (!res.ok) throw new HttpError(502, "Couldn't reach Google to verify your sign-in. Please try again.");
  const { keys: list } = await res.json();
  keys = new Map(list.map(k => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })]));
  keysAt = Date.now();
  return keys;
}

export async function verifyGoogleToken(idToken) {
  if (!config.googleClientId) throw new HttpError(404, 'Google sign-in is not set up on this shop.');
  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded?.header?.kid;
  if (!kid || decoded.header.alg !== 'RS256') throw new HttpError(401, 'Invalid Google sign-in.');
  let key = (await loadKeys()).get(kid) || (await loadKeys(true)).get(kid);   // Google rotates keys: refresh once if unknown
  if (!key) throw new HttpError(401, 'Invalid Google sign-in.');
  let p;
  try {
    p = jwt.verify(idToken, key, { algorithms: ['RS256'], audience: config.googleClientId, issuer: ['accounts.google.com', 'https://accounts.google.com'], clockTolerance: 10 });
  } catch { throw new HttpError(401, 'Google sign-in could not be verified. Please try again.'); }
  if (!p.sub || !p.email || !(p.email_verified === true || p.email_verified === 'true')) throw new HttpError(401, 'Your Google email address is not verified.');
  return { sub: String(p.sub), email: String(p.email).toLowerCase(), name: p.name || String(p.email).split('@')[0], picture: p.picture };
}
