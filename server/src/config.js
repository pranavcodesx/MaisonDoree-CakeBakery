import 'dotenv/config';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/maison_doree',
  jwtSecret: process.env.JWT_SECRET,
  origins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
  razorpay: { keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET },
  isProd: process.env.NODE_ENV === 'production',
  cloudinary: { cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY, apiSecret: process.env.CLOUDINARY_API_SECRET },
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',                // enables "Continue with Google" when set
  googleJwksUrl: process.env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs',
  publicUrl: (process.env.PUBLIC_URL || (process.env.CLIENT_ORIGINS || 'http://localhost:5173').split(',')[0]).trim().replace(/\/+$/, ''),   // the website address used inside e-mails (password reset links)
  smtp: { host: process.env.SMTP_HOST || '', port: Number(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '', from: process.env.MAIL_FROM || '' },
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),                 // how many proxies sit in front of the app (Render = 1)
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',               // 'lax' when site + API share one domain; 'none' only for split hosting
};

if (!config.jwtSecret || config.jwtSecret.length < 16) {
  console.error('JWT_SECRET missing or too short. Copy .env.example to .env and set it.');
  process.exit(1);
}
if (config.isProd && (config.jwtSecret.length < 32 || /change-this/i.test(config.jwtSecret))) {
  console.error('In production JWT_SECRET must be a random string of at least 32 characters.');
  process.exit(1);
}
