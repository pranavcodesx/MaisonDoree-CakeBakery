import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import SalesChart from '../components/Chart.jsx';
import { StatusBadge, PageHead, ErrorBox, Loading, Empty, useLoad } from '../components/ui.jsx';
import { useAlerts } from '../context/AlertsContext.jsx';
import { api, assetUrl } from '../lib/api.js';
import { fmt, timeAgo } from '../lib/format.js';
import { STATUSES } from '../lib/constants.js';

const Trend = ({ pct }) => (pct == null ? null : <span className={`sc-trend ${pct >= 0 ? 'up' : 'down'}`}><Icon name={pct >= 0 ? 'trend-up' : 'trend-down'} size={12} />{Math.abs(pct)}%</span>);
const Stat = ({ tone, icon, value, label, trend, onClick }) => (
  <div className={`card stat-card ${tone}`} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <div className="sc-top"><div className="sc-icon"><Icon name={icon} /></div><Trend pct={trend} /></div>
    <div className="sc-value">{value}</div><div className="sc-label">{label}</div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate(); const { tick } = useAlerts();
  const [days, setDays] = useState(7);
  const { data: d, error, loading, reload } = useLoad(() => api(`/dashboard?days=${days}`), [days, tick]);
  const [first, setFirst] = useState(true); useEffect(() => { if (d) setFirst(false); }, [d]);
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!d) return <Loading />;

  const maxStatus = Math.max(1, ...Object.values(d.byStatus));
  return (
    <>
      <PageHead title="Dashboard" sub="Here's what's happening at your bakery.">
        <div className="segmented" style={{ marginBottom: 0 }}>{[7, 30].map(n => <button key={n} className={`segmented-btn ${days === n ? 'active' : ''}`} onClick={() => setDays(n)}>{n} days</button>)}</div>
        <button className="btn btn-outline btn-sm" onClick={reload}><Icon name="refresh" size={14} /> Refresh</button>
      </PageHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <Stat tone="gold" icon="money" value={fmt(d.period.revenue)} label={`Sales · last ${days} days`} trend={d.period.revenueChange} onClick={() => navigate('/reports')} />
        <Stat tone="purple" icon="orders" value={d.period.orders} label={`Orders · last ${days} days`} trend={d.period.ordersChange} onClick={() => navigate('/orders')} />
        <Stat tone="blue" icon="customers" value={d.customers} label="Registered customers" onClick={() => navigate('/customers')} />
        <Stat tone="terra" icon="clock" value={d.byStatus['Order Placed'] || 0} label="Waiting for confirmation" onClick={() => navigate('/orders?status=Order Placed')} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-head"><div><h3>Sales overview</h3><div className="sub">Last {days} days · today {fmt(d.today.revenue)} from {d.today.orders} order{d.today.orders === 1 ? '' : 's'}</div></div></div>
          {d.chart.revenue.some(v => v > 0) || d.chart.orders.some(v => v > 0) ? <SalesChart labels={d.chart.labels} revenue={d.chart.revenue} orders={d.chart.orders} /> : <Empty icon="reports" title="No sales in this period yet" text="Orders will appear on this chart as customers place them." />}
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Orders by status</h3><div className="sub">{d.ordersTotal} orders in total · {fmt(d.revenueTotal)} sales all-time</div></div></div>
          {STATUSES.map(s => (
            <div key={s} className="list-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders?status=${encodeURIComponent(s)}`)}>
              <div style={{ width: 130 }}><StatusBadge status={s} /></div>
              <div style={{ flex: 1, height: 8, background: 'var(--bg-alt)', borderRadius: 99 }}><div style={{ width: `${(d.byStatus[s] / maxStatus) * 100}%`, height: '100%', background: 'var(--purple-500)', borderRadius: 99, opacity: 0.75 }} /></div>
              <div className="lr-val" style={{ width: 32 }}>{d.byStatus[s]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-head"><div><h3>Top sellers</h3><div className="sub">By sales, last 30 days</div></div></div>
          {d.topCakes.length === 0 ? <Empty icon="products" title="Nothing sold yet" text="Your best sellers will show up here." /> : d.topCakes.map(t => (
            <div className="list-row" key={t.name}>
              {t.cake?.images?.[0] ? <img src={assetUrl(t.cake.images[0])} alt="" /> : <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="products" size={18} /></div>}
              <div><div className="lr-name">{t.name}</div><div className="lr-sub">{t.qty} sold</div></div><div className="lr-val">{fmt(t.revenue)}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><div><h3>What needs your attention</h3><div className="sub">Based on your real orders, reviews and messages</div></div></div>
          {d.insights.length === 0 ? <Empty icon="check-circle" title="All caught up" text="Nothing needs attention right now." /> : d.insights.map((x, i) => (
            <div key={i} className={`insight-row ${x.tone === 'good' ? 'positive' : x.tone === 'warn' ? 'warning' : x.tone}`}><div className="ins-ic"><Icon name={x.icon} /></div><p>{x.text}</p></div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Recent orders</h3></div><button className="btn btn-outline btn-sm" onClick={() => navigate('/orders')}>View all</button></div>
        {d.recent.length === 0 ? <Empty icon="orders" title="No orders yet" text="When customers order from your website, they appear here." /> : (
          <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Placed</th></tr></thead><tbody>
            {d.recent.map(o => <tr key={o.orderNum} style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders?q=${o.orderNum}`)}><td><b>{o.orderNum}</b></td><td>{o.customer?.name}</td><td>{fmt(o.totals.total)}</td><td><StatusBadge status={o.status} /></td><td>{timeAgo(o.createdAt)}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </>
  );
}
