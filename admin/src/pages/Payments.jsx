import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Badge, Pagination, Empty, ErrorBox, Loading, PageHead, useLoad, useDebounced } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { fmt, fmtDate } from '../lib/format.js';
import { PAYMENT_LABEL, PAYMENT_TONE } from '../lib/constants.js';

export default function Payments() {
  const toast = useToast();
  const [method, setMethod] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [q, setQ] = useState(''); const dq = useDebounced(q, 300);
  const { data, error, reload } = useLoad(() => api(`/payments?${new URLSearchParams({ ...(method && { method }), ...(status && { status }), ...(dq && { q: dq }), page })}`), [method, status, dq, page]);
  const s = data?.summary;
  async function refunded(o) { try { await api(`/orders/${o.orderNum}/payment`, { method: 'PATCH', body: { status: 'refunded' } }); toast('Marked as refunded', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } }
  return (
    <>
      <PageHead title="Payments" sub="Money in, money still to collect, and refunds you owe. Online payments are taken by Razorpay." />
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {[['sage', 'Online payments received', s?.onlinePaid], ['gold', 'Cash collected on delivery', s?.codCollected], ['blue', 'Cash still to collect', s?.codToCollect], ['terra', `Refunds you owe${s?.refundPendingCount ? ` (${s.refundPendingCount})` : ''}`, s?.refundPending]].map(([t, l, v]) => (
          <div key={l} className={`card stat-card ${t}`}><div className="sc-value">{s ? fmt(v) : '…'}</div><div className="sc-label">{l}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="table-toolbar">
          <div className="search-mini"><Icon name="search" /><input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search order # or customer…" aria-label="Search payments" /></div>
          <select value={method} onChange={e => { setMethod(e.target.value); setPage(1); }} aria-label="Method"><option value="">All methods</option><option value="online">Online</option><option value="cod">Cash on delivery</option></select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label="Payment status"><option value="">All statuses</option>{Object.entries(PAYMENT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="payments" title="No payments found" text="Payments appear here as customers place orders." /> : (
          <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Method</th><th>Amount</th><th>Payment</th><th>Order status</th><th>Date</th><th /></tr></thead><tbody>
            {data.items.map(o => (
              <tr key={o.orderNum}>
                <td><b>{o.orderNum}</b></td><td>{o.customer?.name}</td><td>{o.payment.method === 'cod' ? 'Cash on delivery' : 'Online'}{o.payment.razorpayPaymentId && <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{o.payment.razorpayPaymentId}</div>}</td>
                <td><b>{fmt(o.totals.total)}</b></td><td><Badge tone={PAYMENT_TONE[o.payment.status]}>{PAYMENT_LABEL[o.payment.status]}</Badge></td><td>{o.status}</td><td>{fmtDate(o.createdAt)}</td>
                <td>{o.payment.status === 'refund_pending' && <button className="btn btn-primary btn-sm" onClick={() => refunded(o)}>Mark refunded</button>}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onPage={setPage} />}
        <p className="field-hint" style={{ marginTop: 14 }}>To refund an online payment, use your Razorpay dashboard, then come back and tap “Mark refunded”.</p>
      </div>
    </>
  );
}
