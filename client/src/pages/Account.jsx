import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import CakeImage from '../components/CakeImage.jsx';
import Stars from '../components/Stars.jsx';
import ProductCard from '../components/ProductCard.jsx';
import AddressModal from '../components/AddressModal.jsx';
import ReviewModal from '../components/ReviewModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useReorder } from '../hooks/useReorder.js';
import { api } from '../lib/api.js';
import { fmtDate, fmtPrice } from '../lib/format.js';
import { orderItemDetail, photoLink, stepIndex } from '../lib/orderText.js';
import { STATUS_BADGE } from '../lib/constants.js';

const TILES = [
  ['orders', 'box', 'peach', 'My Orders', 'View all your orders'], ['addresses', 'pin', 'peach', 'Saved Addresses', 'Manage your delivery addresses'],
  ['wishlist', 'heart', 'pink', 'Wishlist', 'Your favorite cakes'], ['payments', 'card', 'blue', 'Payments', 'Payment history'],
  ['rewards', 'gift', 'peach', 'Rewards & Coupons', 'Points, rewards & offers'], ['reviews', 'star', 'peach', 'My Reviews', 'Your reviews & ratings'],
  ['settings', 'user', 'purple', 'Account Settings', 'Profile, password, preferences'],
];
const TITLES = Object.fromEntries(TILES.map(t => [t[0], t[3]]));
const cakeOf = it => ({ name: it.name, images: it.image ? [it.image] : [], theme: 'gold', category: it.kind === 'custom' ? 'designer' : '', _id: it.cake });

function Empty({ icon, title, text, action }) {
  return <div className="empty-state">{icon && <Icon name={icon} />}<h4>{title}</h4><p>{text}</p>{action}</div>;
}

