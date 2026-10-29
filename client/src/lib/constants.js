import { weightLabel } from './format.js';

export const CATEGORIES = [
  { slug: 'birthday', name: 'Birthday', emoji: '🎂' }, { slug: 'wedding', name: 'Wedding', emoji: '💍' },
  { slug: 'anniversary', name: 'Anniversary', emoji: '🥂' }, { slug: 'kids', name: 'Kids', emoji: '🧸' },
  { slug: 'chocolate', name: 'Chocolate', emoji: '🍫' }, { slug: 'fruit', name: 'Fruit', emoji: '🍓' },
  { slug: 'designer', name: 'Designer', emoji: '🎨' }, { slug: 'photo', name: 'Photo Cakes', emoji: '🖼️' },
  { slug: 'eggless', name: 'Eggless', emoji: '🌿' }, { slug: 'premium', name: 'Premium', emoji: '👑' },
  { slug: 'cupcakes', name: 'Cupcakes', emoji: '🧁' }, { slug: 'pastries', name: 'Pastries', emoji: '🥐' },
  { slug: 'brownies', name: 'Brownies', emoji: '🍫' }, { slug: 'cheesecakes', name: 'Cheesecakes', emoji: '🍰' },
  { slug: 'macarons', name: 'Macarons', emoji: '🍬' }, { slug: 'cookies', name: 'Cookies', emoji: '🍪' },
  { slug: 'festive', name: 'Festive', emoji: '✨' },
];
// The occasion NAMES come from the admin panel (Website → Occasions). These colours are given out in order, round and round.
export const OCCASION_COLORS = [
  { c1: '#F3DBD4', c2: '#E7AEA4' }, { c1: '#F5E9CE', c2: '#E4C687' }, { c1: '#E4EBDE', c2: '#B9CBAA' }, { c1: '#F3DBD4', c2: '#C97F72' },
  { c1: '#E6D6C4', c2: '#B08A6C' }, { c1: '#F3DBD4', c2: '#E7AEA4' }, { c1: '#E6D6C4', c2: '#7A4B32' }, { c1: '#F5E9CE', c2: '#C79A4B' },
  { c1: '#F3DBD4', c2: '#B5544A' }, { c1: '#E4EBDE', c2: '#6E8B5E' }, { c1: '#F5E9CE', c2: '#9C7530' }, { c1: '#E6D6C4', c2: '#D6AE63' },
];
export const occasionSlug = name => name.toLowerCase().replace(/'/g, '').replace(/[^a-z]+/g, '-').replace(/^-+|-+$/g, '');

export const WEIGHTS = ['500 g', '1 kg', '1.5 kg', '2 kg', '3 kg'];
const MULT = { '500 g': 0.6, '1 kg': 1, '1.5 kg': 1.45, '2 kg': 1.85, '3 kg': 2.7 };
const KG_TIER = { 1000: '1 kg', 1500: '1.5 kg', 2000: '2 kg', 3000: '3 kg' };
// Only cakes whose natural size is 1, 1.5, 2 or 3 kg come in several sizes. Anything else (a 300 g cupcake box,
// a 900 g cheesecake) is one fixed pack at its own price. Same rule as the server.
export const isFixedSize = cake => !KG_TIER[cake.weightG];
export const baseWeight = cake => (isFixedSize(cake) ? weightLabel(cake.weightG) : KG_TIER[cake.weightG]);
export const weightOptions = cake => (isFixedSize(cake) ? [weightLabel(cake.weightG)] : WEIGHTS);
// same formula as the server, used only to *display* a price before the cart is quoted
export const priceFor = (cake, weight, field = 'price') => (isFixedSize(cake) ? Math.round(cake[field]) : Math.round((cake[field] * MULT[weight]) / MULT[baseWeight(cake)]));

export const TRACK_STEPS = [
  { label: 'Order Placed', icon: 'check' }, { label: 'Confirmed', icon: 'check' }, { label: 'Baking', icon: 'mixer' },
  { label: 'Decorating', icon: 'sparkle' }, { label: 'Packed', icon: 'box' }, { label: 'Out for Delivery', icon: 'truck' },
  { label: 'Delivered', icon: 'package-check' },
];
export const STATUS_BADGE = {
  'Order Placed': { cls: 'gold', icon: 'check-circle' }, Confirmed: { cls: 'gold', icon: 'check-circle' }, Baking: { cls: 'gold', icon: 'mixer' },
  Decorating: { cls: 'gold', icon: 'sparkle' }, Packed: { cls: 'gold', icon: 'box' }, 'Out for Delivery': { cls: 'sage', icon: 'truck' },
  Delivered: { cls: 'sage', icon: 'package-check' }, Cancelled: { cls: 'terracotta', icon: 'x' },
};
