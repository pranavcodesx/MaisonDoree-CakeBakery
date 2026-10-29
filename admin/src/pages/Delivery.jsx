import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import Modal, { Confirm } from '../components/Modal.jsx';
import { Badge, Field, StatusBadge, Empty, ErrorBox, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { fmt, fmtDay, todayIST } from '../lib/format.js';

const hour = h => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
const tomorrow = () => new Date(Date.now() + 5.5 * 3600 * 1000 + 86400000).toISOString().slice(0, 10);

function Rules() {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api('/settings'), []);
  const [f, setF] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF(JSON.parse(JSON.stringify(data.settings.delivery))); }, [data]);
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!f) return <Loading />;
  const setSlot = (i, v) => setF({ ...f, slots: f.slots.map((s, j) => (j === i ? v : s)) });
  async function save() {
    setErr(''); setBusy(true);
    try {
      await api('/settings', { method: 'PUT', body: { delivery: { cutoffHour: Number(f.cutoffHour), maxAdvanceDays: Number(f.maxAdvanceDays), slots: f.slots.map(s => s.trim()).filter(Boolean), codMax: Number(f.codMax), defaultCharge: Number(f.defaultCharge) } } });
      toast('Delivery rules saved — your website uses them right away', 'success'); reload();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head"><div><h3>Delivery rules</h3><div className="sub">What customers can choose at checkout</div></div></div>
      <div className="form-row2">
        <Field label="Same-day orders close at" hint="After this time, customers can only pick tomorrow or later."><select value={f.cutoffHour} onChange={e => setF({ ...f, cutoffHour: e.target.value })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h === 0 ? 'No same-day delivery' : hour(h)}</option>)}</select></Field>
        <Field label="How far ahead can they book (days)"><input type="number" min="1" max="180" value={f.maxAdvanceDays} onChange={e => setF({ ...f, maxAdvanceDays: e.target.value })} /></Field>
      </div>
      <div className="form-row2">
        <Field label="Cash on delivery limit (₹)" hint="Bigger orders must be paid online."><input type="number" min="0" value={f.codMax} onChange={e => setF({ ...f, codMax: e.target.value })} /></Field>
        <Field label="Default delivery charge (₹)" hint="Used in the cart before a pincode is chosen."><input type="number" min="0" value={f.defaultCharge} onChange={e => setF({ ...f, defaultCharge: e.target.value })} /></Field>
      </div>
      <Field label="Delivery time slots">
        {f.slots.map((s, i) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}><input value={s} maxLength={30} onChange={e => setSlot(i, e.target.value)} aria-label={`Time slot ${i + 1}`} /><button type="button" className="btn-icon" aria-label="Remove slot" disabled={f.slots.length <= 1} onClick={() => setF({ ...f, slots: f.slots.filter((_, j) => j !== i) })}><Icon name="trash" size={15} /></button></div>)}
        {f.slots.length < 8 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, slots: [...f.slots, ''] })}><Icon name="plus" size={13} /> Add a slot</button>}
      </Field>
      {err && <span className="field-error show" role="alert" style={{ marginBottom: 10 }}>{err}</span>}
      <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save delivery rules'}</button>
    </div>
  );
}

