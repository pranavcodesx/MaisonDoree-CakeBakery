import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Modal, { Confirm } from '../components/Modal.jsx';
import { Badge, StatusBadge, Pagination, Empty, ErrorBox, Loading, PageHead, useLoad, useDebounced } from '../components/ui.jsx';
import { useAlerts } from '../context/AlertsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, assetUrl, downloadFile } from '../lib/api.js';
import { fmt, fmtDate, fmtDay, fmtDateTime, timeAgo } from '../lib/format.js';
import { FLOW, STATUSES, STATUS_TONE, PAYMENT_LABEL, PAYMENT_TONE, TOPPER_LABEL } from '../lib/constants.js';
import { downloadInvoice } from '../lib/invoice.js';

// Opens WhatsApp with a ready message for this order. (Sending by itself, without a click, needs the paid WhatsApp Business API.)
const WA_TEXT = {
  'Order Placed': 'we have received your order', Confirmed: 'your order is confirmed', Baking: 'your cake is in the oven',
  Decorating: 'your cake is being decorated', Packed: 'your order is packed and ready', 'Out for Delivery': 'your order is out for delivery',
  Delivered: 'your order has been delivered', Cancelled: 'your order has been cancelled',
};
function whatsappLink(o) {
  const digits = String(o.customer.phone || '').replace(/\D/g, '');
  const num = digits.length === 10 ? `91${digits}` : digits;
  const text = `Hi ${o.customer.name.split(' ')[0]}, ${WA_TEXT[o.status] || `your order is now ${o.status}`} (order ${o.orderNum}). Thank you for choosing us!`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

const tone = s => STATUS_TONE[s] || 'gray';

// Only sensible next steps are offered: forward through the flow, or Cancel.
export function StatusSelect({ order, onChange }) {
  if (['Delivered', 'Cancelled'].includes(order.status)) return <StatusBadge status={order.status} />;
  const next = FLOW.slice(FLOW.indexOf(order.status) + 1);
  return (
    <div className={`status-select-wrap status-${tone(order.status)}`}>
      <select className="status-select" value={order.status} aria-label={`Status of ${order.orderNum}`} onChange={e => onChange(order, e.target.value)}>
        <option value={order.status}>{order.status}</option>
        {next.map(s => <option key={s} value={s}>{s}</option>)}
        <option value="Cancelled">Cancel order</option>
      </select>
    </div>
  );
}

const itemSummary = o => `${o.items[0].qty} × ${o.items[0].name}${o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}`;

function OrderDetail({ orderNum, onClose, onChanged, requestStatus }) {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => (orderNum ? api(`/orders/${orderNum}`) : Promise.resolve(null)), [orderNum]);
  const [note, setNote] = useState(null);
  useEffect(() => { if (data) setNote(data.order.adminNote || ''); }, [data]);
  const o = data?.order;

  async function saveNote() { try { await api(`/orders/${orderNum}/note`, { method: 'PATCH', body: { note } }); toast('Note saved', 'success'); onChanged(); } catch (e) { toast(e.message, 'error'); } }
  async function refund() { try { await api(`/orders/${orderNum}/payment`, { method: 'PATCH', body: { status: 'refunded' } }); toast('Marked as refunded', 'success'); reload(); onChanged(); } catch (e) { toast(e.message, 'error'); } }

  return (
    <Modal open={!!orderNum} wide title={o ? `Order ${o.orderNum}` : 'Order'} onClose={onClose}
      footer={o && <><button className="btn btn-ghost" onClick={() => downloadInvoice(o)}><Icon name="download" size={14} /> Invoice</button><button className="btn btn-ghost" onClick={() => window.print()}><Icon name="printer" size={14} /> Print</button><button className="btn btn-primary" onClick={onClose}>Done</button></>}>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!o && !error && <Loading />}
      {o && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div><div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Placed {fmtDateTime(o.createdAt)}</div><div style={{ marginTop: 6 }}><StatusBadge status={o.status} /></div></div>
            {!['Delivered', 'Cancelled'].includes(o.status) && <div><div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-faint)', marginBottom: 6 }}>UPDATE STATUS</div><StatusSelect order={o} onChange={(ord, s) => requestStatus(ord, s, reload)} /></div>}
          </div>

          <div className="grid grid-2" style={{ marginBottom: 18 }}>
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Customer</h4>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}><b>{o.customer.name}</b><br /><Icon name="phone" size={12} className="inline-icon" /> {o.customer.phone} <a href={whatsappLink(o)} target="_blank" rel="noreferrer" style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, textDecoration: 'underline' }}>WhatsApp</a>{data.customer?.notifPrefs?.whatsapp && <Badge tone="sage">wants WhatsApp updates</Badge>}<br />{o.customer.email && <><Icon name="mail" size={12} className="inline-icon" /> {o.customer.email}<br /></>}{data.customer && <span style={{ color: 'var(--ink-faint)' }}>{data.customer.orderCount} order{data.customer.orderCount === 1 ? '' : 's'} so far</span>}</div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Delivery</h4>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}><b>{fmtDay(o.delivery.date)} · {o.delivery.slot}</b><br /><Icon name="pin" size={12} className="inline-icon" /> {o.address.label}: {o.address.line} ({o.address.pincode}){o.delivery.note && <><br /><i style={{ color: 'var(--ink-soft)' }}>Customer note: {o.delivery.note}</i></>}</div>
            </div>
          </div>

          <h4 style={{ fontSize: 13, marginBottom: 6 }}>Items</h4>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '4px 14px', marginBottom: 18 }}>
            {o.items.map((it, i) => (
              <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
                {it.image ? <img src={assetUrl(it.image)} alt="" /> : <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="custom" size={18} /></div>}
                <div style={{ flex: 1 }}>
                  <div className="lr-name">{it.qty} × {it.name} {it.kind === 'custom' && <Badge tone="gold">Custom</Badge>}</div>
                  <div className="lr-sub">{it.weight}{it.flavor ? ` · ${it.flavor}` : ''}</div>
                  {it.custom && <div className="lr-sub" style={{ marginTop: 3 }}>Shape <b>{it.custom.shape}</b> · <b>{it.custom.layers}</b> tier · {it.custom.cream} · {TOPPER_LABEL[it.custom.topper]} · colour <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 3, background: it.custom.color, border: '1px solid var(--border)', verticalAlign: -1 }} /> {it.custom.color}</div>}
                  {(it.message || it.candle || it.knife || it.photoUrl) && (
                    <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--gold-100)', borderRadius: 8, fontSize: 12, lineHeight: 1.6 }}>
                      {it.message && <div>✍️ Message on cake: <b>“{it.message}”</b></div>}
                      {it.candle && <div>🕯️ {it.candle}</div>}
                      {it.knife && <div>🔪 {it.knife}</div>}
                      {it.photoUrl && <div>🖼️ Reference photo: <a href={assetUrl(it.photoUrl)} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>open</a><br /><img src={assetUrl(it.photoUrl)} alt="Customer reference" style={{ marginTop: 6, width: 90, height: 90, objectFit: 'cover', borderRadius: 8 }} /></div>}
                    </div>
                  )}
                </div>
                <div className="lr-val">{fmt(it.unitPrice * it.qty)}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-2" style={{ marginBottom: 18 }}>
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Payment</h4>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>{o.payment.method === 'cod' ? 'Cash on delivery' : 'Online (Razorpay)'} <Badge tone={PAYMENT_TONE[o.payment.status]}>{PAYMENT_LABEL[o.payment.status]}</Badge>
                {o.payment.razorpayPaymentId && <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Payment ID {o.payment.razorpayPaymentId}</div>}
                {o.payment.status === 'refund_pending' && <div style={{ marginTop: 8 }}><div className="field-hint" style={{ marginBottom: 6 }}>Refund this in your Razorpay dashboard, then mark it done.</div><button className="btn btn-primary btn-sm" onClick={refund}>Mark as refunded</button></div>}</div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              {[['Subtotal', o.totals.subtotal], o.totals.discount > 0 && [`Discount${o.couponCode ? ` (${o.couponCode})` : ''}`, -o.totals.discount], o.totals.pointsDiscount > 0 && [`Reward points (${o.pointsRedeemed} used)`, -o.totals.pointsDiscount], ['Delivery', o.totals.delivery], ['Tax', o.totals.tax]].filter(Boolean).map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}><span>{k}</span><span>{v < 0 ? '−' : ''}{fmt(Math.abs(v))}</span></div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, paddingTop: 8, marginTop: 6, borderTop: '1px solid var(--border)' }}><span>Total</span><span>{fmt(o.totals.total)}</span></div>
            </div>
          </div>

          <h4 style={{ fontSize: 13, marginBottom: 8 }}>Progress</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>{o.statusHistory.map(h => <span key={h.status} className={`badge ${tone(h.status)}`}>{h.status} · {fmtDateTime(h.at)}</span>)}</div>

          <div className="field"><label>Internal note (customers never see this)</label>
            <textarea rows={2} value={note ?? ''} maxLength={500} onChange={e => setNote(e.target.value)} placeholder="e.g. Customer called to add extra gold leaf" />
            <div style={{ marginTop: 8 }}><button className="btn btn-outline btn-sm" onClick={saveNote} disabled={note === (o.adminNote || '')}>Save note</button></div></div>
        </div>
      )}
    </Modal>
  );
}

