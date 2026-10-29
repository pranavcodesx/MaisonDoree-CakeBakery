import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import CakeImage from '../components/CakeImage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { api } from '../lib/api.js';
import { fmtDate, fmtDateTime, fmtPrice } from '../lib/format.js';
import { orderItemDetail } from '../lib/orderText.js';
import { STATUS_BADGE, TRACK_STEPS } from '../lib/constants.js';

export default function Track() {
  const { orderNum } = useParams(); const navigate = useNavigate(); const { user, ready } = useAuth(); const { openLogin } = useUI();
  const [order, setOrder] = useState(null); const [error, setError] = useState('');
  useEffect(() => { if (ready && !user) openLogin(window.location.pathname); }, [ready, user, openLogin]);
  useEffect(() => {
    if (!user) return undefined;
    let stop = false;
    const load = async () => {
      try {
        if (orderNum) { const d = await api(`/api/orders/${orderNum}`); if (!stop) setOrder(d.order); }
        else { const d = await api('/api/orders'); if (!stop) { if (d.active) navigate(`/track/${d.active.orderNum}`, { replace: true }); else setError('You have no active orders to track.'); } }
      } catch (e) { if (!stop) setError(e.message); }
    };
    load();
    const t = setInterval(load, 30000);   // status updates appear without a refresh
    return () => { stop = true; clearInterval(t); };
  }, [orderNum, user, navigate]);

  const cancelled = order?.status === 'Cancelled';
  const hist = order ? Object.fromEntries(order.statusHistory.map(h => [h.status, h.at])) : {};
  const curIdx = order ? TRACK_STEPS.findIndex(s => s.label === order.status) : -1;
  const b = order && STATUS_BADGE[order.status];
  return (
    <section className="page active" data-page="track">
      <div className="page-hero-banner"><div className="container"><span className="eyebrow">Live Status</span><h1 className="h-section">Track Your Order</h1></div></div>
      <section className="section" style={{ paddingTop: 50 }}><div className="container">
        <button className="account-back-btn" onClick={() => navigate('/account')}><Icon name="arrow-left" /> Back to My Account</button>
        {error && <div className="empty-state"><p>{error}</p><button className="btn btn-primary btn-sm" onClick={() => navigate('/shop')}>Browse cakes</button></div>}
        {order && (
          <div className="track-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase' }}>Order</span><h3 style={{ fontFamily: 'var(--f-display)', fontSize: 22 }}>{order.orderNum}</h3></div>
                <span className={`badge ${b.cls}`}><Icon name={b.icon} /> {order.status}</span>
              </div>
              {order.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
                  <CakeImage cake={{ name: it.name, images: it.image ? [it.image] : [], theme: 'gold' }} style={{ width: 60, height: 60, borderRadius: 12, flex: 'none', overflow: 'hidden' }} />
                  <div><b style={{ fontSize: 13.5 }}>{it.qty} × {it.name}</b><div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{orderItemDetail(it)}</div></div>
                </div>
              ))}
            </div>
            {cancelled ? <p style={{ margin: '24px 0', color: 'var(--terracotta)', fontWeight: 600 }}>This order was cancelled{hist.Cancelled ? ` on ${fmtDateTime(hist.Cancelled)}` : ''}.</p> : (
              <div className="track-timeline">
                {TRACK_STEPS.map((s, i) => {
                  const done = i < curIdx || order.status === 'Delivered', active = i === curIdx && order.status !== 'Delivered';
                  return (
                    <div key={s.label} className={`t-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                      {i < TRACK_STEPS.length - 1 && <div className="t-line" />}
                      <div className="t-dot"><Icon name={s.icon} /></div>
                      <div><h5>{s.label}</h5><p>{hist[s.label] ? fmtDateTime(hist[s.label]) : s.label === 'Delivered' ? `Expected ${fmtDate(order.delivery.date)}, ${order.delivery.slot}` : 'Pending'}</p></div>
                    </div>
                  );
                })}
              </div>
            )}
            {!cancelled && order.status !== 'Delivered' && (
              <div className="track-eta"><div><span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold-700)' }}>Scheduled Delivery</span><br /><b>{fmtDate(order.delivery.date)}, {order.delivery.slot}</b></div><Icon name="clock" style={{ width: 26, height: 26, color: 'var(--gold-700)' }} /></div>
            )}
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 18 }}>Deliver to {order.address.label}: {order.address.line} ({order.address.pincode}) · Total {fmtPrice(order.totals.total)}</div>
            <div className="success-actions" style={{ marginTop: 28 }}>
              <button className="btn btn-primary" onClick={() => navigate('/account/orders')}>My Orders</button>
              <button className="btn btn-ghost" onClick={() => navigate('/contact')}><Icon name="message" size={14} /> Need Help?</button>
              <button className="btn btn-outline" onClick={() => navigate('/shop')}>Continue Shopping</button>
            </div>
          </div>
        )}
      </div></section>
    </section>
  );
}
