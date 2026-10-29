import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { fmtPrice } from '../lib/format.js';
import { useSettings } from '../context/SettingsContext.jsx';

// Prices come from the admin panel (Settings → Custom cake prices); the server re-prices every order.
const COLORS = ['#F0D9C4', '#F3DBD4', '#fdfaf5', '#7A4B32', '#C79A4B', '#B5544A', '#6E8B5E'];
const TOPPER_LABEL = { candles: 'Candles', cherries: 'Cherries', gold: 'Gold Leaf', berries: 'Berries', none: 'None' };

function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = v => Math.min(255, Math.max(0, v));
  return '#' + (0x1000000 + c((n >> 16) + amt) * 0x10000 + c(((n >> 8) & 255) + amt) * 0x100 + c((n & 255) + amt)).toString(16).slice(1);
}
const heart = (cx, cy, rx, ry) => { const t = cy - ry, b = cy + ry, l = cx - rx, r = cx + rx, dip = cy - ry * 0.28;
  return `M${cx},${b} C${l},${cy + ry * 0.15} ${l},${t} ${cx - rx * 0.5},${t} C${cx - rx * 0.05},${t} ${cx},${dip - ry * 0.1} ${cx},${dip} C${cx},${dip - ry * 0.1} ${cx + rx * 0.05},${t} ${cx + rx * 0.5},${t} C${r},${t} ${r},${cy + ry * 0.15} ${cx},${b} Z`; };

