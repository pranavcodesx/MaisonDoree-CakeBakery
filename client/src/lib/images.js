import { assetUrl } from './api.js';

const u = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
const PHOTO = {
  chocolate: [u('photo-1606313564200-e75d5e30476c'), u('photo-1621303837174-89787a7d2398')],
  vanilla: [u('photo-1464349095431-e9a21285b5f3'), u('photo-1562440499-57f2d1fb3954')],
  redvelvet: [u('photo-1586788680434-30d324b2d60f'), u('photo-1614707267537-b85aaf00c4b7')],
  fruit: [u('photo-1565958011703-44f9829ba187'), u('photo-1519915028121-7d34652e1a31')],
  pistachio: [u('photo-1558636508-e0dbd35cd23f'), u('photo-1535141192574-5d4897c12636')],
  gold: [u('photo-1535254973040-607b474d7f5f'), u('photo-1464349095431-e9a21285b5f3')],
  blush: [u('photo-1571115177098-24ec42ed204d'), u('photo-1557925923-cd4648e211a0')],
  caramel: [u('photo-1551024601-bec78aea704b'), u('photo-1499636136210-6f4ee915583e')],
};
const CATEGORY_PHOTOS = {
  cheesecakes: [u('photo-1533134242443-d4fd215305ad'), u('photo-1524351199678-941a58a18744')],
  wedding: [u('photo-1535254973040-607b474d7f5f'), u('photo-1519657337289-077653f724ed')],
  cupcakes: [u('photo-1486427944299-d1955d23e34d'), u('photo-1576618148400-f54bed99fcfd')],
  macarons: [u('photo-1569864355282-3298388979d3'), u('photo-1558326567-98ae2405596b')],
  cookies: [u('photo-1499636136210-6f4ee915583e'), u('photo-1558961363-fa8fdf82db35')],
  brownies: [u('photo-1606313564200-e75d5e30476c'), u('photo-1590846076176-de1bacb669cd')],
  pastries: [u('photo-1509440159596-0249088772ff'), u('photo-1509365465985-25d11c17e812')],
};
export const THEME_PHOTOS = PHOTO;

const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// A cake's own uploaded photos win; otherwise fall back to a stock photo for its category/theme.
export function cakeImage(cake, variant = 0) {
  if (cake?.images?.length) return assetUrl(cake.images[variant % cake.images.length]);
  const pool = CATEGORY_PHOTOS[cake?.category] || PHOTO[cake?.theme] || PHOTO.chocolate;
  return pool[(hash(cake?._id || cake?.name) + variant) % pool.length];
}

export function fallbackImageData(label) {
  const t = String(label || 'Maison Dorée').slice(0, 34).replace(/[&<>"']/g, '');
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 620"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#F3E7D5"/><stop offset="1" stop-color="#F3DBD4"/></linearGradient></defs><rect width="800" height="620" fill="url(#g)"/><circle cx="400" cy="265" r="92" fill="#FFFDF9" opacity=".72"/><path d="M302 325h196v48c0 15-12 27-27 27H329c-15 0-27-12-27-27z" fill="#C79A4B" opacity=".8"/><path d="M360 310c7-29 18-43 40-55 22 12 33 26 40 55z" fill="#FFFDF9"/><text x="400" y="468" text-anchor="middle" fill="#4A2E1F" font-family="Georgia,serif" font-size="28">${t}</text><text x="400" y="505" text-anchor="middle" fill="#9C7530" font-family="Arial,sans-serif" font-size="16" letter-spacing="3">MAISON DORÉE</text></svg>`);
}
