import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AsyncImg from '../components/AsyncImg.jsx';
import Icon from '../components/Icon.jsx';
import Stars from '../components/Stars.jsx';
import ProductCard from '../components/ProductCard.jsx';
import NewsletterForm from '../components/NewsletterForm.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed.js';
import { api, assetUrl } from '../lib/api.js';
import { useOccasions } from '../hooks/useOccasions.js';
import { useCategories } from '../hooks/useCategories.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { THEME_PHOTOS } from '../lib/images.js';
import { fmtDate } from '../lib/format.js';

const useReviewSummary = () => {
  const [s, setS] = useState(null);
  useEffect(() => { api('/api/reviews/summary').then(setS).catch(() => setS({ count: 0, avg: 0, distribution: {} })); }, []);
  return s;
};

// Only shows a rating once there are enough real reviews to mean something.
function HeroRating() {
  const s = useReviewSummary();
  return (
    <div className="trust-item stars">
      <span className="ic"><Icon name="star" /></span>
      {s && s.count >= 5 ? <span><b>{s.avg}/5</b> from {s.count} customer reviews</span> : <span><b>Baked to order</b>, every order</span>}
    </div>
  );
}

function Categories() {
  const navigate = useNavigate(); const CATEGORIES = useCategories();
  return (
    <div className="cat-scroller reveal" id="categoryScroller">
      {CATEGORIES.map(c => (
        <div key={c.slug} className="cat-card" onClick={() => navigate(`/shop?category=${c.slug}`)}>
          <div className="ic-wrap">{c.emoji}</div><span>{c.name}</span>
        </div>
      ))}
    </div>
  );
}

