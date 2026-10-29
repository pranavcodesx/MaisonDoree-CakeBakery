import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CakeImage from './CakeImage.jsx';
import Icon from './Icon.jsx';
import { useCart, itemKey } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fmtPrice } from '../lib/format.js';
import { useSettings } from '../context/SettingsContext.jsx';

export function itemDetail(i, line) {
  return [line?.weight || i.weight, i.flavor, i.candle && i.candle !== 'Number Candle' ? i.candle : '', i.knife && i.knife !== 'Classic Knife' ? i.knife : '',
    i.custom ? `${i.custom.layers} tier · ${i.custom.cream} · ${i.custom.topper === 'none' ? 'no topper' : i.custom.topper}` : '',
    i.message ? `"${i.message}"` : '', i.photoUrl ? 'photo attached' : ''].filter(Boolean).join(' · ');
}

export default function CartDrawer() {
  const { taxRate } = useSettings();
  const cart = useCart(); const { cartOpen, setCartOpen } = useUI(); const navigate = useNavigate(); const toast = useToast();
  const [code, setCode] = useState('');
  const q = cart.quote?.totals;
  const close = () => setCartOpen(false);
  return (
    <div className={`drawer-overlay ${cartOpen ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && close()}>
      <div className="drawer">
        <div className="drawer-head">
          <h3>Your Cart ({cart.count})</h3>
          <button className="modal-close" style={{ position: 'static' }} onClick={close} aria-label="Close cart"><Icon name="x" /></button>
        </div>
        <div className="drawer-body">
          {cart.items.length === 0 ? (
            <div className="empty-state"><Icon name="cart" /><p>Your cart is empty. Let's fix that with something sweet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => { close(); navigate('/shop'); }}>Browse Cakes</button></div>
          ) : cart.items.map((it, idx) => {
            const key = itemKey(it); const line = cart.quote?.lines?.[idx];
            return (
              <div className="cart-item" key={key}>
                <CakeImage cake={{ ...it.snap, _id: it.cakeId, theme: it.snap?.theme || 'gold' }} variant={idx % 3} style={{ borderRadius: 14, overflow: 'hidden' }} />
                <div className="ci-info">
                  <div className="ci-name">{it.snap?.name || line?.name}</div>
                  <div className="ci-opt">{itemDetail(it, line)}</div>
                  <div className="ci-row">
                    <div className="qty-stepper">
                      <button onClick={() => cart.setQty(key, it.qty - 1)}><Icon name="minus" size={11} /></button>
                      <span>{it.qty}</span>
                      <button onClick={() => cart.setQty(key, it.qty + 1)}><Icon name="plus" size={11} /></button>
                    </div>
                    <span className="ci-price">{line ? fmtPrice(line.unitPrice * it.qty) : '…'}</span>
                  </div>
                  <a className="ci-remove" onClick={() => cart.remove(key)}>Remove</a>
                </div>
              </div>
            );
          })}
          {cart.quoteError && <p style={{ color: 'var(--terracotta)', fontSize: 12.5, padding: '8px 4px' }}>{cart.quoteError} Remove the unavailable item to continue.</p>}
        </div>
        {cart.items.length > 0 && (
          <div className="drawer-foot">
            <div className="coupon-row">
              <input type="text" placeholder="Coupon code" value={code} onChange={e => setCode(e.target.value)} />
              <button className="btn btn-ghost btn-sm" onClick={() => { cart.applyCoupon(code).catch(e => toast(e.message, 'error')); setCode(''); }}>Apply</button>
            </div>
            {cart.couponCode && <p style={{ fontSize: 12, color: 'var(--sage)', margin: '4px 0' }}>Coupon {cart.couponCode} applied · <a style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => cart.setCouponCode('')}>remove</a></p>}
            <div className="sum-row"><span>Subtotal</span><span>{q ? fmtPrice(q.subtotal) : '…'}</span></div>
            {q?.discount > 0 && <div className="sum-row" style={{ color: 'var(--sage)' }}><span>Discount</span><span>−{fmtPrice(q.discount)}</span></div>}
            {q?.pointsDiscount > 0 && <div className="sum-row" style={{ color: 'var(--sage)' }}><span>Reward points</span><span>−{fmtPrice(q.pointsDiscount)}</span></div>}
            <div className="sum-row"><span>Delivery</span><span>{q ? fmtPrice(q.delivery) : '…'}</span></div>
            <div className="sum-row"><span>Tax ({taxRate}%)</span><span>{q ? fmtPrice(q.tax) : '…'}</span></div>
            <div className="sum-row total"><span>Total</span><span>{q ? fmtPrice(q.total) : '…'}</span></div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={!q || !!cart.quoteError} onClick={() => { close(); navigate('/checkout'); }}>
              Proceed to Checkout <Icon name="chev-right" size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
