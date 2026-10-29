import { assetUrl } from './api.js';

// One line describing what was chosen for an ordered item (personalisation included).
export function orderItemDetail(it) {
  const c = it.custom;
  return [
    it.weight, it.flavor,
    c?.shape ? `${c.shape} · ${c.layers} tier · ${c.cream} · ${c.topper === 'none' ? 'no topper' : c.topper}` : '',
    it.candle, it.knife, it.message ? `Message: "${it.message}"` : '',
  ].filter(Boolean).join(' · ');
}
export const photoLink = it => (it.photoUrl ? assetUrl(it.photoUrl) : null);
export const stepIndex = status => (['Order Placed', 'Confirmed'].includes(status) ? 0 : ['Baking', 'Decorating', 'Packed'].includes(status) ? 1 : status === 'Out for Delivery' ? 2 : 3);
