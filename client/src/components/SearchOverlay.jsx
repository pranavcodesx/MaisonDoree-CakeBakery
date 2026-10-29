import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import CakeImage from './CakeImage.jsx';
import { useUI } from '../context/UIContext.jsx';
import { api } from '../lib/api.js';
import { fmtPrice } from '../lib/format.js';

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen, openProduct } = useUI();
  const [q, setQ] = useState(''); const [res, setRes] = useState(null); const inputRef = useRef(null);
  useEffect(() => { if (searchOpen) setTimeout(() => inputRef.current?.focus(), 120); else { setQ(''); setRes(null); } }, [searchOpen]);
  useEffect(() => {
    if (!q.trim()) { setRes(null); return undefined; }
    const t = setTimeout(() => api(`/api/cakes?q=${encodeURIComponent(q.trim())}&limit=8`).then(d => setRes(d.items)).catch(() => setRes([])), 220);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { const h = e => e.key === 'Escape' && setSearchOpen(false); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [setSearchOpen]);

  function voice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = false;
    r.onresult = e => setQ(e.results[0][0].transcript);
    r.start();
  }
  return (
    <div id="searchOverlay" className={searchOpen ? 'open' : ''} onClick={e => e.target === e.currentTarget && setSearchOpen(false)}>
      <div className="search-box">
        <div className="search-input-row">
          <Icon name="search" />
          <input ref={inputRef} type="text" placeholder="Search cakes, flavors, occasions..." value={q} onChange={e => setQ(e.target.value)} />
          <button className="mic-btn" aria-label="Voice search" onClick={voice}><Icon name="mic" /></button>
          <button className="nav-icon-btn" aria-label="Close search" onClick={() => setSearchOpen(false)}><Icon name="x" /></button>
        </div>
        <div className="search-results">
          {res === null ? <div className="search-empty">Try searching "chocolate", "eggless" or "wedding"</div>
            : res.length === 0 ? <div className="search-empty">No cakes found for "{q}"</div>
            : res.map((c, i) => (
              <div key={c._id} className="sr-item" onClick={() => { setSearchOpen(false); openProduct(c); }}>
                <div className="art" style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden' }}><CakeImage cake={c} variant={i % 3} /></div>
                <div><div className="sr-name">{c.name}</div><div className="sr-cat">{c.category} · {c.flavor}</div></div>
                <span className="sr-price">{fmtPrice(c.price)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
