import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Empty, ErrorBox, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, downloadFile } from '../lib/api.js';
import { fmt, todayIST, cap } from '../lib/format.js';

const shift = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default function Reports() {
  const toast = useToast(); const today = todayIST();
  const [from, setFrom] = useState(shift(today, -29)); const [to, setTo] = useState(today);
  const { data: r, error, reload } = useLoad(() => api(`/reports/summary?from=${from}&to=${to}`), [from, to]);
  const dl = (path, name) => downloadFile(path, name).catch(e => toast(e.message, 'error'));
  const preset = days => { setTo(today); setFrom(shift(today, -(days - 1))); };
  const max = Math.max(1, ...(r?.byCategory.map(c => c.revenue) || [1]));
  return (
    <>
      <PageHead title="Reports" sub="Sales for any date range, plus spreadsheets you can open in Excel or Google Sheets." />
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="table-toolbar" style={{ marginBottom: 0 }}>
          {[[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']].map(([n, l]) => <button key={n} className="filter-chip" onClick={() => preset(n)}>{l}</button>)}
          <label style={{ fontSize: 12, fontWeight: 700 }}>From <input type="date" value={from} max={to} onChange={e => e.target.value && setFrom(e.target.value)} /></label>
          <label style={{ fontSize: 12, fontWeight: 700 }}>To <input type="date" value={to} min={from} max={today} onChange={e => e.target.value && setTo(e.target.value)} /></label>
        </div>
      </div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : !r ? <Loading /> : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 20 }}>
            {[['gold', fmt(r.sales), 'Sales (excl. cancelled)'], ['purple', r.orders - r.cancelled, `Orders (${r.cancelled} cancelled)`], ['sage', fmt(r.avgOrder), 'Average order value'], ['blue', r.delivered, `Delivered · ${fmt(r.deliveredSales)}`]].map(([t, v, l]) => <div key={l} className={`card stat-card ${t}`}><div className="sc-value">{v}</div><div className="sc-label">{l}</div></div>)}
          </div>
          <div className="grid grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-head"><h3>Where the money comes from</h3></div>
              {[['Online payments', r.byPayment.online], ['Cash on delivery', r.byPayment.cod], ['Delivery charges collected', r.deliveryCharges], ['Tax collected', r.tax], ['Discounts given', -r.discounts]].map(([k, v]) => <div key={k} className="list-row"><div className="lr-name">{k}</div><div className="lr-val">{v < 0 ? '−' : ''}{fmt(Math.abs(v))}</div></div>)}
            </div>
            <div className="card">
              <div className="card-head"><h3>Sales by category</h3></div>
              {r.byCategory.length === 0 ? <Empty icon="reports" title="No sales in this range" text="Pick a wider date range." /> : r.byCategory.map(c => (
                <div key={c.name} className="list-row"><div style={{ width: 120 }} className="lr-name">{cap(c.name)}</div><div style={{ flex: 1, height: 8, background: 'var(--bg-alt)', borderRadius: 99 }}><div style={{ width: `${(c.revenue / max) * 100}%`, height: '100%', background: 'var(--gold-500)', borderRadius: 99 }} /></div><div className="lr-val" style={{ width: 90 }}>{fmt(c.revenue)}</div></div>
              ))}
            </div>
          </div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-head"><h3>Best sellers in this range</h3></div>
            {r.topCakes.length === 0 ? <Empty icon="products" title="No sales in this range" text="Nothing was sold between these dates." /> : (
              <div className="table-wrap"><table><thead><tr><th>#</th><th>Cake</th><th>Sold</th><th>Sales</th></tr></thead><tbody>{r.topCakes.map((t, i) => <tr key={t.name}><td>{i + 1}</td><td><b>{t.name}</b></td><td>{t.qty}</td><td>{fmt(t.revenue)}</td></tr>)}</tbody></table></div>
            )}
          </div>
        </>
      )}
      <div className="card">
        <div className="card-head"><div><h3>Download spreadsheets</h3><div className="sub">CSV files that open in Excel and Google Sheets</div></div></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => dl(`/reports/orders.csv?from=${from}&to=${to}`, `orders_${from}_to_${to}.csv`)}><Icon name="download" size={14} /> Orders (this date range)</button>
          <button className="btn btn-outline btn-sm" onClick={() => dl('/reports/cakes.csv', 'cakes.csv')}><Icon name="download" size={14} /> All cakes</button>
          <button className="btn btn-outline btn-sm" onClick={() => dl('/reports/customers.csv', 'customers.csv')}><Icon name="download" size={14} /> Customers</button>
          <button className="btn btn-outline btn-sm" onClick={() => dl('/reports/subscribers.csv', 'newsletter_subscribers.csv')}><Icon name="download" size={14} /> Newsletter subscribers</button>
        </div>
      </div>
    </>
  );
}