export default function Orders() {
  const toast = useToast(); const { fresh, tick, refresh } = useAlerts();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || ''; const method = sp.get('method') || ''; const kind = sp.get('kind') || ''; const deliveryDate = sp.get('deliveryDate') || ''; const page = Number(sp.get('page')) || 1;
  const [q, setQ] = useState(sp.get('q') || ''); const dq = useDebounced(q, 300);
  const [open, setOpen] = useState(null); const [confirm, setConfirm] = useState(null); const [busy, setBusy] = useState(false);
  const set = patch => setSp(prev => { const n = new URLSearchParams(prev); Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); return n; }, { replace: true });
  useEffect(() => { set({ q: dq }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = new URLSearchParams({ ...(status && { status }), ...(method && { method }), ...(kind && { kind }), ...(deliveryDate && { deliveryDate }), ...(dq && { q: dq }), page }).toString();
  const { data, error, loading, reload } = useLoad(() => api(`/orders?${qs}`), [qs, tick]);

  async function apply(order, s, after) {
    setBusy(true);
    try { await api(`/orders/${order.orderNum}/status`, { method: 'PATCH', body: { status: s } }); toast(`${order.orderNum} → ${s}`, 'success'); reload(); refresh(); after?.(); }
    catch (e) { toast(e.message, 'error'); reload(); }
    setBusy(false); setConfirm(null);
  }
  const request = (order, s, after) => (s === 'Cancelled' ? setConfirm({ order, s, after }) : apply(order, s, after));

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  return (
    <>
      <PageHead title="Orders" sub="Every order placed on your website. Change the status and your customer's tracker updates instantly.">
        <button className="btn btn-outline btn-sm" onClick={() => downloadFile('/reports/orders.csv', 'orders.csv').catch(e => toast(e.message, 'error'))}><Icon name="download" size={14} /> Export CSV</button>
      </PageHead>
      <div className="card">
        <div className="filter-chip-row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
          <button className={`filter-chip ${!status ? 'active' : ''}`} onClick={() => set({ status: '' })}>All ({total})</button>
          {STATUSES.map(s => <button key={s} className={`filter-chip ${status === s ? 'active' : ''}`} onClick={() => set({ status: s })}>{s} ({data?.counts[s] ?? 0})</button>)}
        </div>
        <div className="table-toolbar">
          <div className="search-mini"><Icon name="search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search order #, customer, phone…" aria-label="Search orders" /></div>
          <select value={method} onChange={e => set({ method: e.target.value })} aria-label="Payment method"><option value="">All payments</option><option value="cod">Cash on delivery</option><option value="online">Online</option></select>
          <label className="checkbox-row"><input type="checkbox" checked={kind === 'custom'} onChange={e => set({ kind: e.target.checked ? 'custom' : '' })} /> Custom cakes only</label>
          <input type="date" value={deliveryDate} onChange={e => set({ deliveryDate: e.target.value })} aria-label="Delivery date" title="Delivery date" />
          {(status || method || kind || deliveryDate || q) && <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setSp({}, { replace: true }); }}>Clear</button>}
        </div>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="orders" title="No orders found" text="Try a different filter, or wait for your first customer order." /> : (
          <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Delivery</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr></thead><tbody>
            {data.items.map(o => (
              <tr key={o.orderNum}>
                <td><b>{o.orderNum}</b>{fresh.has(o.orderNum) && <span className="badge terra" style={{ marginLeft: 6, padding: '2px 7px' }}>NEW</span>}<div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{timeAgo(o.createdAt)}</div></td>
                <td>{o.customer.name}<div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{o.customer.phone}</div></td>
                <td>{itemSummary(o)} {o.items.some(i => i.kind === 'custom') && <Badge tone="gold">Custom</Badge>}{o.items.some(i => i.message || i.photoUrl) && <span title="Has personalisation"> ✍️</span>}</td>
                <td>{fmtDay(o.delivery.date)}<div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{o.delivery.slot}</div></td>
                <td><b>{fmt(o.totals.total)}</b></td>
                <td><Badge tone={PAYMENT_TONE[o.payment.status]}>{PAYMENT_LABEL[o.payment.status]}</Badge></td>
                <td><StatusSelect order={o} onChange={request} /></td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setOpen(o.orderNum)}>View</button></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onPage={p => set({ page: String(p) })} />}
      </div>
      <OrderDetail orderNum={open} onClose={() => setOpen(null)} onChanged={reload} requestStatus={request} />
      <Confirm open={!!confirm} danger title="Cancel this order?" confirmLabel="Yes, cancel order" busy={busy} onClose={() => setConfirm(null)} onConfirm={() => apply(confirm.order, confirm.s, confirm.after)}
        text={confirm && `${confirm.order.orderNum} for ${confirm.order.customer?.name || 'this customer'} will be cancelled and can't be restarted.${confirm.order.payment?.status === 'paid' ? ' It was paid online, so a refund will be flagged for you.' : ''}`} />
    </>
  );
}