/* ---------- hub ---------- */
function Hub({ go }) {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const [active, setActive] = useState(undefined);
  useEffect(() => { api('/api/orders').then(d => setActive(d.active)).catch(() => setActive(null)); }, []);
  const idx = active ? stepIndex(active.status) : 0;
  return (
    <div>
      <div className="account-info-card">
        <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
        <div className="account-info-text"><h4>{user.name}</h4>{user.email && <p>{user.email}</p>}{user.phone && <p>+91 {user.phone}</p>}</div>
        <button className="btn btn-outline btn-sm" onClick={() => go('settings')}><Icon name="edit" size={13} /> Edit Profile</button>
      </div>
      {active === undefined ? null : active ? (
        <div className="active-order-card">
          <div className="ao-top">
            <CakeImage cake={cakeOf(active.items[0])} style={{ width: 76, height: 76 }} />
            <div className="ao-info"><span className="badge sage">Active Order</span><h4>#{active.orderNum}</h4>
              <p>{active.items[0].name}{active.items.length > 1 ? ` +${active.items.length - 1} more` : ''}</p><b>{fmtPrice(active.totals.total)}</b></div>
          </div>
          <div className="mini-stepper">
            {['Placed', 'Baked', 'Out for Delivery', 'Delivered'].map((l, i) => (
              <div key={l} className={`ms-step ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}`}>
                <div className="ms-dot">{i <= idx && <Icon name={['check', 'check', 'truck', 'package-check'][i]} />}</div><div className="ms-label">{l}</div></div>
            ))}
          </div>
          <div className="ao-bottom">
            <div className="ao-eta"><Icon name="truck" /> {active.status === 'Out for Delivery' ? 'Arriving today' : `Delivery ${fmtDate(active.delivery.date)}, ${active.delivery.slot}`}</div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/track/${active.orderNum}`)}>Track Order <Icon name="chev-right" size={13} /></button>
          </div>
        </div>
      ) : (
        <div className="active-order-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 14 }}>No active orders right now.</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/shop')}>Explore Cakes</button>
        </div>
      )}
      <div className="account-menu-grid">
        {TILES.map(([k, ic, tone, title, sub]) => (
          <button key={k} className="account-tile" onClick={() => go(k)}>
            <span className={`tile-ic ${tone}`}><Icon name={ic} /></span><span className="tile-text"><b>{title}</b><small>{sub}</small></span><Icon name="chev-right" className="chev" />
          </button>
        ))}
        <button className="account-tile" onClick={() => navigate('/contact')}>
          <span className="tile-ic green"><Icon name="message" /></span><span className="tile-text"><b>Help &amp; Support</b><small>FAQs, Contact support</small></span><Icon name="chev-right" className="chev" />
        </button>
      </div>
      <button className="account-logout-btn" onClick={async () => { navigate('/'); await logout(); }}><Icon name="logout" /> Logout</button>
    </div>
  );
}

/* ---------- orders ---------- */
function OrdersTab() {
  const navigate = useNavigate(); const toast = useToast(); const reorder = useReorder();
  const [orders, setOrders] = useState(null); const [rewards, setRewards] = useState(null); const [reviews, setReviews] = useState([]);
  const [open, setOpen] = useState(null); const [rctx, setRctx] = useState(null);
  const load = useCallback(() => {
    api('/api/orders').then(d => setOrders(d.items)).catch(() => setOrders([]));
    api('/api/me/rewards').then(setRewards).catch(() => {});
    api('/api/me/reviews').then(d => setReviews(d.items)).catch(() => {});
  }, []);
  useEffect(load, [load]);
  const existingFor = (order, it) => reviews.find(r => r.order?.orderNum === order.orderNum && String(r.cake?._id || r.cake) === String(it.cake));

  async function cancel(o) {
    if (!window.confirm(`Cancel order ${o.orderNum}?`)) return;
    try { await api(`/api/orders/${o.orderNum}/cancel`, { method: 'POST' }); toast('Order cancelled', 'success'); load(); } catch (e) { toast(e.message, 'error'); }
  }
  return (
    <div>
      <div className="stat-cards">
        <div className="stat-card"><b>{rewards?.totalOrders ?? '–'}</b><span>Total Orders</span></div>
        <div className="stat-card"><b>{rewards ? rewards.points.toLocaleString('en-IN') : '–'}</b><span>Reward Points</span></div>
        <div className="stat-card"><b>{rewards?.tier ?? '–'}</b><span>Member Tier</span></div>
      </div>
      <div className="order-history-heading"><div><span className="eyebrow">Your purchase timeline</span><h3>Order history</h3></div></div>
      {orders === null ? <p>Loading…</p> : orders.length === 0
        ? <Empty title="No orders yet" text="Your orders will appear here once you place one." action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/shop')}>Browse cakes</button>} />
        : orders.map(o => {
          const b = STATUS_BADGE[o.status]; const first = o.items[0];
          return (
            <div key={o.orderNum} style={{ marginBottom: 12 }}>
              <div className="order-row">
                <CakeImage cake={cakeOf(first)} style={{ width: 60, height: 60 }} />
                <div className="or-info"><h5>{first.name}{o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}</h5><small>{o.orderNum} · {fmtDate(o.createdAt)} · {fmtPrice(o.totals.total)}</small></div>
                <span className={`badge ${b.cls}`}>{o.status}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === o.orderNum ? null : o.orderNum)}>{open === o.orderNum ? 'Hide' : 'Details'}</button>
                  {o.status !== 'Cancelled' && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/track/${o.orderNum}`)}>Track</button>}
                  <button className="btn btn-outline btn-sm" onClick={() => reorder(o)}>Reorder</button>
                  {['Order Placed', 'Confirmed'].includes(o.status) && <button className="btn btn-ghost btn-sm" onClick={() => cancel(o)}>Cancel</button>}
                </div>
              </div>
              {open === o.orderNum && (
                <div className="panel" style={{ padding: '16px 20px', marginTop: -4, fontSize: 12.8 }}>
                  {o.items.map((it, i) => {
                    const ex = existingFor(o, it);
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                        <div><b>{it.qty} × {it.name}</b><div style={{ color: 'var(--ink-soft)' }}>{orderItemDetail(it)}{photoLink(it) && <> · <a href={photoLink(it)} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>photo</a></>}</div></div>
                        <div style={{ textAlign: 'right', flex: 'none' }}>{fmtPrice(it.unitPrice * it.qty)}
                          {o.status === 'Delivered' && it.cake && <div><button className="btn btn-ghost btn-sm" onClick={() => setRctx({ order: o, item: it, existing: ex })}>{ex ? 'Edit Review' : 'Write a Review'}</button></div>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ paddingTop: 10, color: 'var(--ink-soft)' }}>
                    <div>Deliver to: {o.address.label} — {o.address.line} ({o.address.pincode})</div>
                    <div>When: {fmtDate(o.delivery.date)}, {o.delivery.slot}</div>
                    <div>Payment: {o.payment.method === 'cod' ? 'Cash on Delivery' : 'Online'} · {o.payment.status}</div>
                    {o.delivery.note && <div>Note: {o.delivery.note}</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      <ReviewModal ctx={rctx} onClose={() => setRctx(null)} onSaved={load} />
    </div>
  );
}

/* ---------- addresses ---------- */
function AddressesTab() {
  const { user, patchUser } = useAuth(); const toast = useToast();
  const [modal, setModal] = useState({ open: false, addr: null });
  async function del(a) {
    try { const d = await api(`/api/me/addresses/${a._id}`, { method: 'DELETE' }); patchUser({ addresses: d.addresses }); toast('Address removed', 'info'); } catch (e) { toast(e.message, 'error'); }
  }
  return (
    <div className="addr-list">
      {user.addresses.length === 0 && <Empty icon="pin" title="No saved addresses" text="Add an address to check out faster." />}
      {user.addresses.map(a => (
        <div key={a._id} className="addr-card">
          <div><h5>{a.label}{a.isDefault && <span className="badge gold" style={{ marginLeft: 8 }}>Default</span>}</h5><p>{a.line} — {a.pincode}</p></div>
          <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
            <button className="btn-icon" onClick={() => setModal({ open: true, addr: a })} aria-label="Edit address"><Icon name="edit" /></button>
            <button className="btn-icon" onClick={() => del(a)} aria-label="Delete address"><Icon name="trash" /></button>
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => setModal({ open: true, addr: null })}><Icon name="plus" size={13} /> Add new address</button>
      <AddressModal open={modal.open} address={modal.addr} onClose={() => setModal({ open: false, addr: null })} />
    </div>
  );
}

/* ---------- wishlist ---------- */
function WishlistTab() {
  const { user } = useAuth(); const navigate = useNavigate(); const [items, setItems] = useState(null);
  useEffect(() => { api('/api/me/wishlist').then(d => setItems(d.items)).catch(() => setItems([])); }, [user.wishlist]);
  if (items === null) return <p>Loading…</p>;
  return items.length === 0
    ? <Empty icon="heart" title="Your wishlist is empty" text="Tap the heart on any cake to save it here." action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/shop')}>Browse cakes</button>} />
    : <div className="prod-grid">{items.map((c, i) => <ProductCard key={c._id} cake={c} idx={i} />)}</div>;
}

/* ---------- payments (history only: card data is never stored here) ---------- */
function PaymentsTab() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api('/api/orders').then(d => setOrders(d.items)).catch(() => setOrders([])); }, []);
  return (
    <div>
      <div className="pay-security-note" style={{ marginBottom: 18 }}><Icon name="shield" /><span>We never store card, UPI or bank details. Online payments are processed securely by Razorpay.</span></div>
      <h3 style={{ fontSize: 17, marginBottom: 12 }}>Payment history</h3>
      {orders === null ? <p>Loading…</p> : orders.length === 0 ? <Empty title="No payments yet" text="Payments for your orders will be listed here." />
        : orders.map(o => (
          <div key={o.orderNum} className="order-row">
            <div className="or-info"><h5>{o.orderNum}</h5><small>{fmtDate(o.createdAt)} · {o.payment.method === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'}</small></div>
            <b>{fmtPrice(o.totals.total)}</b>
            <span className={`badge ${o.payment.status === 'paid' ? 'sage' : 'gold'}`}>{o.payment.status === 'cod' ? 'Pay on delivery' : o.payment.status}</span>
          </div>
        ))}
    </div>
  );
}

/* ---------- rewards & coupons ---------- */
function RewardsTab() {
  const toast = useToast(); const [r, setR] = useState(null); const [coupons, setCoupons] = useState([]);
  useEffect(() => { api('/api/me/rewards').then(setR).catch(() => {}); api('/api/me/coupons').then(d => setCoupons(d.items)).catch(() => {}); }, []);
  return (
    <div>
      <div className="panel" style={{ padding: 30, background: 'linear-gradient(135deg,var(--gold-100),var(--blush))', border: 'none', textAlign: 'center', marginBottom: 24 }}>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Reward Points · {r?.tier || '…'} member</span>
        <h2 style={{ fontSize: 40, marginTop: 8 }}>{r ? r.points.toLocaleString('en-IN') : '…'} pts</h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6 }}>
          {r ? `Earn ${r.rules.earnPer100} points for every ₹100 spent, added when your order is delivered. Each point is worth ${fmtPrice(r.rules.pointValue)} at checkout (from ${r.rules.minRedeem} points, up to ${r.rules.maxPct}% of an order).` : ''}
        </p>
        {r?.next && <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>Spend {fmtPrice(r.next.remaining)} more on delivered orders to become a {r.next.tier} member.</p>}
      </div>
      {r?.history.length ? r.history.map(h => <div key={h.type + h.orderNum} className="order-row"><div className="or-info"><h5>{h.type === 'redeemed' ? `−${h.points} points used` : `+${h.points} points`}</h5><small>Order {h.orderNum} · {fmtDate(h.date)}</small></div></div>) : <Empty text="No point activity yet." />}
      <h3 style={{ margin: '26px 0 14px', fontSize: 17 }}>Your coupons</h3>
      {coupons.length === 0 ? <Empty text="No coupons available right now." /> : coupons.map(c => (
        <div key={c.code} className="coupon-card2">
          <span className="ic" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="tag" /></span>
          <div style={{ flex: 1 }}><div className="code">{c.code}</div><div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.desc}</div></div>
          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(c.code); toast('Coupon code copied', 'success', 'tag'); }}>Copy</button>
        </div>
      ))}
    </div>
  );
}

