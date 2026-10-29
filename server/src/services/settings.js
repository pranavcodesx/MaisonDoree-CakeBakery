import { Setting } from '../models/Setting.js';
import { config } from '../config.js';
import { DEFAULT_CANDLES, DEFAULT_KNIVES } from './pricing.js';

// Everything the owner can change from the admin panel, with sensible defaults.
export const DEFAULTS = {
  store: { name: 'Maison Dorée', phone: '', email: '', address: '', hours: 'Mon–Sun: 8:00 AM – 10:00 PM', foundedYear: null, citiesServed: 0 },
  delivery: { cutoffHour: 16, maxAdvanceDays: 30, slots: ['9 AM – 12 PM', '12 PM – 3 PM', '3 PM – 6 PM', '6 PM – 9 PM', 'Any Time'], codMax: 10000, defaultCharge: 49 },
  tax: { rate: 5 },
  // Reward points: earned on delivered orders, spent at checkout as a discount.
  rewards: { earnPer100: 5, pointValue: 0.5, minRedeem: 100, maxPct: 20, silverFrom: 5000, goldFrom: 15000 },
  builder: {
    base: { 1: 699, 2: 1199, 3: 1899 },
    topper: { candles: 0, cherries: 60, gold: 220, berries: 90, none: 0 },
    cream: { Buttercream: 0, 'Whipped Cream': 40, Fondant: 180, Ganache: 120 },
  },
  content: {
    home: { heroMain: '', heroSide: '' },      // the two photos in the home page banner (empty = built-in stock photos)
    occasions: ['Birthday', 'Wedding', 'Baby Shower', 'Engagement', 'Graduation', "Mother's Day", "Father's Day", 'Anniversary', 'Valentine', 'Christmas', 'Diwali', 'Friendship Day'],
    personalize: { candles: DEFAULT_CANDLES, knives: DEFAULT_KNIVES },
    founder: { name: '', title: 'Founder' },
    team: [],     // { name, role (their specialty), photo }
    about: {
      title: 'The Atelier Behind Every Layer',
      tagline: 'One obsession: better cake.',
      story: [
        'Maison Dorée began as a single kitchen counter and a family recipe book, baking for neighbors who wanted something better than the supermarket aisle.',
        'Every recipe on our menu has been tasted, argued over, and re-tested until it earned its place — no shortcuts, no cake mixes, no compromise on butter.',
      ],
      features: [
        { icon: 'leaf', title: 'Real Ingredients', text: 'Butter, fresh cream and good chocolate — nothing artificial.' },
        { icon: 'truck', title: 'Fresh Delivery', text: 'Baked for your delivery day and brought to your door.' },
        { icon: 'chef', title: 'Made by Hand', text: 'Every cake is baked and decorated by hand by our team.' },
        { icon: 'shield', title: 'We Make It Right', text: 'Not happy with your cake? Tell us within 24 hours and we will fix it.' },
      ],
      photoMain: '', photoAccent: '', gallery: [],
    },
    faqs: [
      { q: 'How far in advance should I order?', a: 'Most cakes can be ordered for same-day delivery if placed before {{cutoff}}. For custom or multi-tier wedding cakes, we recommend ordering at least 3 days in advance.' },
      { q: 'Do you offer eggless cakes?', a: 'Yes — look for the green leaf icon on the product card, or filter by "Eggless" on the shop page.' },
      { q: 'What if my cake arrives damaged?', a: 'If anything arrives damaged or not as described, contact us within 24 hours and we will arrange a remake or refund.' },
      { q: 'Can I change my delivery address after ordering?', a: 'Yes, as long as the order has not entered the "Baking" stage. Contact us and our team will update it for you.' },
      { q: 'Do you deliver to my area?', a: 'Enter your pincode at checkout to confirm availability. We add new delivery areas regularly.' },
    ],
  },
};

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
export function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = isObj(base[k]) ? deepMerge(base[k], over[k]) : over[k];
  return out;
}

let cache = null; let cachedAt = 0;
export const clearSettingsCache = () => { cache = null; };

export async function getSettings() {
  if (cache && Date.now() - cachedAt < 10_000) return cache;
  const doc = await Setting.findOne({ key: 'main' }).lean();
  cache = deepMerge(DEFAULTS, doc?.data || {});
  cachedAt = Date.now();
  return cache;
}

// Stores only what the owner changed, merged on top of what is already saved.
export async function saveSettings(patch) {
  const doc = await Setting.findOne({ key: 'main' }).lean();
  const next = deepMerge(doc?.data || {}, patch);
  await Setting.updateOne({ key: 'main' }, { $set: { data: next } }, { upsert: true });
  clearSettingsCache();
  return getSettings();
}

// What the storefront is allowed to know.
const hourText = h => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;
// {{cutoff}} inside an FAQ answer is replaced by the real same-day order cut-off time, so it never goes out of date
const withCutoff = (content, s) => ({ ...content, faqs: (content.faqs || []).map(f => ({ ...f, a: f.a.replaceAll('{{cutoff}}', hourText(s.delivery.cutoffHour)) })) });

export const publicSettings = s => ({
  store: s.store, content: withCutoff(s.content, s), builder: s.builder, taxRate: s.tax.rate, googleClientId: config.googleClientId, rewards: s.rewards,
  delivery: { cutoffHour: s.delivery.cutoffHour, maxAdvanceDays: s.delivery.maxAdvanceDays, slots: s.delivery.slots, codMax: s.delivery.codMax },
});
