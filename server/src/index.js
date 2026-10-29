import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import auth from './routes/auth.js';
import me from './routes/me.js';
import cakes from './routes/cakes.js';
import misc from './routes/misc.js';
import orders from './routes/orders.js';
import reviews from './routes/reviews.js';
import admin from './routes/admin/index.js';
import uploads, { UPLOAD_DIR } from './routes/uploads.js';

const app = express();
app.set('trust proxy', config.trustProxy);

// Security headers. The CSP allows what the shop really uses: Google Fonts, product photos from
// https (Cloudinary / stock photos), Razorpay's checkout, and Google's sign-in button.
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },   // lets Razorpay's payment popups talk back
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'script-src': ["'self'", 'https://checkout.razorpay.com', 'https://accounts.google.com'],
      'frame-src': ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com', 'https://accounts.google.com'],
      'connect-src': ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com', 'https://accounts.google.com'],
      'upgrade-insecure-requests': config.isProd ? [] : null,
    },
  },
}));
app.use(cors({ origin: config.origins, credentials: true }));
// WEBHOOK (real payments only, see README → "Going live with real payments"): un-comment these 2 lines. They must stay ABOVE express.json().
// import razorpayWebhook from './routes/razorpayWebhook.js';   // <- this import goes at the top of the file with the other imports
// app.use('/api/razorpay-webhook', express.raw({ type: 'application/json' }), razorpayWebhook);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/me', me);
app.use('/api/cakes', cakes);
app.use('/api/orders', orders);
app.use('/api/reviews', reviews);
app.use('/api/admin', admin);
app.use('/api/uploads', uploads);
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', setHeaders: res => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin') }));
app.use('/api', misc);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// One-service hosting: if the website and admin panel have been built, serve them from here.
//   website → /        admin panel → /admin
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const siteDir = path.join(root, 'client', 'dist');
const adminDir = path.join(root, 'admin', 'dist');
const staticOpts = { setHeaders: (res, file) => res.setHeader('Cache-Control', file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable') };
if (fs.existsSync(path.join(adminDir, 'index.html'))) {
  app.use('/admin', express.static(adminDir, staticOpts));
  app.get('/admin/*', (_req, res) => res.sendFile(path.join(adminDir, 'index.html')));
}
if (fs.existsSync(path.join(siteDir, 'index.html'))) {
  app.use(express.static(siteDir, staticOpts));
  app.get('*', (req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(siteDir, 'index.html')) : next()));
}

app.use((err, _req, res, _next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message });
  if (err.code === 11000) return res.status(409).json({ error: 'That value already exists.' });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id.' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'That image is larger than 5 MB.' });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong. Please try again.', field: err.field });
});

await mongoose.connect(config.mongoUri);
app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
