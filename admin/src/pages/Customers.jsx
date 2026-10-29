import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { Badge, Pagination, Empty, ErrorBox, Loading, PageHead, StatusBadge, useLoad, useDebounced } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, downloadFile } from '../lib/api.js';
import { fmt, fmtDate } from '../lib/format.js';

const TIER = { Gold: 'gold', Silver: 'blue', Bronze: 'gray' };

function Detail({ id, onClose }) {
  const navigate = useNavigate();
  const { data, error } = useLoad(() => (id ? api(`/customers/${id}`) : Promise.resolve(null)), [id]);
  const c = data?.customer;
  return (
    <Modal open={!!id} wide title={c ? c.name : 'Customer'} onClose={onClose}>
      {error && <ErrorBox message={error} />}
      {!c && !error && <Loading />}
      {c && <>
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          {[['Orders', c.orders], ['Total spent', fmt(c.spent)], ['Reward points', c.points], ['Reviews', c.reviews]].map(([k, v]) => <div key={k} className="card" style={{ padding: 14, textAlign: 'center' }}><div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700 }}>{v}</div><div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{k}</div></div>)}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 14 }}>
          {c.email && <div><Icon name="mail" size={13} className="inline-icon" /> {c.email}</div>}{c.phone && <div><Icon name="phone" size={13} className="inline-icon" /> +91 {c.phone}</div>}
          <div>Member since {fmtDate(c.createdAt)} · tier <Badge tone={TIER[c.tier]}>{c.tier}</Badge></div>
        </div>
        <h4 style={{ fontSize: 13, marginBottom: 6 }}>Saved addresses</h4>
        {c.addresses.length === 0 ? <p className="field-hint" style={{ marginBottom: 14 }}>None saved.</p> : c.addresses.map(a => <div key={a._id} className="list-row"><Icon name="pin" size={15} /><div><div className="lr-name">{a.label} {a.isDefault && <Badge tone="gold">Default</Badge>}</div><div className="lr-sub">{a.line} — {a.pincode}</div></div></div>)}
        <h4 style={{ fontSize: 13, margin: '16px 0 6px' }}>Recent orders</h4>
        {data.orders.length === 0 ? <p className="field-hint">No orders yet.</p> : data.orders.map(o => (
          <div key={o.orderNum} className="list-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders?q=${o.orderNum}`)}>
            <div><div className="lr-name">{o.orderNum}</div><div className="lr-sub">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')} · {fmtDate(o.createdAt)}</div></div>
            <div className="lr-val"><StatusBadge status={o.status} /> <span style={{ marginLeft: 8 }}>{fmt(o.totals.total)}</span></div>
          </div>
        ))}
      </>}
    </Modal>
  );
}

export default function Customers() {
  const toast = useToast(); const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page')) || 1; const [q, setQ] = useState(sp.get('q') || ''); const dq = useDebounced(q, 300);
  const [open, setOpen] = useState(null);
  useEffect(() => { setSp(prev => { const n = new URLSearchParams(prev); dq ? n.set('q', dq) : n.delete('q'); n.delete('page'); return n; }, { replace: true }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, error, loading, reload } = useLoad(() => api(`/customers?${new URLSearchParams({ ...(dq && { q: dq }), page })}`), [dq, page]);
  return (
    <>
      <PageHead title="Customers" sub="Everyone who has created an account on your website.">
        <button className="btn btn-outline btn-sm" onClick={() => downloadFile('/reports/customers.csv', 'customers.csv').catch(e => toast(e.message, 'error'))}><Icon name="download" size={14} /> Export CSV</button>
      </PageHead>
      <div className="card">
        <div className="table-toolbar"><div className="search-mini"><Icon name="search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or phone…" aria-label="Search customers" /></div></div>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="customers" title="No customers found" text="Customers appear here when they sign up on your website." /> : (
          <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}><table><thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Spent</th><th>Tier</th><th>Joined</th><th /></tr></thead><tbody>
            {data.items.map(c => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td>{c.email || '—'}<div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{c.phone ? `+91 ${c.phone}` : ''}</div></td>
                <td>{c.orders}{c.lastOrderAt && <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>last {fmtDate(c.lastOrderAt)}</div>}</td>
                <td><b>{fmt(c.spent)}</b></td><td><Badge tone={TIER[c.tier]}>{c.tier}</Badge></td><td>{fmtDate(c.createdAt)}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setOpen(c.id)}>View</button></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onPage={p => setSp(prev => { const n = new URLSearchParams(prev); n.set('page', p); return n; }, { replace: true })} />}
      </div>
      <Detail id={open} onClose={() => setOpen(null)} />
    </>
  );
}
