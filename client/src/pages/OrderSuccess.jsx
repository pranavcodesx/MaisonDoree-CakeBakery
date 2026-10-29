import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { api } from '../lib/api.js';
import { downloadInvoice } from '../lib/invoice.js';
import { fmtPrice } from '../lib/format.js';

export default function OrderSuccess() {
  const { orderNum } = useParams(); const navigate = useNavigate(); const [order, setOrder] = useState(null);
  useEffect(() => { api(`/api/orders/${orderNum}`).then(d => setOrder(d.order)).catch(() => navigate('/account/orders', { replace: true })); }, [orderNum, navigate]);
  const paid = order?.payment.status === 'paid';
  return (
    <section className="page active" data-page="success">
      <section className="section"><div className="container"><div className="success-wrap">
        <div className="success-check"><svg viewBox="0 0 100 100" fill="none"><circle className="circle" cx="50" cy="50" r="46" stroke="#6E8B5E" strokeWidth="4" /><path className="tick" d="M30 52l14 14 26-30" stroke="#6E8B5E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Order Confirmed</span>
        <h2 className="h-section" style={{ marginTop: 10 }}>Your cake is on its way to the oven!</h2>
        <p className="lede" style={{ margin: '14px auto 0' }}>{order?.customer.email ? `We'll keep ${order.customer.email} updated.` : 'We will keep you updated.'} Our pastry chefs will start baking shortly.</p>
        {order && <div className="payment-success-note"><Icon name="check-circle" /><span><b>{paid ? 'Payment received' : 'Pay on delivery'}</b><small>{paid ? `${fmtPrice(order.totals.total)} paid online.` : `Please keep ${fmtPrice(order.totals.total)} ready at delivery.`}</small></span></div>}
        <div className="order-num-card"><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Order Number</span><span className="num">{orderNum}</span></div>
        <div className="success-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/track/${orderNum}`)}>Track Order</button>
          <button className="btn btn-ghost" disabled={!order} onClick={() => downloadInvoice(order)}><Icon name="download" size={14} /> Download Invoice</button>
          <button className="btn btn-outline" onClick={() => navigate('/shop')}>Continue Shopping</button>
        </div>
      </div></div></section>
    </section>
  );
}