/* ---------- my reviews ---------- */
function ReviewsTab() {
  const go = useNavigate(); const [items, setItems] = useState(null); const [rctx, setRctx] = useState(null);
  const load = useCallback(() => api('/api/me/reviews').then(d => setItems(d.items)).catch(() => setItems([])), []);
  useEffect(() => { load(); }, [load]);
  if (items === null) return <p>Loading…</p>;
  return items.length === 0
    ? <Empty icon="star" title="No reviews yet" text="Reviews you leave on cakes you've received will show up here." action={<button className="btn btn-primary btn-sm" onClick={() => go('/account/orders')}>View my orders</button>} />
    : <div>{items.map(r => (
      <div key={r._id} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
        <CakeImage cake={r.cake || {}} style={{ width: 52, height: 52, borderRadius: 10, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><h5 style={{ fontSize: 13.5 }}>{r.cake?.name}</h5>
            <button className="btn btn-ghost btn-sm" onClick={() => setRctx({ order: r.order, item: { name: r.cake?.name, cake: r.cake?._id }, existing: r })}>Edit</button></div>
          <div className="review-stars" style={{ margin: '4px 0' }}><Stars rating={r.rating} /></div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{r.comment}</p>
        </div>
      </div>))}
      <ReviewModal ctx={rctx} onClose={() => setRctx(null)} onSaved={load} /></div>;
}

/* ---------- settings ---------- */
function SettingsTab() {
  const { user, setUser, logout } = useAuth(); const toast = useToast(); const navigate = useNavigate();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', email: user.email || '' }); const [err, setErr] = useState({});
  const [pw, setPw] = useState({ current: '', next: '' }); const [pwErr, setPwErr] = useState('');
  const noPassword = user.hasPassword === false;   // signed up with Google: no "current password" to ask for
  async function save() {
    setErr({});
    try { const d = await api('/api/me', { method: 'PUT', body: f }); setUser(d.user); toast('Profile updated', 'success'); }
    catch (e) { setErr({ [e.field || 'name']: e.message }); }
  }
  async function changePw() {
    setPwErr('');
    try { await api('/api/me/password', { method: 'PUT', body: pw }); setPw({ current: '', next: '' }); setUser({ ...user, hasPassword: true }); toast(noPassword ? 'Password set. You can now log in with it too' : 'Password changed', 'success'); }
    catch (e) { setPwErr(e.message); }
  }
  async function toggle(k) {
    const next = { ...user.notifPrefs, [k]: !user.notifPrefs[k] };
    setUser({ ...user, notifPrefs: next });
    try { await api('/api/me/notifications', { method: 'PUT', body: next }); } catch (e) { toast(e.message, 'error'); setUser(user); }
  }
  const field = (label, k, type = 'text') => <div className="form-field"><label>{label}</label><input type={type} value={f[k]} onChange={e => setF(s => ({ ...s, [k]: e.target.value }))} /><small className="field-error">{err[k]}</small></div>;
  const NOTIFS = [['orderUpdates', 'Order updates by email', 'Baking, packed, out for delivery and delivered emails (needs an email on your account)'], ['offers', 'Offers & promotions by email', 'Coupons and special deals'], ['newArrivals', 'New arrivals by email', 'When new cakes launch'], ['whatsapp', 'WhatsApp messages', 'Allow our team to message you about your order on WhatsApp']];
  return (
    <div>
      <div className="panel" style={{ padding: 26, marginBottom: 16 }}>
        <div className="form-row">{field('Full name', 'name')}{field('Phone', 'phone', 'tel')}</div>
        {field('Email', 'email', 'email')}
        <button className="btn btn-primary btn-sm" onClick={save}>Save Changes</button>
      </div>
      <div className="panel" style={{ padding: 26, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>{noPassword ? 'Set a password' : 'Change password'}</h3>{noPassword && <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>You signed in with Google. Add a password if you also want to log in with your email.</p>}
        <div className="form-row">
          {!noPassword && <div className="form-field"><label>Current password</label><input type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw(s => ({ ...s, current: e.target.value }))} /></div>}
          <div className="form-field"><label>New password</label><input type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw(s => ({ ...s, next: e.target.value }))} /></div>
        </div>
        <small className="field-error" style={{ display: 'block', marginBottom: 8 }}>{pwErr}</small>
        <button className="btn btn-outline btn-sm" onClick={changePw}>{noPassword ? 'Set password' : 'Update password'}</button>
      </div>
      <div className="panel" style={{ padding: '22px 26px', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Notification preferences</h3>
        {NOTIFS.map(([k, t, s]) => <div key={k} className="notif-row"><div><p>{t}</p><small>{s}</small></div><span className={`toggle-switch ${user.notifPrefs?.[k] ? 'on' : ''}`} onClick={() => toggle(k)}><span className="dot" /></span></div>)}
      </div>
      <button className="btn btn-outline btn-block" onClick={async () => { navigate('/'); await logout(); }}><Icon name="logout" size={14} /> Log Out</button>
    </div>
  );
}

const TABS = { orders: OrdersTab, addresses: AddressesTab, wishlist: WishlistTab, payments: PaymentsTab, rewards: RewardsTab, reviews: ReviewsTab, settings: SettingsTab };

export default function Account() {
  const { user, ready } = useAuth(); const { openLogin } = useUI(); const navigate = useNavigate(); const { tab } = useParams();
  useEffect(() => { if (ready && !user) openLogin(window.location.pathname); }, [ready, user, openLogin]);
  const go = t => navigate(`/account/${t}`);
  const Tab = TABS[tab];
  return (
    <section className="page active" data-page="profile">
      <div className="page-hero-banner profile-banner"><div className="container"><span className="eyebrow">Your Account</span><h1 className="h-section">{tab && TITLES[tab] ? TITLES[tab] : 'My Account'}</h1></div></div>
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          {!user ? <Empty icon="user" title="Please log in" text="Log in to see your orders, addresses and rewards." action={<button className="btn btn-primary btn-sm" onClick={() => openLogin('/account')}>Log in</button>} />
            : Tab ? (<div><button className="account-back-btn" onClick={() => navigate('/account')}><Icon name="arrow-left" /> Back to Account</button><Tab key={tab} /></div>)
            : <Hub go={go} />}
        </div>
      </section>
    </section>
  );
}
