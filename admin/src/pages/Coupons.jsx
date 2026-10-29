import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Modal, { Confirm } from '../components/Modal.jsx';
import { Badge, Field, Empty, ErrorBox, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { fmt, fmtDate } from '../lib/format.js';

const blank = { code: '', desc: '', type: 'pct', value: '', cap: '', min: '', categories: [], firstOrderOnly: false, active: true, expiresAt: '' };
const describe = c => (c.pct ? `${c.pct}% off${c.cap ? ` (up to ${fmt(c.cap)})` : ''}` : `${fmt(c.flat)} off`);
const expired = c => c.expiresAt && new Date(c.expiresAt) < new Date();

export default function Coupons() {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api('/coupons'), []);
  const cats = useLoad(() => api('/categories'), []);
  const [edit, setEdit] = useState(undefined); const [f, setF] = useState(blank); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false); const [del, setDel] = useState(null);

  const open = c => { setErr({}); setEdit(c); setF(c ? { code: c.code, desc: c.desc || '', type: c.pct ? 'pct' : 'flat', value: c.pct || c.flat || '', cap: c.cap || '', min: c.min || '', categories: c.categories || [], firstOrderOnly: !!c.firstOrderOnly, active: c.active, expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '' } : blank); };
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErr(e => ({ ...e, [k]: '' })); };

  async function save() {
    const e = {};
    if (!/^[A-Za-z0-9]{3,20}$/.test(f.code.trim())) e.code = 'Use 3–20 letters or numbers, no spaces.';
    if (!Number(f.value)) e.value = 'Enter the discount.'; else if (f.type === 'pct' && Number(f.value) > 100) e.value = 'A percentage cannot be more than 100.';
    if (Object.keys(e).length) { setErr(e); return; }
    setBusy(true);
    try {
      const body = { code: f.code.trim(), desc: f.desc.trim(), type: f.type, value: Number(f.value), cap: f.type === 'pct' && f.cap ? Number(f.cap) : null, min: f.min ? Number(f.min) : null, categories: f.categories, firstOrderOnly: f.firstOrderOnly, active: f.active, expiresAt: f.expiresAt || null };
      await api(edit ? `/coupons/${edit._id}` : '/coupons', { method: edit ? 'PUT' : 'POST', body });
      toast(edit ? 'Coupon updated' : 'Coupon created — customers can use it now', 'success'); setEdit(undefined); reload();
    } catch (ex) { setErr({ [ex.field || 'form']: ex.message }); }
    setBusy(false);
  }
  async function toggle(c) { try { await api(`/coupons/${c._id}`, { method: 'PATCH', body: { active: !c.active } }); toast(c.active ? 'Coupon switched off' : 'Coupon switched on', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } }
  async function remove() { setBusy(true); try { await api(`/coupons/${del._id}`, { method: 'DELETE' }); toast('Coupon deleted', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } setDel(null); setBusy(false); }

  const preview = `${f.type === 'pct' ? `${f.value || 0}% off${f.cap ? `, up to ${fmt(Number(f.cap))}` : ''}` : `${fmt(Number(f.value) || 0)} off`}${f.min ? ` on orders above ${fmt(Number(f.min))}` : ''}${f.categories.length ? ` · ${f.categories.join(', ')} cakes only` : ''}${f.firstOrderOnly ? ' · first order only' : ''}`;
  return (
    <>
      <PageHead title="Coupons" sub="Codes customers type in their cart. Active, public coupons also appear in “Offers & coupons” on your home page. Tip: a code that starts with SPIN (for example SPIN15) becomes a prize on the Spin & Win wheel while it is switched On. Switching it Off removes it from the wheel; people who already won it can still use it.">
        <button className="btn btn-primary btn-sm" onClick={() => open(null)}><Icon name="plus" size={14} /> New coupon</button>
      </PageHead>
      <div className="card">
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="coupon" title="No coupons yet" text="Create a code to reward your customers." /> : (
          <div className="table-wrap"><table><thead><tr><th>Code</th><th>Offer</th><th>Conditions</th><th>Used</th><th>Expires</th><th>Status</th><th /></tr></thead><tbody>
            {data.items.map(c => (
              <tr key={c._id}>
                <td><b style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.code}</b>{c.code.startsWith('SPIN') && <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>Spin &amp; Win prize</div>}</td>
                <td>{describe(c)}<div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{c.desc}</div></td>
                <td style={{ fontSize: 12 }}>{[c.min && `Min ${fmt(c.min)}`, c.categories?.length && c.categories.join(', '), c.firstOrderOnly && 'First order'].filter(Boolean).join(' · ') || 'None'}</td>
                <td>{c.used}</td><td>{c.expiresAt ? <span style={{ color: expired(c) ? 'var(--terracotta)' : undefined }}>{fmtDate(c.expiresAt)}{expired(c) ? ' (expired)' : ''}</span> : 'Never'}</td>
                <td><button className={`notif-toggle-btn ${c.active ? 'on' : ''}`} onClick={() => toggle(c)} aria-label={`${c.active ? 'Switch off' : 'Switch on'} ${c.code}`}>{c.active ? 'On' : 'Off'}</button></td>
                <td><div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn-icon" aria-label={`Edit ${c.code}`} onClick={() => open(c)}><Icon name="edit" size={15} /></button>
                  {!c.code.startsWith('SPIN') && <button className="btn-icon" aria-label={`Delete ${c.code}`} onClick={() => setDel(c)}><Icon name="trash" size={15} /></button>}
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      <Modal open={edit !== undefined} wide title={edit ? `Edit ${edit.code}` : 'New coupon'} onClose={() => setEdit(undefined)}
        footer={<><button className="btn btn-ghost" onClick={() => setEdit(undefined)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save coupon'}</button></>}>
        <div className="form-row2">
          <Field label="Code" error={err.code} hint={edit ? "A coupon's code can't be changed." : 'Customers type this, e.g. DIWALI25'}><input value={f.code} disabled={!!edit} maxLength={20} onChange={e => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="DIWALI25" /></Field>
          <Field label="Short description" hint="Shown on the home page."><input value={f.desc} maxLength={120} onChange={e => set('desc', e.target.value)} placeholder="25% off all cakes" /></Field>
        </div>
        <Field label="Discount type"><div className="segmented"><button type="button" className={`segmented-btn ${f.type === 'pct' ? 'active' : ''}`} onClick={() => set('type', 'pct')}>Percentage (%)</button><button type="button" className={`segmented-btn ${f.type === 'flat' ? 'active' : ''}`} onClick={() => set('type', 'flat')}>Flat amount (₹)</button></div></Field>
        <div className="form-row2">
          <Field label={f.type === 'pct' ? 'Percent off' : 'Rupees off'} error={err.value}><input type="number" min="1" value={f.value} onChange={e => set('value', e.target.value)} /></Field>
          {f.type === 'pct' && <Field label="Maximum discount (₹) — optional"><input type="number" min="0" value={f.cap} onChange={e => set('cap', e.target.value)} /></Field>}
        </div>
        <div className="form-row2">
          <Field label="Minimum order (₹) — optional"><input type="number" min="0" value={f.min} onChange={e => set('min', e.target.value)} /></Field>
          <Field label="Expires on — optional" error={err.expiresAt}><input type="date" value={f.expiresAt} onChange={e => set('expiresAt', e.target.value)} /></Field>
        </div>
        <Field label="Only for these categories — optional" hint="Leave all unticked for every cake.">
          <div className="filter-chip-row" style={{ flexWrap: 'wrap' }}>{(cats.data?.items || []).map(c => <button type="button" key={c.slug} className={`filter-chip ${f.categories.includes(c.slug) ? 'active' : ''}`} onClick={() => set('categories', f.categories.includes(c.slug) ? f.categories.filter(x => x !== c.slug) : [...f.categories, c.slug])}>{c.name}</button>)}</div>
        </Field>
        <div className="form-row2">
          <label className="checkbox-row"><input type="checkbox" checked={f.firstOrderOnly} onChange={e => set('firstOrderOnly', e.target.checked)} /> First order only</label>
          <label className="checkbox-row"><input type="checkbox" checked={f.active} onChange={e => set('active', e.target.checked)} /> Active</label>
        </div>
        <div className="coupon-preview" style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'var(--gold-100)', fontSize: 13 }}><b style={{ fontFamily: 'monospace' }}>{f.code || 'CODE'}</b> — {preview}</div>
        {err.form && <span className="field-error show" role="alert" style={{ marginTop: 10 }}>{err.form}</span>}
      </Modal>
      <Confirm open={!!del} danger title="Delete this coupon?" confirmLabel="Delete" busy={busy} onClose={() => setDel(null)} onConfirm={remove} text={del && `${del.code} will stop working immediately. Past orders that used it keep their discount.`} />
    </>
  );
}
