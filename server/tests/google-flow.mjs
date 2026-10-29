// "Continue with Google": every way a sign-in can go right or wrong. Uses a fake Google (see run.mjs).
import jwt from 'jsonwebtoken';
import { spawnSync } from 'node:child_process';
import { client, ok, summary } from './e2e.mjs';

const CLIENT = process.env.GOOGLE_CLIENT_ID, KEY = process.env.GOOGLE_TEST_PRIVATE_KEY, KID = process.env.GOOGLE_TEST_KID;
const mint = (claims = {}, opts = {}) => jwt.sign({ iss: 'https://accounts.google.com', aud: CLIENT, sub: 'g-1001', email: 'Maya.Google@Gmail.com', email_verified: true, name: 'Maya Google', picture: 'https://lh3.googleusercontent.com/a/maya', ...claims }, KEY, { algorithm: 'RS256', keyid: KID, expiresIn: '1h', ...opts });
const guest = () => client();
let r;

console.log('Google sign-in');
r = await guest()('GET', '/api/settings/public'); ok(r.data.googleClientId === CLIENT, 'website is told the Google client id (so it can show the button)');

const maya = guest();
r = await maya('POST', '/api/auth/google', { credential: mint() }); ok(r.status === 200 && r.data.user.email === 'maya.google@gmail.com' && r.data.user.name === 'Maya Google', 'a valid Google token signs a new customer up');
ok(r.data.user.googleLinked === true && r.data.user.hasPassword === false && r.data.user.role === 'user', 'new account is Google-linked, has no password, and is a customer');
const mayaId = r.data.user.id;
r = await maya('GET', '/api/auth/me'); ok(r.data.user?.id === mayaId, 'the session cookie works afterwards');
r = await guest()('POST', '/api/auth/google', { credential: mint() }); ok(r.data.user.id === mayaId, 'signing in again gives the same account, not a duplicate');
r = await guest()('POST', '/api/auth/google', { credential: mint({ email: 'MAYA.GOOGLE@gmail.com' }) }); ok(r.data.user.id === mayaId, 'email capitals do not create a second account');

console.log('linking to an existing account');
const pw = guest();
r = await pw('POST', '/api/auth/signup', { name: 'Ravi Patil', identifier: 'ravi@gmail.com', password: 'RaviPass123' }); const raviId = r.data.user.id;
r = await guest()('POST', '/api/auth/google', { credential: mint({ sub: 'g-2002', email: 'ravi@gmail.com', name: 'Ravi P' }) }); ok(r.status === 200 && r.data.user.id === raviId && r.data.user.name === 'Ravi Patil' && r.data.user.hasPassword === true, 'same verified email links to the existing account (keeps name and password)');
r = await guest()('POST', '/api/auth/login', { identifier: 'ravi@gmail.com', password: 'RaviPass123' }); ok(r.status === 200, 'the password still works after linking');

console.log('bad tokens');
const bad = {
  'wrong audience (another app\'s token)': mint({ aud: 'someone-else.apps.googleusercontent.com' }),
  'expired token': mint({}, { expiresIn: -60 }),
  'wrong issuer': mint({ iss: 'https://evil.example' }),
  'email not verified': mint({ email_verified: false, sub: 'g-3003', email: 'unverified@gmail.com' }),
  'signed with a key Google does not publish': jwt.sign({ iss: 'accounts.google.com', aud: CLIENT, sub: 'x', email: 'x@gmail.com', email_verified: true }, KEY, { algorithm: 'RS256', keyid: 'unknown-key', expiresIn: '1h' }),
  'forged HS256 token': jwt.sign({ iss: 'accounts.google.com', aud: CLIENT, sub: 'x', email: 'x@gmail.com', email_verified: true }, CLIENT, { algorithm: 'HS256', keyid: KID }),
  'unsigned (alg none) token': `${Buffer.from(JSON.stringify({ alg: 'none', kid: KID })).toString('base64url')}.${Buffer.from(JSON.stringify({ iss: 'accounts.google.com', aud: CLIENT, sub: 'x', email: 'x@gmail.com', email_verified: true })).toString('base64url')}.`,
  'tampered payload': (() => { const t = mint().split('.'); t[1] = Buffer.from(JSON.stringify({ iss: 'accounts.google.com', aud: CLIENT, sub: 'g-9', email: 'admin@gmail.com', email_verified: true, exp: 9999999999 })).toString('base64url'); return t.join('.'); })(),
  'random text': 'this-is-not-a-token-at-all',
};
for (const [name, credential] of Object.entries(bad)) { const c = guest(); r = await c('POST', '/api/auth/google', { credential }); const me = await c('GET', '/api/auth/me'); ok([400, 401].includes(r.status) && me.status === 401, `rejected, no session: ${name}`, r.status); }
r = await guest()('POST', '/api/auth/google', {}); ok(r.status === 400, 'missing token rejected');
r = await guest()('GET', '/api/admin/dashboard'); ok(r.status === 401, 'Google never gives access to the admin API');

console.log('admin accounts');
const g = guest();
r = await g('POST', '/api/auth/google', { credential: mint({ sub: 'g-4004', email: 'owner@test.com' }) }); ok(r.status === 403, 'a shop-owner email cannot use Google sign-in');
r = await g('GET', '/api/auth/me'); ok(r.status === 401, '...and gets no session');

console.log('Google accounts and passwords');
r = await guest()('POST', '/api/auth/login', { identifier: 'maya.google@gmail.com', password: 'whatever123' }); ok(r.status === 401 && /Google/.test(r.data.error), 'password login on a Google-only account explains what to do');
r = await maya('PUT', '/api/me/password', { next: 'short' }); ok(r.status === 400, 'new password must be 8+ characters');
r = await maya('PUT', '/api/me/password', { next: 'MayaPass123' }); ok(r.status === 200, 'a Google account can set a password without a "current" one');
r = await guest()('POST', '/api/auth/login', { identifier: 'maya.google@gmail.com', password: 'MayaPass123' }); ok(r.status === 200 && r.data.user.hasPassword === true, 'then email + password login works too');
r = await maya('PUT', '/api/me/password', { current: 'wrong', next: 'AnotherPass1' }); ok(r.status === 400, 'once a password exists, the current one is required');

console.log('default local admin (admin@gmail.com / Admin123)');
const run = env => spawnSync('node', ['src/scripts/createAdmin.js'], { env: { ...process.env, ...env }, encoding: 'utf8' });
let s = run({ NODE_ENV: 'production' }); ok(s.status === 1 && /exactly 3 values/.test(s.stderr), 'in production the default admin is refused (you must choose your own)');
s = run({}); ok(s.status === 0 && /admin@gmail.com/.test(s.stdout), 'with no values it creates the default admin for local testing');
const adm = guest();
r = await adm('POST', '/api/admin/auth/login', { email: 'admin@gmail.com', password: 'Admin123' }); ok(r.status === 200 && r.data.user.role === 'admin', 'admin@gmail.com / Admin123 logs in to the admin panel');
r = await adm('GET', '/api/admin/dashboard'); ok(r.status === 200, 'and can use the admin API');
r = await guest()('POST', '/api/admin/auth/login', { email: 'admin@gmail.com', password: 'admin123' }); ok(r.status === 401, 'the password is case-sensitive');
r = await guest()('POST', '/api/auth/google', { credential: mint({ sub: 'g-5005', email: 'admin@gmail.com' }) }); ok(r.status === 403, 'a stranger with the real admin@gmail.com Google account still cannot get in');

process.exit(summary() ? 1 : 0);
