// Loads the catalog, coupons and delivery pincodes. Safe to re-run: it only adds what is missing.
// Usage: npm run seed
import fs from 'fs';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { Cake } from '../models/Cake.js';
import { Coupon } from '../models/Coupon.js';
import { Pincode } from '../models/Pincode.js';
import { Category } from '../models/Category.js';

const categories = [
  ['birthday', 'Birthday', '🎂'], ['wedding', 'Wedding', '💍'], ['anniversary', 'Anniversary', '🥂'], ['kids', 'Kids', '🧸'], ['chocolate', 'Chocolate', '🍫'],
  ['fruit', 'Fruit', '🍓'], ['designer', 'Designer', '🎨'], ['photo', 'Photo Cakes', '🖼️'], ['eggless', 'Eggless', '🌿'], ['premium', 'Premium', '👑'],
  ['cupcakes', 'Cupcakes', '🧁'], ['pastries', 'Pastries', '🥐'], ['brownies', 'Brownies', '🍫'], ['cheesecakes', 'Cheesecakes', '🍰'], ['macarons', 'Macarons', '🍬'],
  ['cookies', 'Cookies', '🍪'], ['festive', 'Festive', '✨'],
].map(([slug, name, emoji], i) => ({ slug, name, emoji, sortOrder: i + 1 }));

const cakes = JSON.parse(fs.readFileSync(new URL('./cakes.seed.json', import.meta.url), 'utf8'));

const coupons = [
  { code: 'WELCOME10', desc: '10% off your first order, up to ₹200', pct: 10, cap: 200, firstOrderOnly: true },
  { code: 'SWEET50', desc: 'Flat ₹50 off on orders above ₹599', flat: 50, min: 599 },
  { code: 'GOLD20', desc: '20% off premium & designer cakes', pct: 20, cap: 400, categories: ['premium', 'designer'] },
  { code: 'SPIN10', desc: 'Spin & Win: 10% off', pct: 10, cap: 200 },
  { code: 'SPIN50', desc: 'Spin & Win: ₹50 off', flat: 50 },
];

// Kolhapur city pincodes as a starting point. Edit/add your real delivery areas from the admin panel.
const pincodes = ['416001', '416002', '416003', '416004', '416005', '416006', '416007', '416008', '416010', '416012']
  .map(pincode => ({ pincode, deliveryCharge: 49 }));

await mongoose.connect(config.mongoUri);

let added = 0;
for (const c of cakes) {
  const r = await Cake.updateOne({ name: c.name }, { $setOnInsert: c }, { upsert: true });
  added += r.upsertedCount;
}
for (const c of categories) await Category.updateOne({ slug: c.slug }, { $setOnInsert: c }, { upsert: true });
for (const c of coupons) await Coupon.updateOne({ code: c.code }, { $setOnInsert: c }, { upsert: true });
for (const p of pincodes) await Pincode.updateOne({ pincode: p.pincode }, { $setOnInsert: p }, { upsert: true });

console.log(`Seed done. ${added} new cakes, ${coupons.length} coupons checked, ${pincodes.length} pincodes and ${categories.length} categories checked.`);
await mongoose.disconnect();
