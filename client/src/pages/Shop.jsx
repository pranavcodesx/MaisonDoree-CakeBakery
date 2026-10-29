import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useOccasions } from '../hooks/useOccasions.js';
import { useCategories } from '../hooks/useCategories.js';
import { fmtPrice } from '../lib/format.js';

const SORTS = [['popular', 'Sort: Popular'], ['price-asc', 'Price: Low to High'], ['price-desc', 'Price: High to Low'], ['rating', 'Rating'], ['new', 'Newest']];
const csv = v => (v ? v.split(',').filter(Boolean) : []);

export default function Shop() {
  const navigate = useNavigate(); const [sp, setSp] = useSearchParams(); const CATEGORIES = useCategories(); const OCCASIONS = useOccasions();
  const [meta, setMeta] = useState({ flavors: [], minPrice: 0, maxPrice: 0 });
  const [items, setItems] = useState(null); const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false); const [filtersOpen, setFiltersOpen] = useState(false);

  const f = {
    category: sp.get('category') || '', q: sp.get('q') || '', sort: sp.get('sort') || 'popular', flavors: csv(sp.get('flavors')), occasions: csv(sp.get('occasions')),
    maxPrice: sp.get('maxPrice') || '', eggless: sp.get('eggless') === 'true', egg: sp.get('egg') === 'true', onOffer: sp.get('onOffer') === 'true', minRating: sp.get('minRating') || '',
  };
  const update = patch => setSp(prev => { const n = new URLSearchParams(prev); Object.entries(patch).forEach(([k, v]) => { if (v === '' || v === false || v == null || (Array.isArray(v) && !v.length)) n.delete(k); else n.set(k, Array.isArray(v) ? v.join(',') : String(v)); }); return n; }, { replace: true });
  const toggleIn = (key, val) => update({ [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val] });

  useEffect(() => { api('/api/cakes/meta').then(setMeta).catch(() => {}); }, []);
  const queryKey = sp.toString();
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (f.category) p.set('category', f.category); if (f.q) p.set('q', f.q); p.set('sort', f.sort);
    if (f.flavors.length) p.set('flavors', f.flavors.join(',')); if (f.occasions.length) p.set('occasions', f.occasions.join(','));
    if (f.maxPrice) p.set('maxPrice', f.maxPrice); if (f.eggless) p.set('eggless', 'true'); if (f.egg) p.set('egg', 'true'); if (f.onOffer) p.set('onOffer', 'true'); if (f.minRating) p.set('minRating', f.minRating);
    return p.toString();
  }, [queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPage(1); setItems(null); api(`/api/cakes?${qs}&limit=12&page=1`).then(d => { setItems(d.items); setTotal(d.total); }).catch(() => { setItems([]); setTotal(0); }); }, [qs]);
  async function more() { const n = page + 1; const d = await api(`/api/cakes?${qs}&limit=12&page=${n}`); setItems(l => [...l, ...d.items]); setPage(n); }

  const maxP = meta.maxPrice || 4000; const price = f.maxPrice ? Number(f.maxPrice) : maxP;
  const crumb = f.category ? CATEGORIES.find(c => c.slug === f.category)?.name || f.category : 'All Cakes';
  const clear = () => setSp({}, { replace: true });
  const sortLabel = SORTS.find(s => s[0] === f.sort)?.[1];
  const Group = ({ title, children, last }) => <div className="filter-group" style={last ? { borderBottom: 'none' } : undefined}><h4>{title}</h4>{children}</div>;
  const Check = ({ checked, onChange, label }) => <label className="filter-opt"><input type="checkbox" checked={checked} onChange={onChange} /> {label}</label>;

  return (
    <section className="page active" data-page="shop">
      <div className="page-hero-banner"><div className="container">
        <span className="eyebrow">The Full Menu</span><h1 className="h-section">{f.q ? `Results for "${f.q}"` : 'All Cakes'}</h1>
        <div className="breadcrumb"><span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span><Icon name="chev-right" /><span>{crumb}</span></div>
      </div></div>
      <section className="section" style={{ paddingTop: 56 }}><div className="container">
        <div className="toolbar">
          <div className="chip-row">
            <button className={`chip ${!f.category ? 'active' : ''}`} onClick={() => update({ category: '' })}>All Cakes</button>
            {CATEGORIES.map(c => <button key={c.slug} className={`chip ${f.category === c.slug ? 'active' : ''}`} onClick={() => update({ category: c.slug })}>{c.name}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 10, flex: 'none' }}>
            <button className="btn btn-ghost btn-sm" id="mobileFilterBtn" onClick={() => setFiltersOpen(true)}><Icon name="filter" size={14} /> Filters</button>
            <div className="custom-select">
              <button className="custom-select-btn" type="button" aria-expanded={sortOpen} onClick={() => setSortOpen(o => !o)}><span>{sortLabel}</span><Icon name="chev-down" /></button>
              <div className={`custom-select-menu ${sortOpen ? 'open' : ''}`} role="listbox">
                {SORTS.map(([v, l]) => <button key={v} className={`custom-select-opt ${f.sort === v ? 'sel' : ''}`} role="option" onClick={() => { update({ sort: v === 'popular' ? '' : v }); setSortOpen(false); }}>{l}</button>)}
              </div>
            </div>
          </div>
        </div>
        <div className="shop-layout">
          <div className={`filter-backdrop ${filtersOpen ? 'open' : ''}`} onClick={() => setFiltersOpen(false)} />
          <aside className={`filter-side ${filtersOpen ? 'open' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h4 style={{ fontFamily: 'var(--f-display)', fontSize: 18 }}>Filters</h4>
              <button className="nav-icon-btn" id="filterCloseBtn" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><Icon name="x" /></button></div>
            <Group title="Price">
              <input type="range" min={meta.minPrice || 0} max={maxP} step="50" value={price} onChange={e => update({ maxPrice: Number(e.target.value) >= maxP ? '' : e.target.value })} />
              <div className="range-row"><span>{fmtPrice(meta.minPrice || 0)}</span><span>{fmtPrice(price)}</span></div>
            </Group>
            <Group title="Flavor">{meta.flavors.map(x => <Check key={x} label={x} checked={f.flavors.includes(x)} onChange={() => toggleIn('flavors', x)} />)}</Group>
            <Group title="Occasion">{OCCASIONS.map(o => { const s = o.slug; return <Check key={s} label={o.name} checked={f.occasions.includes(s)} onChange={() => toggleIn('occasions', s)} />; })}</Group>
            <Group title="Rating">{[4.5, 4, 3].map(r => <Check key={r} label={`${r}★ & up`} checked={f.minRating === String(r)} onChange={() => update({ minRating: f.minRating === String(r) ? '' : r })} />)}</Group>
            <Group title="Type">
              <Check label="Eggless" checked={f.eggless} onChange={() => update({ eggless: !f.eggless, egg: false })} />
              <Check label="Contains Egg" checked={f.egg} onChange={() => update({ egg: !f.egg, eggless: false })} />
            </Group>
            <Group title="Offers" last><Check label="On offer" checked={f.onOffer} onChange={() => update({ onOffer: !f.onOffer })} /></Group>
            <button className="btn btn-outline btn-sm btn-block" onClick={clear}>Clear all filters</button>
          </aside>
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 18, fontWeight: 700 }}>{items === null ? 'Loading…' : `Showing ${items.length} of ${total} cake${total === 1 ? '' : 's'}`}</p>
            <div className="prod-grid">
              {items === null ? Array(6).fill(0).map((_, i) => <div key={i} className="prod-card skel"><div className="prod-media" /><div className="prod-body"><div className="sk-line" style={{ width: '40%' }} /><div className="sk-line" style={{ width: '80%', height: 16 }} /><div className="sk-line" style={{ width: '50%', height: 20, marginTop: 10 }} /></div></div>)
                : items.length === 0 ? <div className="empty-state" style={{ gridColumn: '1/-1' }}><h4>No cakes match your filters</h4><p>Try removing a filter or two.</p><button className="btn btn-primary btn-sm" onClick={clear}>Clear filters</button></div>
                : items.map((c, i) => <ProductCard key={c._id} cake={c} idx={i} />)}
            </div>
            {items && items.length < total && <div style={{ textAlign: 'center', marginTop: 44 }}><button className="btn btn-ghost" onClick={more}>Load more cakes</button></div>}
          </div>
        </div>
      </div></section>
    </section>
  );
}
