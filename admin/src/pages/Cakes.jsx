import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Modal, { Confirm } from '../components/Modal.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import { Badge, Field, Pagination, Empty, ErrorBox, Loading, PageHead, useLoad, useDebounced } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, assetUrl, downloadFile } from '../lib/api.js';
import { fmt, weightLabel, cap } from '../lib/format.js';
import { TAGS, THEMES, WEIGHTS, SIZED, occasionSlug } from '../lib/constants.js';

const blank = { name: '', category: '', flavor: '', price: '', was: '', egg: true, tags: [], occasions: [], theme: 'chocolate', weightG: 1000, desc: '', images: [], active: true };

function CakeForm({ cake, categories, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(blank); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false);
  useEffect(() => { if (cake !== undefined) { setErr({}); setF(cake ? { ...blank, ...cake, was: cake.was || '', price: cake.price, images: cake.images || [] } : { ...blank, category: categories[0]?.slug || '' }); } }, [cake]); // eslint-disable-line react-hooks/exhaustive-deps
  // a new cake starts in the first category (also when the category list arrives a moment after the form opens)
  useEffect(() => { if (cake === null && !f.category && categories.length) setF(s => ({ ...s, category: categories[0].slug })); }, [cake, categories, f.category]);
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErr(e => ({ ...e, [k]: '' })); };
  const toggle = (k, v) => set(k, f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v]);
  // the occasion list is managed in Website → Occasions; occasions removed from it stay visible while a cake still uses them
  const [occNames, setOccNames] = useState([]);
  useEffect(() => { api('/settings').then(d => setOccNames(d.settings.content.occasions)).catch(() => {}); }, []);
  const occOptions = [...occNames.map(n => [occasionSlug(n), n]), ...f.occasions.filter(s => !occNames.some(n => occasionSlug(n) === s)).map(s => [s, cap(s.replace(/-/g, ' '))])];
  const weights = WEIGHTS.some(([g]) => g === f.weightG) ? WEIGHTS : [...WEIGHTS, [f.weightG, weightLabel(f.weightG)]];

  async function save() {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter the cake name.';
    if (!f.category) e.category = 'Choose a category.';
    if (!f.flavor.trim()) e.flavor = 'Enter the main flavor.';
    if (!Number(f.price)) e.price = 'Enter the price.';
    if (f.was && Number(f.was) <= Number(f.price)) e.was = 'The original price must be higher than the selling price.';
    if (Object.keys(e).length) { setErr(e); return; }
    setBusy(true);
    try {
      const body = { name: f.name.trim(), category: f.category, occasions: f.occasions, flavor: f.flavor.trim(), price: Number(f.price), was: f.was ? Number(f.was) : null, egg: f.egg, tags: f.tags, theme: f.theme, weightG: Number(f.weightG), desc: f.desc.trim(), images: f.images, active: f.active };
      await api(cake ? `/cakes/${cake._id}` : '/cakes', { method: cake ? 'PUT' : 'POST', body });
      toast(cake ? 'Cake updated' : 'Cake added — it is now live on your website', 'success'); onSaved(); onClose();
    } catch (ex) { setErr({ [ex.field || 'form']: ex.message }); }
    setBusy(false);
  }
  const chip = (active, onClick, label) => <button type="button" key={label} className={`filter-chip ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>;

  return (
    <Modal open={cake !== undefined} wide title={cake ? 'Edit cake' : 'Add a new cake'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : cake ? 'Save changes' : 'Add cake'}</button></>}>
      <Field label="Photos" error={err.images} hint="Add 2–3 photos. The first is the cover; the others appear in the popup gallery on your website. With no photos, a stock picture is used.">
        <ImageUploader value={f.images} onChange={v => set('images', v)} max={5} />
      </Field>
      <div className="form-row2">
        <Field label="Cake name" error={err.name}><input value={f.name} maxLength={80} onChange={e => set('name', e.target.value)} placeholder="e.g. Belgian Chocolate Truffle" /></Field>
        <Field label="Category" error={err.category}><select value={f.category} onChange={e => set('category', e.target.value)}><option value="">Choose a category…</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.emoji} {c.name}{c.active ? '' : ' (hidden)'}</option>)}</select></Field>
      </div>
      <div className="form-row2">
        <Field label="Main flavor" error={err.flavor}><input value={f.flavor} maxLength={40} onChange={e => set('flavor', e.target.value)} placeholder="e.g. Chocolate" /></Field>
        <Field label="Size this price is for" hint={SIZED.includes(f.weightG) ? "Customers can choose 500 g to 3 kg and the price scales automatically." : "Sold as one fixed pack of this size: customers cannot choose a weight. Pick 1 kg or larger for cakes that come in several sizes."}><select value={f.weightG} onChange={e => set('weightG', Number(e.target.value))}>{weights.map(([g, l]) => <option key={g} value={g}>{l}</option>)}</select></Field>
      </div>
      <div className="form-row2">
        <Field label="Selling price (₹)" error={err.price}><input type="number" min="1" value={f.price} onChange={e => set('price', e.target.value)} /></Field>
        <Field label="Original price (₹) — optional" error={err.was} hint="Shows a strike-through price and a % OFF badge."><input type="number" min="0" value={f.was} onChange={e => set('was', e.target.value)} /></Field>
      </div>
      <Field label="Egg"><div className="segmented"><button type="button" className={`segmented-btn ${f.egg ? 'active' : ''}`} onClick={() => set('egg', true)}>Contains egg</button><button type="button" className={`segmented-btn ${!f.egg ? 'active' : ''}`} onClick={() => set('egg', false)}>Eggless</button></div></Field>
      <Field label="Home-page tabs & badges" hint="Bestseller / New / Trending / Seasonal decide which tab the cake appears in on your home page.">
        <div className="filter-chip-row" style={{ flexWrap: 'wrap' }}>{TAGS.map(([k, l]) => chip(f.tags.includes(k), () => toggle('tags', k), l))}</div>
      </Field>
      <Field label="Occasions" hint="Used by “Shop by occasion” and the Occasion filter. Add or rename occasions in Website → Occasions."><div className="filter-chip-row" style={{ flexWrap: 'wrap' }}>{occOptions.map(([slug, label]) => chip(f.occasions.includes(slug), () => toggle('occasions', slug), label))}</div></Field>
      <div className="form-row2">
        <Field label="Stock look when there is no photo"><select value={f.theme} onChange={e => set('theme', e.target.value)}>{THEMES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Visibility"><label className="checkbox-row" style={{ paddingTop: 10 }}><input type="checkbox" checked={f.active} onChange={e => set('active', e.target.checked)} /> Show this cake on the website</label></Field>
      </div>
      <Field label="Description" error={err.desc}><textarea rows={3} maxLength={600} value={f.desc} onChange={e => set('desc', e.target.value)} placeholder="A few lines that make people hungry…" /></Field>
      {err.form && <span className="field-error show" role="alert">{err.form}</span>}
    </Modal>
  );
}

export default function Cakes() {
  const toast = useToast(); const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || 'active'; const category = sp.get('category') || ''; const page = Number(sp.get('page')) || 1;
  const [q, setQ] = useState(sp.get('q') || ''); const dq = useDebounced(q, 300);
  const set = patch => setSp(prev => { const n = new URLSearchParams(prev); Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); return n; }, { replace: true });
  useEffect(() => { set({ q: dq }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  const qs = new URLSearchParams({ status, ...(category && { category }), ...(dq && { q: dq }), page }).toString();
  const { data, error, loading, reload } = useLoad(() => api(`/cakes?${qs}`), [qs]);
  const cats = useLoad(() => api('/categories'), []);
  const categories = cats.data?.items || [];
  const [editing, setEditing] = useState(undefined);   // undefined = closed, null = new, object = edit
  const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);

  const act = async (fn, msg) => { try { await fn(); toast(msg, 'success'); reload(); } catch (e) { toast(e.message, 'error'); } };
  async function remove() {
    setBusy(true);
    try { await api(`/cakes/${del._id}`, { method: 'DELETE' }); toast('Cake deleted', 'success'); setDel(null); reload(); }
    catch (e) { toast(e.message, 'error'); setDel(null); }
    setBusy(false);
  }
  const catName = slug => categories.find(c => c.slug === slug)?.name || slug;

  return (
    <>
      <PageHead title="Cakes" sub="Everything here appears on your website instantly: photos, prices, tabs and filters.">
        <button className="btn btn-outline btn-sm" onClick={() => downloadFile('/reports/cakes.csv', 'cakes.csv').catch(e => toast(e.message, 'error'))}><Icon name="download" size={14} /> Export CSV</button>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}><Icon name="plus" size={14} /> Add cake</button>
      </PageHead>
      <div className="card">
        <div className="tab-strip">
          <button className={status === 'active' ? 'active' : ''} onClick={() => set({ status: '' })}>Live ({data?.counts.active ?? '…'})</button>
          <button className={status === 'archived' ? 'active' : ''} onClick={() => set({ status: 'archived' })}>Archived ({data?.counts.archived ?? '…'})</button>
        </div>
        <div className="table-toolbar">
          <div className="search-mini"><Icon name="search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search cakes…" aria-label="Search cakes" /></div>
          <select value={category} onChange={e => set({ category: e.target.value })} aria-label="Category"><option value="">All categories</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        </div>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? (
          <Empty icon="products" title={status === 'archived' ? 'No archived cakes' : 'No cakes found'} text={status === 'archived' ? 'Cakes you archive are hidden from the website but kept here.' : 'Add your first cake, or change the filters.'} action={status === 'active' && <button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}>Add cake</button>} />
        ) : (
          <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}><table><thead><tr><th>Cake</th><th>Category</th><th>Price</th><th>Photos</th><th>Rating</th><th>Tabs</th><th /></tr></thead><tbody>
            {data.items.map(c => (
              <tr key={c._id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {c.images?.[0] ? <img className="row-media" src={assetUrl(c.images[0])} alt="" style={{ width: 46, height: 46, borderRadius: 11, objectFit: 'cover' }} /> : <div style={{ width: 46, height: 46, borderRadius: 11, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="image" size={18} /></div>}
                  <div><b>{c.name}</b><div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{c.flavor} · {c.egg ? 'Contains egg' : 'Eggless'} · {weightLabel(c.weightG)}</div></div></div></td>
                <td>{catName(c.category)}</td>
                <td><b>{fmt(c.price)}</b>{c.was ? <div style={{ fontSize: 11, color: 'var(--ink-faint)', textDecoration: 'line-through' }}>{fmt(c.was)}</div> : null}</td>
                <td>{c.images?.length ? <Badge tone={c.images.length >= 2 ? 'sage' : 'gold'}>{c.images.length} photo{c.images.length > 1 ? 's' : ''}</Badge> : <Badge tone="gray">Stock look</Badge>}</td>
                <td>{c.reviewCount ? `★ ${c.rating} (${c.reviewCount})` : <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
                <td>{c.tags?.length ? c.tags.map(t => <Badge key={t} tone="blue">{t}</Badge>) : '—'}</td>
                <td><div className="row-actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn-icon" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Icon name="edit" size={15} /></button>
                  <button className="btn-icon" title="Duplicate" aria-label={`Duplicate ${c.name}`} onClick={() => act(() => api(`/cakes/${c._id}/duplicate`, { method: 'POST' }), 'Copy created in Archived — edit it, then restore to publish')}><Icon name="copy" size={15} /></button>
                  <button className="btn-icon" title={c.active ? 'Archive (hide from website)' : 'Restore to website'} aria-label={c.active ? `Archive ${c.name}` : `Restore ${c.name}`} onClick={() => act(() => api(`/cakes/${c._id}`, { method: 'PATCH', body: { active: !c.active } }), c.active ? 'Archived — hidden from your website' : 'Restored — live on your website')}><Icon name={c.active ? 'archive' : 'refresh'} size={15} /></button>
                  <button className="btn-icon" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => setDel(c)}><Icon name="trash" size={15} /></button>
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onPage={p => set({ page: String(p) })} />}
      </div>
      <CakeForm cake={editing} categories={categories} onClose={() => setEditing(undefined)} onSaved={reload} />
      <Confirm open={!!del} danger title="Delete this cake?" confirmLabel="Delete cake" busy={busy} onClose={() => setDel(null)} onConfirm={remove}
        text={del && `“${del.name}” will be deleted for good, along with its reviews. If it has been ordered before, archive it instead (you'll be told).`} />
    </>
  );
}