function Pills({ value, options, onChange }) {
  return <div className="opt-pills">{options.map(([v, l]) => <button key={v} className={`opt-pill ${v === value ? 'sel' : ''}`} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

export default function Builder() {
  const { builder } = useSettings(); const BASE = builder.base, TOPPER = builder.topper, CREAM = builder.cream;
  const cart = useCart(); const { user } = useAuth(); const { openLogin, setCartOpen } = useUI(); const toast = useToast(); const navigate = useNavigate();
  const [s, setS] = useState({ shape: 'round', layers: 2, flavor: 'Chocolate', cream: 'Buttercream', color: '#F0D9C4', topper: 'candles', text: 'Happy Birthday' });
  const [photo, setPhoto] = useState(null); const [uploading, setUploading] = useState(false); const fileRef = useRef(null);
  const set = k => v => setS(x => ({ ...x, [k]: v }));
  const price = BASE[s.layers] + TOPPER[s.topper] + CREAM[s.cream];
  const isHeart = s.shape === 'heart'; const rx = s.shape === 'square' ? 6 : 20; const L = s.layers;
  const textY = L === 1 ? 255 : L === 3 ? 118 : 180; const textSize = L === 3 ? 14 : L === 1 ? 19 : 20; const topY = L === 1 ? 235 : L === 3 ? 96 : 158;
  const caps = [[150, 140, 88, 14, '#FAEBD7'], [150, 215, 115, 16, '#FBF1E2'], [150, 78, 65, 12, '#FDF4E4']];

  async function pick(e) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    if (!user) { toast('Please log in to upload a photo', 'info', 'upload'); openLogin('/builder'); return; }
    setUploading(true);
    try { const fd = new FormData(); fd.append('photo', file); const d = await api('/api/uploads', { method: 'POST', form: fd }); setPhoto({ url: d.url, name: file.name }); toast('Photo uploaded — our team will confirm the design before baking', 'success', 'upload'); }
    catch (err) { toast(err.message, 'error'); }
    setUploading(false);
  }
  function add() {
    cart.add({ kind: 'custom', qty: 1, weight: '1 kg', flavor: s.flavor, message: s.text.trim(), photoUrl: photo?.url,
      custom: { shape: s.shape, layers: s.layers, flavor: s.flavor, cream: s.cream, topper: s.topper, color: s.color },
      snap: { name: `Custom ${s.shape[0].toUpperCase() + s.shape.slice(1)} Cake (${s.layers} tier)`, category: 'designer', theme: 'gold' } });
    toast('Custom cake added to cart', 'success'); setCartOpen(true);
  }
  const Step = ({ n, title, desc, children, last }) => <div className="b-step" style={last ? { borderBottom: 'none' } : undefined}><h4><span className="n">{n}</span>{title}</h4><p className="desc">{desc}</p>{children}</div>;

  return (
    <section className="page active" data-page="builder">
      <div className="page-hero-banner"><div className="container"><span className="eyebrow">Design Atelier</span><h1 className="h-section">Build Your Cake</h1>
        <div className="breadcrumb"><span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span><Icon name="chev-right" /><span>Custom Cake</span></div></div></div>
      <section className="section" style={{ paddingTop: 50 }}>
        <div className="container builder-layout">
          <div className="builder-stage"><div className="builder-cake-wrap">
            <svg viewBox="0 0 300 340" width="100%" style={{ overflow: 'visible' }}>
              <ellipse cx="150" cy="300" rx="118" ry="22" fill="rgba(43,24,16,0.10)" />
              {L >= 2 && <g><rect x="35" y="215" width="230" height="78" rx={rx} fill={shade(s.color, -14)} />{isHeart ? <path d={heart(...caps[1].slice(0, 4))} fill={caps[1][4]} /> : <ellipse cx="150" cy="215" rx="115" ry="16" fill={caps[1][4]} />}</g>}
              <g transform={L === 1 ? 'translate(0,75)' : undefined}><rect x="62" y="140" width="176" height="76" rx={rx} fill={s.color} />{isHeart ? <path d={heart(...caps[0].slice(0, 4))} fill={caps[0][4]} /> : <ellipse cx="150" cy="140" rx="88" ry="14" fill={caps[0][4]} />}</g>
              {L >= 3 && <g><rect x="85" y="78" width="130" height="62" rx={Math.max(4, rx - 4)} fill={shade(s.color, 16)} />{isHeart ? <path d={heart(...caps[2].slice(0, 4))} fill={caps[2][4]} /> : <ellipse cx="150" cy="78" rx="65" ry="12" fill={caps[2][4]} />}</g>}
              <text x="150" y={textY} textAnchor="middle" fontFamily="Fraunces, serif" fontSize={textSize} fill="#5B3A26" fontWeight="600">{s.text}</text>
              <g transform={`translate(150,${topY})`}>
                {s.topper === 'candles' && <><rect x="-3" y="-16" width="6" height="16" rx="3" fill="#F5E9CE" /><path d="M0 -30c2 2.2 3 3.7 3 5.2a3 3 0 1 1-6 0c0-1.5 1-3 3-5.2z" fill="#FFB648" /></>}
                {s.topper === 'cherries' && <><circle cx="-14" cy="-6" r="8" fill="#B5544A" /><circle cx="10" cy="-4" r="7" fill="#9C3F37" /><circle cx="0" cy="-14" r="6" fill="#C97F72" /></>}
                {s.topper === 'gold' && <><path d="M0 -20c1.6 1.6 2.4 2.8 2.4 4a2.4 2.4 0 1 1-4.8 0c0-1.2.8-2.4 2.4-4z" fill="#C79A4B" /><path d="M-18 -2c6 4 30 4 36 0" stroke="#C79A4B" strokeWidth="2" fill="none" /></>}
                {s.topper === 'berries' && <><circle cx="-12" cy="-6" r="6" fill="#6E8B5E" /><circle cx="4" cy="-10" r="6" fill="#B5544A" /><circle cx="16" cy="-4" r="6" fill="#9C3F37" /></>}
              </g>
            </svg>
          </div></div>
          <div className="builder-steps">
            <Step n={1} title="Shape" desc="Choose the silhouette of your cake."><Pills value={s.shape} onChange={set('shape')} options={[['round', 'Round'], ['square', 'Square'], ['heart', 'Heart']]} /></Step>
            <Step n={2} title="Layers" desc="How many tiers should we stack?"><Pills value={s.layers} onChange={set('layers')} options={[[1, '1 Tier'], [2, '2 Tier'], [3, '3 Tier']]} /></Step>
            <Step n={3} title="Flavor" desc="Pick the sponge inside."><Pills value={s.flavor} onChange={set('flavor')} options={['Chocolate', 'Vanilla', 'Red Velvet', 'Butterscotch', 'Fruit'].map(x => [x, x])} /></Step>
            <Step n={4} title="Cream" desc="Buttercream or whipped fresh cream."><Pills value={s.cream} onChange={set('cream')} options={Object.keys(CREAM).map(x => [x, CREAM[x] ? `${x} (+${fmtPrice(CREAM[x])})` : x])} /></Step>
            <Step n={5} title="Color" desc="Set the frosting tone."><div className="b-swatches">{COLORS.map(c => <span key={c} className={`opt-swatch ${s.color === c ? 'sel' : ''}`} style={{ background: c }} onClick={() => set('color')(c)} />)}</div></Step>
            <Step n={6} title="Theme & Topper" desc="A finishing touch on top."><Pills value={s.topper} onChange={set('topper')} options={Object.keys(TOPPER).map(x => [x, TOPPER[x] ? `${TOPPER_LABEL[x]} (+${fmtPrice(TOPPER[x])})` : TOPPER_LABEL[x]])} /></Step>
            <Step n={7} title="Message on Cake" desc="We'll pipe this on by hand (max 24 characters)." last>
              <input type="text" maxLength={24} value={s.text} onChange={e => set('text')(e.target.value)} placeholder="e.g. Happy Birthday Aria" style={{ width: '100%', padding: '12px 15px', borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--bg-alt)', fontSize: 13.6 }} />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
              <div className="upload-drop" style={{ marginTop: 12 }} onClick={() => !uploading && fileRef.current.click()}>
                <Icon name="upload" style={{ width: 20, height: 20, margin: '0 auto 8px', color: 'var(--ink-faint)' }} />
                {uploading ? 'Uploading…' : photo ? `✓ ${photo.name} — click to replace` : 'Upload a reference photo (optional)'}
              </div>
              {photo && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setPhoto(null)}>Remove photo</button>}
            </Step>
            <div className="builder-price-bar">
              <div><div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 700 }}>Price</div><div style={{ fontSize: 24, fontWeight: 800 }}>{fmtPrice(price)}</div></div>
              <button className="btn btn-primary" onClick={add}>Add to Cart</button>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
