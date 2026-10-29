import { Router } from 'express';
import { z } from 'zod';
import { wrap, parse, isEmail } from '../../services/http.js';
import { getSettings, saveSettings } from '../../services/settings.js';
import { BUILDER_OPTIONS } from '../../services/pricing.js';

const r = Router();
const money = z.number({ error: 'Enter a number.' }).int().min(0).max(1_000_000);
const photo = z.string().refine(u => u === '' || /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(u) || /^https:\/\/\S+$/.test(u), 'Invalid photo.');
const imageUrl = z.string().refine(u => /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(u) || /^https:\/\/\S+$/.test(u), 'Invalid photo.');
const record = keys => z.object(Object.fromEntries(keys.map(k => [k, money])));

const schema = z.object({
  store: z.object({
    name: z.string().trim().min(2).max(60), phone: z.string().trim().max(30), email: z.string().trim().max(80).refine(v => v === '' || isEmail(v), 'Enter a valid email address.'),
    address: z.string().trim().max(200), hours: z.string().trim().max(80),
    foundedYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable(), citiesServed: z.number().int().min(0).max(500),
  }),
  delivery: z.object({
    cutoffHour: z.number().int().min(0).max(23), maxAdvanceDays: z.number().int().min(1).max(180),
    slots: z.array(z.string().trim().min(2).max(30)).min(1, 'Keep at least one delivery time slot.').max(8).refine(a => new Set(a).size === a.length, 'Time slots must be different.'),
    codMax: money, defaultCharge: money,
  }),
  tax: z.object({ rate: z.number().min(0).max(40) }),
  rewards: z.object({
    earnPer100: z.number().int().min(0).max(100), pointValue: z.number().min(0.1).max(10), minRedeem: z.number().int().min(0).max(100000),
    maxPct: z.number().int().min(1).max(100), silverFrom: money, goldFrom: money,
  }).refine(r => r.goldFrom > r.silverFrom, { message: 'Gold must start at a higher amount than Silver.', path: ['goldFrom'] }),
  builder: z.object({ base: record(['1', '2', '3']), topper: record(BUILDER_OPTIONS.toppers), cream: record(BUILDER_OPTIONS.creams) }),
  content: z.object({
    home: z.object({ heroMain: photo, heroSide: photo }),
    occasions: z.array(z.string().trim().min(2).max(30)).min(1, 'Keep at least one occasion.').max(24).refine(a => new Set(a.map(x => x.toLowerCase())).size === a.length, 'Occasions must be different.'),
    personalize: z.object({
      candles: z.array(z.string().trim().min(2).max(40)).min(1, 'Keep at least one candle choice.').max(8).refine(a => new Set(a).size === a.length, 'Candle choices must be different.'),
      knives: z.array(z.string().trim().min(2).max(40)).min(1, 'Keep at least one knife choice.').max(8).refine(a => new Set(a).size === a.length, 'Knife choices must be different.'),
    }),
    founder: z.object({ name: z.string().trim().max(60), title: z.string().trim().max(40) }),
    team: z.array(z.object({ name: z.string().trim().min(2).max(60), role: z.string().trim().max(80), photo })).max(12),
    about: z.object({
      title: z.string().trim().min(3, 'Enter a page title.').max(80),
      tagline: z.string().trim().max(80),
      story: z.array(z.string().trim().min(3).max(700)).min(1, 'Write at least one paragraph of your story.').max(4),
      features: z.array(z.object({ icon: z.enum(['leaf', 'truck', 'chef', 'shield', 'star', 'heart', 'gift', 'sparkle']), title: z.string().trim().min(2).max(40), text: z.string().trim().min(3).max(160) })).max(6),
      photoMain: photo, photoAccent: photo,
      gallery: z.array(imageUrl).max(12, 'The gallery can have up to 12 photos.'),
    }),
    faqs: z.array(z.object({ q: z.string().trim().min(3).max(160), a: z.string().trim().min(3).max(600) })).max(20),
  }).partial(),
}).partial();

r.get('/settings', wrap(async (_req, res) => res.json({ settings: await getSettings() })));
r.put('/settings', wrap(async (req, res) => res.json({ settings: await saveSettings(parse(schema, req.body)) })));

export default r;
