import { useEffect, useState } from 'react';
import AsyncImg from '../components/AsyncImg.jsx';
import Icon from '../components/Icon.jsx';
import { api, assetUrl } from '../lib/api.js';
import { useSettings } from '../context/SettingsContext.jsx';

const STOCK_MAIN = 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80';
const STOCK_ACCENT = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80';

// Real numbers from the database; a tile is only shown once it has something true to say.
function Stats() {
  const { store: SITE } = useSettings();
  const [reviews, setReviews] = useState(null); const [stats, setStats] = useState(null);
  useEffect(() => { api('/api/reviews/summary').then(setReviews).catch(() => {}); api('/api/stats/public').then(setStats).catch(() => {}); }, []);
  const years = new Date().getFullYear() - SITE.foundedYear;
  const tiles = [SITE.foundedYear && years >= 1 && [years, 'Years Baking'], stats?.deliveredOrders > 0 && [stats.deliveredOrders, 'Cakes Delivered'], reviews?.count >= 5 && [reviews.avg + '★', 'Average Rating'], SITE.citiesServed > 0 && [SITE.citiesServed, SITE.citiesServed === 1 ? 'City Served' : 'Cities Served']].filter(Boolean);
  if (!tiles.length) return null;   // a brand-new shop has nothing true to brag about yet
  return <div className="container stat-strip reveal stagger">{tiles.map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}</div>;
}

// Photos the owner uploads in the admin panel (Website content → Kitchen gallery).
function Gallery({ photos }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="gallery-masonry reveal">{photos.map((src, i) => <div key={src + i} className="art gallery-art" style={{ height: 140 + (i % 3) * 40 }} onClick={() => setOpen(i)}><AsyncImg src={assetUrl(src)} alt={`Our kitchen, photo ${i + 1}`} /></div>)}</div>
      <div className={`modal-overlay ${open !== null ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setOpen(null)}>
        <div className="modal-box gallery-lightbox-box">
          <button className="modal-close" onClick={() => setOpen(null)} aria-label="Close image"><Icon name="x" /></button>
          <div className="gallery-lightbox-img">{open !== null && <AsyncImg src={assetUrl(photos[open])} alt="Our kitchen" />}</div>
        </div>
      </div>
    </>
  );
}

export default function About() {
  const { store: SITE, content } = useSettings();
  const { about, team: TEAM, founder: FOUNDER } = content;
  const years = new Date().getFullYear() - SITE.foundedYear;
  const hasYear = !!SITE.foundedYear && years >= 1;   // never print "0 years" or "since null"
  return (
    <section className="page active" data-page="about">
      <div className="page-hero-banner"><div className="container"><span className="eyebrow">Our Story</span><h1 className="h-section">{about.title}</h1></div></div>
      <section className="section">
        <div className="container about-hero">
          <div className="reveal">
            {about.story.map((p, i) => <p key={i} className="lede" style={i ? { marginTop: 16 } : undefined}>{p}</p>)}
            {FOUNDER.name && (
              <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: 26, fontStyle: 'italic', color: 'var(--accent-ink)' }}>{FOUNDER.name}</span>
                <span style={{ width: 1, height: 30, background: 'var(--line)' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{FOUNDER.title}</span>
              </div>
            )}
          </div>
          <div className="story-art reveal-scale">
            <div className="story-art-main"><AsyncImg src={about.photoMain ? assetUrl(about.photoMain) : STOCK_MAIN} alt="Our pastry atelier" /></div>
            <div className="story-art-accent"><AsyncImg src={about.photoAccent ? assetUrl(about.photoAccent) : STOCK_ACCENT} alt="Pastries fresh from the oven" /></div>
            {hasYear && <div className="story-art-tag"><b>{years} yrs</b><span>Est. {SITE.foundedYear}</span></div>}
          </div>
        </div>
        <Stats />
      </section>

      {TEAM.length > 0 && (
        <section className="section" style={{ background: 'var(--bg-alt)' }}>
          <div className="container">
            <div className="section-head center reveal"><span className="eyebrow">Meet the Team</span><h2 className="h-section">Our pastry chefs</h2></div>
            <div className="chef-grid reveal stagger">
              {TEAM.map((ch, i) => (
                <div key={ch.name + i} className="chef-card">
                  <div className="art">{ch.photo ? <AsyncImg src={assetUrl(ch.photo)} alt={ch.name} /> : <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-display)', fontSize: 64, color: 'var(--gold-700)' }}>{ch.name.charAt(0)}</span>}</div>
                  <h5>{ch.name}</h5>{ch.role && <span>{ch.role}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {about.features.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head center reveal"><span className="eyebrow">Why {SITE.name}</span><h2 className="h-section">Why people choose us</h2></div>
            <div className="why-grid reveal stagger">
              {about.features.map((f, i) => <div key={i} className="why-card"><span className="ic"><svg className="icon"><use href={`#ic-${f.icon}`} /></svg></span><h5>{f.title}</h5><p>{f.text}</p></div>)}
            </div>
          </div>
        </section>
      )}

      {about.gallery.length > 0 && (
        <section className="section" style={{ background: 'var(--bg-alt)' }}>
          <div className="container">
            <div className="section-head center reveal"><span className="eyebrow">A Peek Inside</span><h2 className="h-section">Our kitchen gallery</h2></div>
            <Gallery photos={about.gallery} />
          </div>
        </section>
      )}
    </section>
  );
}
