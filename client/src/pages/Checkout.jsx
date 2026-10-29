import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import CakeImage from '../components/CakeImage.jsx';
import AddressModal from '../components/AddressModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { itemDetail } from '../components/CartDrawer.jsx';
import { api, ApiError } from '../lib/api.js';
import { loadRazorpay } from '../lib/razorpay.js';
import { fmtDate, fmtPrice } from '../lib/format.js';
import { toServerItem } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

const STEPS = ['Details', 'Delivery', 'Payment', 'Review'];
const dayLabel = (iso, i) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));

export default function Checkout() {
  const { taxRate, delivery: rules } = useSettings();
  const { user, ready } = useAuth(); const cart = useCart(); const { openLogin, setCartOpen } = useUI(); const toast = useToast(); const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [cust, setCust] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '' });
  const [addrId, setAddrId] = useState(null); const [addrModal, setAddrModal] = useState({ open: false, addr: null });
  const [pin, setPin] = useState(null);               // result of the pincode check for the chosen address
  const [slots, setSlots] = useState(null);
  const [date, setDate] = useState(null); const [time, setTime] = useState(null); const [note, setNote] = useState('');
  const [method, setMethod] = useState('online');
  const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);       // an online order that was created but not paid yet
  const [code, setCode] = useState('');

  useEffect(() => { if (ready && !user) openLogin('/checkout'); }, [ready, user, openLogin]);
  useEffect(() => { if (user) setCust(c => ({ name: c.name || user.name, phone: c.phone || user.phone || '', email: c.email || user.email || '' })); }, [user]);
  useEffect(() => { api('/api/delivery/slots').then(d => { setSlots(d); const first = d.days.find(x => x.available); setDate(first?.date || null); }).catch(() => {}); }, []);

  const addresses = user?.addresses || [];
  useEffect(() => { if (!addrId && addresses.length) setAddrId((addresses.find(a => a.isDefault) || addresses[0])._id); }, [addresses, addrId]);
  const addr = addresses.find(a => a._id === addrId);

  // delivery charge + serviceability come from the pincode table
  useEffect(() => {
    if (!addr) { setPin(null); cart.setPincode(''); return; }
    api(`/api/pincodes/${addr.pincode}`).then(d => { setPin(d); cart.setPincode(d.deliverable ? addr.pincode : ''); }).catch(() => setPin(null));
  }, [addr?.pincode]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = cart.quote?.totals;
  const codBlocked = q && q.total > rules.codMax;
  useEffect(() => { if (codBlocked && method === 'cod') setMethod('online'); }, [codBlocked, method]);

  function next(to) {
    const e = {};
    if (to === 2) {
      if (cust.name.trim().length < 2) e.name = 'Please add your full name to continue.';
      if (!/^[6-9]\d{9}$/.test(cust.phone.replace(/\D/g, '').slice(-10))) e.phone = 'Please enter a valid 10-digit phone number.';
      if (cust.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cust.email)) e.email = 'Please enter a valid email address.';
      if (!addr) e.address = 'Please add or select a delivery address.';
      else if (pin && !pin.deliverable) e.address = pin.message || "We don't deliver to this pincode yet.";
    }
    if (to === 3) { if (!date) e.date = 'Please choose a delivery date.'; if (!time) e.time = 'Please choose a delivery time slot.'; }
    setErrors(e);
    if (Object.keys(e).length) { toast(Object.values(e)[0], 'error'); return; }
    setStep(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function payOnline(info, order) {
    await loadRazorpay();
    return new Promise((resolve, reject) => {
      const rz = new window.Razorpay({
        key: info.keyId, amount: info.amount, currency: info.currency, order_id: info.orderId, name: 'Maison Dorée', description: `Order ${order.orderNum}`,
        prefill: { name: cust.name, email: cust.email, contact: cust.phone }, theme: { color: '#C79A4B' },
        handler: async resp => {
          try { const d = await api(`/api/orders/${order.orderNum}/verify-payment`, { method: 'POST', body: resp }); resolve(d.order); } catch (e) { reject(e); }
        },
        modal: { ondismiss: () => reject(new Error('Payment was cancelled. Your order is saved — tap "Pay now" to try again.')) },
      });
      rz.on('payment.failed', r => reject(new Error(r.error?.description || 'Payment failed. Please try again.')));
      rz.open();
    });
  }

  async function place() {
    setBusy(true);
    try {
      let order; let info = pending?.razorpay;
      if (pending) order = pending.order;
      else {
        const d = await api('/api/orders', { method: 'POST', body: {
          items: cart.items.map(toServerItem), customer: cust,
          address: { label: addr.label, line: addr.line, pincode: addr.pincode },
          delivery: { date, slot: time, note: note || undefined }, paymentMethod: method, couponCode: cart.couponCode || undefined, usePoints: cart.usePoints || undefined,
        } });
        order = d.order; info = d.razorpay;
      }
      if (method === 'online') {
        setPending({ order, razorpay: info });
        order = await payOnline(info, order);
      }
      cart.clear(); setPending(null);
      navigate(`/order/${order.orderNum}/success`, { replace: true });
    } catch (e) {
      toast(e.message, 'error');
      if (e instanceof ApiError && e.status === 400 && !pending) setStep(e.field === 'date' || e.field === 'slot' ? 2 : e.field === 'pincode' ? 1 : step);
    }
    setBusy(false);
  }

  if (ready && user && cart.items.length === 0 && !pending) {
    return <section className="page active"><section className="section checkout-section"><div className="container"><div className="empty-state"><Icon name="cart" /><h4>Your cart is empty</h4><p>Add a cake to start your order.</p><button className="btn btn-primary btn-sm" onClick={() => navigate('/shop')}>Browse Cakes</button></div></div></section></section>;
  }
  const selDay = slots?.days.find(d => d.date === date);

  return (
    <section className="page active" data-page="checkout">
      <section className="section checkout-section">
        <div className="container">
          <div className="section-head"><span className="eyebrow">Almost There</span><h2 className="h-section">Checkout</h2></div>
          <div className="step-indicator">
            {STEPS.map((l, i) => <div key={l} className={`s-item ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}><div className="dot">{step > i + 1 ? <Icon name="check" /> : i + 1}</div><span>{l}</span>{i < 3 && <div className="bar" />}</div>)}
          </div>
          <div className="checkout-layout">
            <div>
              {step === 1 && (
                <div className="checkout-panel active panel" style={{ padding: 30 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 18 }}>Your details</h3>
                  <div className="form-row">
                    <div className="form-field"><label>Full name</label><input type="text" autoComplete="name" value={cust.name} onChange={e => setCust(c => ({ ...c, name: e.target.value }))} /><small className="field-error">{errors.name}</small></div>
                    <div className="form-field"><label>Phone number</label><input type="tel" autoComplete="tel" value={cust.phone} onChange={e => setCust(c => ({ ...c, phone: e.target.value }))} /><small className="field-error">{errors.phone}</small></div>
                  </div>
                  <div className="form-field"><label>Email (for order updates)</label><input type="email" autoComplete="email" value={cust.email} onChange={e => setCust(c => ({ ...c, email: e.target.value }))} /><small className="field-error">{errors.email}</small></div>
                  <h3 style={{ fontSize: 18, margin: '26px 0 14px' }}>Delivery address</h3>
                  {addresses.map(a => (
                    <div key={a._id} className={`addr-card ${a._id === addrId ? 'sel' : ''}`} onClick={() => setAddrId(a._id)}>
                      <div><h5>{a.label}</h5><p>{a.line} — {a.pincode}</p></div>
                      <div style={{ display: 'flex', gap: 6, flex: 'none' }}><button className="btn-icon" aria-label="Edit address" onClick={e => { e.stopPropagation(); setAddrModal({ open: true, addr: a }); }}><Icon name="edit" /></button></div>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{ marginBottom: 6 }} onClick={() => setAddrModal({ open: true, addr: null })}><Icon name="plus" size={13} /> Add new address</button>
                  {addr && pin && <div className={`pincode-result show ${pin.deliverable ? 'ok' : 'bad'}`}>{pin.deliverable ? `✓ We deliver to ${addr.pincode}${pin.area ? ` (${pin.area})` : ''} · delivery ${fmtPrice(pin.deliveryCharge)}` : pin.message}</div>}
                  <small className="field-error">{errors.address}</small>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 26 }}><button className="btn btn-primary" onClick={() => next(2)}>Continue to Delivery <Icon name="chev-right" size={14} /></button></div>
                </div>
              )}

              {step === 2 && (
                <div className="checkout-panel active panel" style={{ padding: 30 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 4 }}>Choose delivery date</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 14 }}>All cakes are baked fresh for your delivery day.</p>
                  <div className="slot-grid" style={{ marginBottom: 22 }}>
                    {slots?.days.map((d, i) => <div key={d.date} className={`slot-card ${date === d.date ? 'sel' : ''}`} style={d.available ? undefined : { opacity: 0.45, pointerEvents: 'none' }} onClick={() => setDate(d.date)}>{dayLabel(d.date, i)}{i === 0 && <small>{d.available ? `Order by ${slots.cutoffHour - 12} PM` : 'Closed for today'}</small>}</div>)}
                  </div>
                  <h3 style={{ fontSize: 18, marginBottom: 4 }}>Choose delivery time</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 14 }}>Same-day slots available until {slots ? slots.cutoffHour - 12 : 4} PM.</p>
                  <div className="slot-grid">{slots?.slots.map(t => <div key={t} className={`slot-card ${time === t ? 'sel' : ''}`} onClick={() => setTime(t)}>{t}</div>)}</div>
                  <div className="form-field" style={{ marginTop: 22 }}><label>Order notes (optional)</label>
                    <textarea value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder="e.g. Please call before delivery, leave with security, etc." style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--bg-alt)', fontSize: 13.6, minHeight: 84 }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}><button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary" onClick={() => next(3)}>Continue to Payment <Icon name="chev-right" size={14} /></button></div>
                </div>
              )}

              {step === 3 && (
                <div className="checkout-panel active panel" style={{ padding: 30 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 6 }}>Payment Method</h3>
                  <p style={{ fontSize: 12.8, color: 'var(--ink-faint)', marginBottom: 20 }}>Choose how you'd like to pay.</p>
                  <div className="pay-accordion">
                    <div className="pay-block">
                      <div className={`pay-method ${method === 'online' ? 'sel' : ''}`} onClick={() => !pending && setMethod('online')}>
                        <span className="radio" /><span className="ic"><Icon name="card" /></span>
                        <div><b>Pay online</b><small>UPI, cards, net banking and wallets — secured by Razorpay.</small></div>
                      </div>
                    </div>
                    <div className="pay-block" style={codBlocked ? { opacity: 0.55 } : undefined}>
                      <div className={`pay-method ${method === 'cod' ? 'sel' : ''}`} onClick={() => !pending && !codBlocked && setMethod('cod')}>
                        <span className="radio" /><span className="ic"><Icon name="cash" /></span>
                        <div><b>Cash on Delivery</b><small>{codBlocked ? `Available for orders up to ${fmtPrice(rules.codMax)}` : 'Pay when your cake is delivered'}</small></div>
                      </div>
                      {method === 'cod' && <div className="cod-info-box" style={{ margin: '12px 4px 4px' }}><b>COD Information</b><ul><li><Icon name="check" /> Please keep the exact change ready</li><li><Icon name="check" /> Our delivery partner will collect the payment at delivery</li></ul></div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}><button className="btn btn-ghost" onClick={() => setStep(2)} disabled={!!pending}>Back</button><button className="btn btn-primary" onClick={() => next(4)}>Continue to Review <Icon name="chev-right" size={14} /></button></div>
                </div>
              )}

              {step === 4 && (
                <div className="checkout-panel active panel" style={{ padding: 30 }}>
                  <h3 style={{ fontSize: 18, marginBottom: 18 }}>Review &amp; place order</h3>
                  {[['Contact', `${cust.name} · ${cust.phone}${cust.email ? ' · ' + cust.email : ''}`, 1], ['Deliver to', `${addr?.label} — ${addr?.line} (${addr?.pincode})`, 1], ['When', `${selDay ? fmtDate(selDay.date) : ''}, ${time}${note ? ` · Note: ${note}` : ''}`, 2], ['Payment', method === 'cod' ? 'Cash on Delivery' : 'Online (UPI / card / net banking / wallet)', 3]].map(([k, v, s]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                      <div><b>{k}</b><div style={{ color: 'var(--ink-soft)' }}>{v}</div></div>{!pending && <button className="btn btn-ghost btn-sm" onClick={() => setStep(s)}>Change</button>}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26, alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <button className="btn btn-ghost" onClick={() => setStep(3)} disabled={!!pending}>Back</button>
                    <button className="btn btn-primary" style={{ padding: '16px 40px' }} onClick={place} disabled={busy || !q || !!cart.quoteError}>
                      {busy ? 'Please wait…' : `${pending ? 'Pay now' : method === 'cod' ? 'Place Order' : 'Place Order & Pay'} — ${q ? fmtPrice(q.total) : '…'}`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <aside className="order-summary-card">
              <h4 style={{ fontFamily: 'var(--f-display)', fontSize: 17, marginBottom: 16 }}>Order Summary</h4>
              {cart.items.map((it, i) => {
                const line = cart.quote?.lines?.[i];
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <CakeImage cake={{ ...it.snap, _id: it.cakeId, theme: it.snap?.theme || 'gold' }} style={{ width: 52, height: 52, borderRadius: 10, flex: 'none', overflow: 'hidden' }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}><b>{it.qty} × {it.snap?.name}</b><div style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>{itemDetail(it, line)}</div></div>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{line ? fmtPrice(line.unitPrice * it.qty) : ''}</span>
                  </div>
                );
              })}
              {!pending && cart.quote?.points && (cart.quote.points.canUse > 0 || cart.quote.points.balance > 0) && (
                cart.quote.points.canUse > 0
                  ? <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5, margin: '10px 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={cart.usePoints} onChange={e => cart.setUsePoints(e.target.checked)} />
                      <span>Use <b>{cart.quote.points.canUse} reward points</b> and save {fmtPrice(cart.quote.points.discount)}</span>
                    </label>
                  : <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '10px 0' }}>You have {cart.quote.points.balance} reward points. You can use them once you have {cart.quote.points.minRedeem}.</p>
              )}
              {!pending && (
                <div className="coupon-row" style={{ margin: '10px 0' }}>
                  <input type="text" placeholder="Coupon code" value={code} onChange={e => setCode(e.target.value)} />
                  <button className="btn btn-ghost btn-sm" onClick={() => { cart.applyCoupon(code).catch(e => toast(e.message, 'error')); setCode(''); }}>Apply</button>
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <div className="sum-row"><span>Subtotal</span><span>{q ? fmtPrice(q.subtotal) : '…'}</span></div>
                <div className="sum-row"><span>Delivery</span><span>{q ? fmtPrice(q.delivery) : '…'}</span></div>
                <div className="sum-row"><span>Tax ({taxRate}%)</span><span>{q ? fmtPrice(q.tax) : '…'}</span></div>
                {q?.discount > 0 && <div className="sum-row" style={{ color: 'var(--sage)' }}><span>Discount ({cart.couponCode})</span><span>−{fmtPrice(q.discount)}</span></div>}
                {q?.pointsDiscount > 0 && <div className="sum-row" style={{ color: 'var(--sage)' }}><span>Reward points</span><span>−{fmtPrice(q.pointsDiscount)}</span></div>}
                <div className="sum-row total"><span>Total</span><span>{q ? fmtPrice(q.total) : '…'}</span></div>
              </div>
              {!pending && <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setCartOpen(true)}>Edit cart</button>}
            </aside>
          </div>
        </div>
      </section>
      <AddressModal open={addrModal.open} address={addrModal.addr} onClose={() => setAddrModal({ open: false, addr: null })} onSaved={list => { if (!addrModal.addr) setAddrId(list[list.length - 1]._id); }} />
    </section>
  );
}