const TABS = [['bestsellers', 'bestseller', 'Best Sellers'], ['new', 'new', 'New Arrivals'], ['trending', 'trending', 'Trending Now'], ['seasonal', 'seasonal', 'Seasonal Specials']];
function Featured() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('bestsellers'); const [items, setItems] = useState(null);
  useEffect(() => {
    setItems(null);
    const tag = TABS.find(t => t[0] === tab)[1];
    api(`/api/cakes?tags=${tag}&limit=8`).then(d => setItems(d.items)).catch(() => setItems([]));
  }, [tab]);
  return (
    <section className="section">
      <div className="container">
        <div className="section-head reveal"><span className="eyebrow">The Selection</span><h2 className="h-section">Best sellers &amp; new arrivals</h2></div>
        <div className="tab-row reveal">{TABS.map(([k, , l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="prod-grid reveal stagger">
          {items === null ? Array(4).fill(0).map((_, i) => <div key={i} className="prod-card skel"><div className="prod-media" /><div className="prod-body"><div className="sk-line" style={{ width: '40%' }} /><div className="sk-line" style={{ width: '80%', height: 16 }} /><div className="sk-line" style={{ width: '50%', height: 20, marginTop: 10 }} /></div></div>)
            : items.length === 0 ? <div className="empty-state" style={{ gridColumn: '1/-1' }}><p>Nothing here yet — check back soon.</p></div>
            : items.map((c, i) => <ProductCard key={c._id} cake={c} idx={i} />)}
        </div>
        <div style={{ textAlign: 'center', marginTop: 44 }}><button className="btn btn-outline" onClick={() => navigate('/shop')}>View All Cakes <Icon name="chev-right" size={15} /></button></div>
      </div>
    </section>
  );
}

function Recent() {
  const { items } = useRecentlyViewed();
  if (!items.length) return null;
  return (
    <section className="section" style={{ paddingTop: 0, paddingBottom: 0 }}>
      <div className="container">
        <div className="section-head reveal"><span className="eyebrow">Welcome Back</span><h2 className="h-section" style={{ fontSize: '1.7rem' }}>Recently viewed</h2></div>
        <div className="prod-grid reveal" style={{ marginBottom: 60 }}>{items.slice(0, 4).map((c, i) => <ProductCard key={c._id} cake={c} idx={i} />)}</div>
      </div>
    </section>
  );
}

function Occasions() {
  const navigate = useNavigate(); const OCCASIONS = useOccasions(); const cycle = ['chocolate', 'blush', 'gold', 'fruit', 'vanilla', 'caramel', 'pistachio', 'redvelvet'];
  return (
    <div className="occ-grid reveal stagger">
      {OCCASIONS.map((o, i) => (
        <div key={o.name} className="occ-card" onClick={() => navigate(`/shop?occasions=${o.slug}`)}>
          <div className="art" style={{ background: `linear-gradient(140deg,${o.c1},${o.c2})` }}><AsyncImg src={THEME_PHOTOS[cycle[i % cycle.length]][i % 2]} alt={o.name} /></div>
          <div className="ov"><span>{o.name}</span></div>
        </div>
      ))}
    </div>
  );
}

function Offers() {
  const toast = useToast(); const [items, setItems] = useState([]);
  useEffect(() => { api('/api/coupons').then(d => setItems(d.items)).catch(() => {}); }, []);
  if (!items.length) return null;
  return (
    <div className="offer-grid reveal stagger">
      {items.map((c, i) => (
        <div key={c.code} className={`offer-card o${(i % 3) + 1}`}>
          <svg className="patt" viewBox="0 0 24 24"><use href="#ic-sparkle" /></svg>
          <span className="mono-tag" style={{ opacity: 0.8 }}>Coupon Code</span><b className="code">{c.code}</b><p>{c.desc}</p>
          <button className="copy-btn" onClick={() => { navigator.clipboard?.writeText(c.code); toast('Coupon code copied — paste it in your cart', 'success', 'tag'); }}>Copy Code</button>
        </div>
      ))}
    </div>
  );
}

function Reviews() {
  const s = useReviewSummary(); const [items, setItems] = useState([]);
  useEffect(() => { api('/api/reviews/featured').then(d => setItems(d.items)).catch(() => {}); }, []);
  return (
    <section className="section" id="home-reviews">
      <div className="container">
        <div className="section-head center reveal"><span className="eyebrow">Real Customers</span><h2 className="h-section">What our customers say</h2></div>
        {s && s.count > 0 ? (
          <div className="review-summary reveal">
            <div><div className="big">{s.avg}</div><div className="review-stars"><Stars rating={s.avg} size={16} /></div>
              <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>{s.count} review{s.count === 1 ? '' : 's'}</p></div>
            <div className="review-bars">{[5, 4, 3, 2, 1].map(n => {
              const pct = Math.round(((s.distribution[n] || 0) / s.count) * 100);
              return <div className="rb" key={n}><span>{n}★</span><div className="track"><div className="fill" style={{ width: pct + '%' }} /></div><span>{pct}%</span></div>;
            })}</div>
          </div>
        ) : <div className="empty-state"><Icon name="star" /><p>Reviews from customers appear here after their cakes are delivered.</p></div>}
        <div className="review-grid reveal stagger">
          {items.map(r => (
            <div key={r.id} className="review-card">
              <div className="review-top"><span className="av">{r.name.charAt(0)}</span><div><h5>{r.name} <Icon name="check-circle" className="verified" /></h5><small>{fmtDate(r.date)}{r.cake ? ` · ${r.cake}` : ''}</small></div></div>
              <div className="review-stars"><Stars rating={r.rating} /></div><p className="txt">{r.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate(); const { setSpinOpen } = useUI();
  const { store: SITE, content, spinEnabled } = useSettings(); const about = content.about; const home = content.home || {};
  const years = new Date().getFullYear() - SITE.foundedYear;
  const hasYear = !!SITE.foundedYear && years >= 1;   // never print "0 years" or "since null"
  return (
    <section className="page active" data-page="home">
  <section id="hero">
    <div className="container hero-grid">
      <div className="hero-copy reveal in">
        <span className="eyebrow">Maison Dorée · Atelier de Gâteaux</span>
        <h1>Cake, made to feel like a <em>little ceremony.</em></h1>
        <p className="lede">Layered by hand, finished in gold leaf and shipped the same day — every cake is baked to order by our pastry atelier, never from a freezer.</p>
        <div className="hero-cta">
          <button className="btn btn-primary" data-nav="shop">
            <svg className="icon" style={{width: "16px", height: "16px"}}><use href="#ic-cart"/></svg> Order Now
          </button>
          <button className="btn btn-ghost" data-nav="shop">Explore Cakes
            <svg className="icon" style={{width: "15px", height: "15px"}}><use href="#ic-chev-right"/></svg>
          </button>
        </div>
        <div className="hero-trust">
          <HeroRating />
          <div className="trust-item fast">
            <span className="ic"><svg className="icon"><use href="#ic-truck"/></svg></span>
            <span><b>Same-day</b> delivery available</span>
          </div>
          <div className="trust-item fresh">
            <span className="ic"><svg className="icon"><use href="#ic-leaf"/></svg></span>
            <span><b>Freshly baked</b>, never frozen</span>
          </div>
        </div>
      </div>
      <div className="hero-stage hero-stage--showcase" id="heroStage">
        <div className="hero-showcase" id="heroArch">
          <div className="showcase-main">
            <AsyncImg src={home.heroMain ? assetUrl(home.heroMain) : "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=88"} alt="Rich chocolate celebration cake from Maison Dorée" loading="eager" />
            <div className="showcase-main__veil"></div>
            <div className="showcase-main__label"><span>01</span><span>Chocolate<br />signature</span></div>
          </div>
          <div className="showcase-side">
            <div className="showcase-side__image">
              <AsyncImg src={home.heroSide ? assetUrl(home.heroSide) : "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=86"} alt="Berry cake slice with fresh fruit" loading="lazy" />
            </div>
            <div className="showcase-side__copy"><span className="eyebrow-mini">THE ATELIER NOTE</span><strong>Made for<br />the moment.</strong><span>Hand-finished daily<br />in small batches.</span></div>
          </div>
          <div className="showcase-index">MAISON DORÉE <span>/</span> 2026</div>
          <div className="showcase-rule"></div>
        </div>
      </div>
    </div>
    <div className="hero-scroll-cue"><span>Scroll</span><span className="line"></span></div>
  </section>
  <div className="marquee-strip">
    <div className="marquee-track">
      <span><svg><use href="#ic-sparkle"/></svg>Freshly Baked Daily</span>
      <span><svg><use href="#ic-truck"/></svg>Same Day Delivery</span>
      <span><svg><use href="#ic-leaf"/></svg>Eggless Options Available</span>
      <span><svg><use href="#ic-award"/></svg>Award-Winning Pastry Chefs</span>
      <span><svg><use href="#ic-sparkle"/></svg>Freshly Baked Daily</span>
      <span><svg><use href="#ic-truck"/></svg>Same Day Delivery</span>
      <span><svg><use href="#ic-leaf"/></svg>Eggless Options Available</span>
      <span><svg><use href="#ic-award"/></svg>Award-Winning Pastry Chefs</span>
    </div>
  </div>

      <section className="section" style={{ paddingBottom: 70 }}>
        <div className="container">
          <div className="section-head reveal"><span className="eyebrow">Browse</span><h2 className="h-section">Shop by category</h2></div>
          <Categories />
        </div>
      </section>
      <Recent />
      <Featured />
  <section className="section" style={{paddingTop: "0"}}>
    <div className="container">
      <div className="flash-sale reveal" style={{background: "linear-gradient(120deg,#3A2216,#241811)"}}>
        <div>
          <span className="eyebrow" style={{color: "var(--gold-300)"}}>Design Your Own</span>
          <h3>Build a cake that's entirely yours.</h3>
          <p>Pick the shape, flavor, cream, colors and topper — watch it come together live, then we bake it.</p>
        </div>
        <button className="btn btn-gold" data-nav="builder">Start Building <svg className="icon" style={{width: "15px", height: "15px"}}><use href="#ic-chev-right"/></svg></button>
      </div>
    </div>
  </section>
      <section className="section" id="home-occasions">
        <div className="container">
          <div className="section-head reveal"><span className="eyebrow">For Every Moment</span><h2 className="h-section">Shop by occasion</h2></div>
          <Occasions />
        </div>
      </section>
      <section className="section" id="home-offers" style={{ background: 'var(--bg-alt)' }}>
        <div className="container">
          <div className="section-head reveal"><span className="eyebrow">Sweet Deals</span><h2 className="h-section">Offers &amp; coupons</h2></div>
          <Offers />
          {spinEnabled && <div style={{ textAlign: 'center', marginTop: 30 }}>
            <button className="btn btn-outline" onClick={() => setSpinOpen(true)}><Icon name="refresh" size={15} /> Spin &amp; win a coupon</button>
          </div>}
        </div>
      </section>
      <Reviews />
  <section className="section" style={{background: "var(--bg-alt)"}}>
    <div className="container about-hero">
      <div className="story-art reveal-scale">
        <div className="story-art-main">
          <AsyncImg src={about.photoMain ? assetUrl(about.photoMain) : "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80"} alt="Our pastry atelier" />
        </div>
        <div className="story-art-accent">
          <AsyncImg src={about.photoAccent ? assetUrl(about.photoAccent) : "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80"} alt="Fresh pastries from the oven" />
        </div>
        {hasYear && <div className="story-art-tag"><b>{years} yrs</b><span>Est. {SITE.foundedYear}</span></div>}
      </div>
      <div className="reveal">
        <span className="eyebrow">Our Story</span>
        <h2 className="h-section" style={{margin: "14px 0 18px"}}>{hasYear && about.tagline ? `${years} years. ${about.tagline}` : about.tagline || about.title}</h2>
        <p className="lede">{about.story[0]}</p>
        <button className="btn btn-primary" style={{marginTop: "26px"}} data-nav="about">Meet the Atelier</button>
      </div>
    </div>
  </section>
      <section className="section" style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="panel newsletter-banner reveal">
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Stay Sweet</span>
            <h2 className="h-section" style={{ margin: '12px 0 10px' }}>Get new flavors and offers first</h2>
            <p className="lede" style={{ margin: '0 auto 22px' }}>Join our list for new flavors, seasonal drops and early offer access.</p>
            <NewsletterForm style={{ maxWidth: 420, margin: '0 auto' }} inputStyle={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }} />
          </div>
        </div>
      </section>
    </section>
  );
}