function Areas() {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api('/pincodes'), []);
  const [add, setAdd] = useState(false); const [f, setF] = useState({ pincodes: '', area: '', deliveryCharge: 49 }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [del, setDel] = useState(null);
  const update = async (p, patch) => { try { await api(`/pincodes/${p._id}`, { method: 'PUT', body: { area: p.area || '', deliveryCharge: p.deliveryCharge, active: p.active, ...patch } }); reload(); } catch (e) { toast(e.message, 'error'); } };
  async function create() {
    setErr(''); setBusy(true);
    try { const d = await api('/pincodes', { method: 'POST', body: { pincodes: f.pincodes, area: f.area || undefined, deliveryCharge: Number(f.deliveryCharge) } }); toast(`${d.added} pincode${d.added === 1 ? '' : 's'} added${d.skipped ? `, ${d.skipped} already existed` : ''}`, 'success'); setAdd(false); setF({ pincodes: '', area: '', deliveryCharge: 49 }); reload(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head"><div><h3>Areas you deliver to</h3><div className="sub">Customers can only order to these pincodes. Each has its own delivery charge.</div></div><button className="btn btn-primary btn-sm" onClick={() => { setErr(''); setAdd(true); }}><Icon name="plus" size={14} /> Add pincodes</button></div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="delivery" title="No delivery areas" text="Add the pincodes you deliver to, or customers won't be able to check out." /> : (
        <div className="table-wrap"><table><thead><tr><th>Pincode</th><th>Area name</th><th>Delivery charge</th><th>Delivering</th><th /></tr></thead><tbody>
          {data.items.map(p => (
            <tr key={p._id}>
              <td><b>{p.pincode}</b></td>
              <td><input defaultValue={p.area || ''} maxLength={60} placeholder="optional" aria-label={`Area name for ${p.pincode}`} onBlur={e => e.target.value !== (p.area || '') && update(p, { area: e.target.value })} style={{ width: '100%', minWidth: 120 }} /></td>
              <td><input type="number" min="0" defaultValue={p.deliveryCharge} aria-label={`Charge for ${p.pincode}`} onBlur={e => Number(e.target.value) !== p.deliveryCharge && update(p, { deliveryCharge: Number(e.target.value) || 0 })} style={{ width: 90 }} /></td>
              <td><button className={`notif-toggle-btn ${p.active ? 'on' : ''}`} onClick={() => update(p, { active: !p.active })} aria-label={`${p.active ? 'Stop' : 'Start'} delivering to ${p.pincode}`}>{p.active ? 'Yes' : 'Paused'}</button></td>
              <td><button className="btn-icon" aria-label={`Delete ${p.pincode}`} onClick={() => setDel(p)}><Icon name="trash" size={15} /></button></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
      <Modal open={add} title="Add delivery pincodes" onClose={() => setAdd(false)} footer={<><button className="btn btn-ghost" onClick={() => setAdd(false)}>Cancel</button><button className="btn btn-primary" onClick={create} disabled={busy}>{busy ? 'Adding…' : 'Add'}</button></>}>
        <Field label="Pincodes" hint="One or many, separated by commas or spaces."><textarea rows={2} value={f.pincodes} onChange={e => setF({ ...f, pincodes: e.target.value })} placeholder="416001, 416002, 416003" /></Field>
        <div className="form-row2"><Field label="Area name — optional"><input value={f.area} maxLength={60} onChange={e => setF({ ...f, area: e.target.value })} placeholder="e.g. Rajarampuri" /></Field><Field label="Delivery charge (₹)"><input type="number" min="0" value={f.deliveryCharge} onChange={e => setF({ ...f, deliveryCharge: e.target.value })} /></Field></div>
        {err && <span className="field-error show" role="alert">{err}</span>}
      </Modal>
      <Confirm open={!!del} danger title="Remove this pincode?" confirmLabel="Remove" onClose={() => setDel(null)} onConfirm={async () => { try { await api(`/pincodes/${del._id}`, { method: 'DELETE' }); toast('Pincode removed', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } setDel(null); }} text={del && `Customers will no longer be able to order to ${del.pincode}. Pause it instead if this is temporary.`} />
    </div>
  );
}

function Schedule() {
  const [date, setDate] = useState(tomorrow()); 
  const rules = useLoad(() => api('/settings'), []);
  const { data, error, reload } = useLoad(() => api(`/orders?deliveryDate=${date}&limit=50`), [date]);
  const slots = rules.data?.settings.delivery.slots || [];
  const orders = (data?.items || []).filter(o => o.status !== 'Cancelled');
  const groups = [...new Set([...slots, ...orders.map(o => o.delivery.slot)])].map(s => [s, orders.filter(o => o.delivery.slot === s)]).filter(([, l]) => l.length);
  const cash = orders.filter(o => o.payment.status === 'cod').reduce((s, o) => s + o.totals.total, 0);
  return (
    <div className="card">
      <div className="card-head"><div><h3>Delivery schedule</h3><div className="sub">Who gets what, and when — print this for your delivery person</div></div>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => setDate(todayIST())}>Today</button><button className="btn btn-ghost btn-sm" onClick={() => setDate(tomorrow())}>Tomorrow</button><input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} aria-label="Schedule date" /><button className="btn btn-outline btn-sm" onClick={() => window.print()}><Icon name="printer" size={14} /> Print</button></div></div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : orders.length === 0 ? <Empty icon="delivery" title={`Nothing to deliver on ${fmtDay(date + 'T00:00:00Z')}`} text="Orders scheduled for this day will be listed here by time slot." /> : (
        <>
          <p style={{ fontSize: 13, marginBottom: 12 }}><b>{orders.length}</b> deliver{orders.length === 1 ? 'y' : 'ies'} on {fmtDay(date + 'T00:00:00Z')}{cash > 0 && <> · cash to collect: <b>{fmt(cash)}</b></>}</p>
          {groups.map(([slot, list]) => (
            <div key={slot} style={{ marginBottom: 16 }}>
              <div className="dd-section-label" style={{ padding: '6px 0' }}>{slot} · {list.length}</div>
              {list.map(o => (
                <div key={o.orderNum} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <Icon name="pin" size={16} />
                  <div style={{ flex: 1 }}><div className="lr-name">{o.orderNum} · {o.customer.name} · {o.customer.phone}</div><div className="lr-sub">{o.address.line} ({o.address.pincode})</div><div className="lr-sub">{o.items.map(i => `${i.qty}× ${i.name}${i.message ? ` “${i.message}”` : ''}`).join(', ')}</div>{o.delivery.note && <div className="lr-sub">Note: {o.delivery.note}</div>}</div>
                  <div style={{ textAlign: 'right' }}><StatusBadge status={o.status} /><div className="lr-val" style={{ marginTop: 6 }}>{o.payment.status === 'cod' ? <Badge tone="gold">Collect {fmt(o.totals.total)}</Badge> : <Badge tone="sage">Paid</Badge>}</div></div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function Delivery() {
  return (<><PageHead title="Delivery" sub="Your delivery rules, the areas you serve, and the day's delivery list." /><Rules /><Areas /><Schedule /></>);
}
