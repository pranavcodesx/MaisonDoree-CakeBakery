import { useEffect, useRef, useState } from 'react';
import AsyncImg from './AsyncImg.jsx';
import Icon from './Icon.jsx';
import Stars from './Stars.jsx';
import { addCakeToCart } from './ProductCard.jsx';
import { api, ApiError } from '../lib/api.js';
import { cakeImage } from '../lib/images.js';
import { fmtDate, fmtPrice } from '../lib/format.js';
import { weightOptions, baseWeight, priceFor } from '../lib/constants.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed.js';

function Inner({ cake }) {
  const cart = useCart(); const { user } = useAuth(); const { closeProduct, openLogin } = useUI(); const toast = useToast(); const wish = useWishlist();
  const { track } = useRecentlyViewed();
  const [weight, setWeight] = useState(baseWeight(cake));
  const [flavor, setFlavor] = useState(cake.flavor);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');
  const { candles: CANDLES, knives: KNIVES } = useSettings().content.personalize;   // managed in the admin panel
  const [candle, setCandle] = useState(CANDLES[0]);
  const [knife, setKnife] = useState(KNIVES[0]);
  const [photo, setPhoto] = useState(null);       // {url, name}
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('desc');
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [flavors, setFlavors] = useState([cake.flavor]);
  const [reviews, setReviews] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { track(cake); }, [cake]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api(`/api/cakes?category=${encodeURIComponent(cake.category)}&limit=30`).then(d => setFlavors([...new Set([cake.flavor, ...d.items.map(c => c.flavor)])].filter(Boolean).slice(0, 4))).catch(() => {});
    api(`/api/cakes/${cake._id}/reviews`).then(d => setReviews(d.items)).catch(() => setReviews([]));
  }, [cake]);

  const price = priceFor(cake, weight);
  const was = cake.was ? priceFor(cake, weight, 'was') : 0;

  async function pickPhoto(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!user) { toast('Please log in to upload a photo', 'info', 'upload'); openLogin(window.location.pathname); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('photo', file);
      const d = await api('/api/uploads', { method: 'POST', form: fd });
      setPhoto({ url: d.url, name: file.name });
      toast('Photo uploaded — our team will confirm the design before baking', 'success', 'upload');
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Upload failed', 'error'); }
    setUploading(false);
  }

  function add() {
    addCakeToCart(cart, cake, { weight, flavor, qty, message: message.trim(), candle, knife, photoUrl: photo?.url });
    toast(`${cake.name} added to cart`, 'success');
    closeProduct();
  }

  const nImg = cake.images?.length || 3;   // the real photos the owner uploaded; 3 stock looks only if there are none
  return (
    <div className="modal-box">
      <button className="modal-close" onClick={closeProduct} aria-label="Close product details"><Icon name="x" /></button>
      <div className="pd-grid">
        <div className="pd-gallery">
          <div className={`pd-main-img ${zoom ? 'zoomed' : ''}`} onClick={() => setZoom(z => !z)}>
            <div className="pd-main-img-photo"><AsyncImg src={cakeImage(cake, img)} alt={cake.name} /></div>
            {nImg > 1 && <button className="pd-nav-btn pd-nav-prev" aria-label="Previous photo" onClick={e => { e.stopPropagation(); setImg(i => (i + nImg - 1) % nImg); }}><Icon name="chev-left" /></button>}
            {nImg > 1 && <button className="pd-nav-btn pd-nav-next" aria-label="Next photo" onClick={e => { e.stopPropagation(); setImg(i => (i + 1) % nImg); }}><Icon name="chev-right" /></button>}
          </div>
          <div className="pd-thumbs">
            {Array.from({ length: nImg }, (_, v) => v).map(v => <button key={v} className={v === img ? 'active' : ''} onClick={() => setImg(v)}><div style={{ width: '100%', height: '100%' }}><AsyncImg src={cakeImage(cake, v)} alt="" /></div></button>)}
          </div>
        </div>
        <div className="pd-info">
          <div className="prod-cat">{cake.category}</div>
          <h2>{cake.name}</h2>
          <div className="prod-meta">
            {cake.reviewCount > 0 ? <><span className="rate"><Icon name="star" /> {cake.rating}</span><span className="dot" /><span>{cake.reviewCount} reviews</span></> : <span>No reviews yet</span>}
            <span className="dot" /><span className={`egg-badge ${cake.egg ? 'egg' : ''}`} /> <span>{cake.egg ? 'Contains egg' : 'Eggless'}</span>
          </div>
          <div className="pd-price-row">
            <span className="now">{fmtPrice(price)}</span>
            {was > 0 && <><span className="was">{fmtPrice(was)}</span><span className="save">Save {Math.round((1 - price / was) * 100)}%</span></>}
          </div>

          <div className="opt-group"><h5>{weightOptions(cake).length > 1 ? 'Weight' : 'Pack size'}</h5>
            <div className="opt-pills">{weightOptions(cake).map(w => <button key={w} className={`opt-pill ${w === weight ? 'sel' : ''}`} onClick={() => setWeight(w)}>{w}</button>)}</div>
          </div>
          <div className="opt-group"><h5>Flavor</h5>
            <div className="opt-pills">{flavors.map(f => <button key={f} className={`opt-pill ${f === flavor ? 'sel' : ''}`} onClick={() => setFlavor(f)}>{f}</button>)}</div>
          </div>
          <div className="opt-group"><h5>Quantity</h5>
            <div className="qty-stepper">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}><Icon name="minus" size={12} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty(q => Math.min(20, q + 1))}><Icon name="plus" size={12} /></button>
            </div>
          </div>

          <div className="pd-tabs">
            {[['desc', 'Description'], ['custom', 'Personalize'], ['reviews', 'Reviews']].map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}
          </div>

          <div className={`pd-tabpanel ${tab === 'desc' ? 'active' : ''}`}>
            <p>{cake.desc}</p>
            <div className="opt-group" style={{ marginTop: 16 }}><h5>Ingredients</h5><p style={{ fontSize: 12.8 }}>Wheat flour, sugar, butter, fresh cream, cocoa, seasonal fruit, natural flavoring.</p></div>
            <div className="opt-group"><h5>Allergens</h5><p style={{ fontSize: 12.8 }}>Contains gluten, dairy{cake.egg ? ', eggs' : ''}. May contain nuts.</p></div>
          </div>

          <div className={`pd-tabpanel ${tab === 'custom' ? 'active' : ''}`}>
            <div className="pd-field"><label>Message on cake</label>
              <input type="text" maxLength={24} value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Happy Birthday Aria" />
            </div>
            <div className="pd-field"><label>Upload a photo (for photo cakes)</label>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickPhoto} />
              <div className="upload-drop" onClick={() => !uploading && fileRef.current.click()}>
                <Icon name="camera" style={{ width: 18, height: 18, margin: '0 auto 6px', color: 'var(--ink-faint)' }} />
                {uploading ? 'Uploading…' : photo ? `✓ ${photo.name} — click to replace` : 'Click to upload image (JPG, PNG or WebP, up to 5 MB)'}
              </div>
              {photo && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setPhoto(null)}>Remove photo</button>}
            </div>
            <div className="opt-group"><h5>Choose candle</h5>
              <div className="opt-pills">{CANDLES.map(c => <button key={c} className={`opt-pill ${c === candle ? 'sel' : ''}`} onClick={() => setCandle(c)}>{c}</button>)}</div>
            </div>
            <div className="opt-group"><h5>Choose knife</h5>
              <div className="opt-pills">{KNIVES.map(k => <button key={k} className={`opt-pill ${k === knife ? 'sel' : ''}`} onClick={() => setKnife(k)}>{k}</button>)}</div>
            </div>
          </div>

          <div className={`pd-tabpanel ${tab === 'reviews' ? 'active' : ''}`}>
            {reviews === null ? <p style={{ fontSize: 12.5 }}>Loading…</p> : reviews.length === 0
              ? <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>No reviews yet. Reviews appear here after customers receive this cake.</p>
              : reviews.map(r => (
                <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 12.8 }}>{r.name}</b><span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{fmtDate(r.date)}</span></div>
                  <div className="review-stars" style={{ margin: '5px 0' }}><Stars rating={r.rating} size={12} /></div>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{r.comment}</p>
                </div>
              ))}
          </div>

          <div className="pd-cta-row">
            <button className="btn btn-outline" onClick={() => wish.toggle(cake._id)} aria-label="Wishlist"><Icon name={wish.has(cake._id) ? 'heart-fill' : 'heart'} size={16} /></button>
            <button className="btn btn-primary btn-block" onClick={add}>Add to Cart — {fmtPrice(price * qty)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductModal() {
  const { product, closeProduct } = useUI();
  return (
    <div className={`modal-overlay ${product ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && closeProduct()}>
      {product && <Inner key={product._id} cake={product} />}
    </div>
  );
}
