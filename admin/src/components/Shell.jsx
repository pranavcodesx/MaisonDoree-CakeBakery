import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAlerts } from '../context/AlertsContext.jsx';
import { api, assetUrl } from '../lib/api.js';
import { useDebounced } from './ui.jsx';
import { fmt, timeAgo } from '../lib/format.js';

const NAV = [
  ['Overview', [['/', 'dashboard', 'Dashboard']]],
  ['Store', [['/orders', 'orders', 'Orders', 'pending'], ['/cakes', 'products', 'Cakes'], ['/categories', 'category', 'Categories'], ['/customers', 'customers', 'Customers'], ['/coupons', 'coupon', 'Coupons'], ['/reviews', 'reviews', 'Reviews']]],
  ['Operations', [['/delivery', 'delivery', 'Delivery'], ['/payments', 'payments', 'Payments'], ['/inbox', 'mail', 'Inbox', 'unreadMessages']]],
  ['Insights', [['/reports', 'reports', 'Reports'], ['/settings', 'settings', 'Settings'], ['/website', 'globe', 'Website Content']]],
];

export default function Shell() {
  const { user, logout } = useAuth(); const alerts = useAlerts(); const navigate = useNavigate(); const loc = useLocation();
  const [side, setSide] = useState(false); const [dd, setDd] = useState(null);
  const [q, setQ] = useState(''); const dq = useDebounced(q, 250); const [res, setRes] = useState(null);
  const wrap = useRef(null);

  useEffect(() => { setSide(false); setDd(null); }, [loc.pathname]);
  useEffect(() => { const h = e => { if (wrap.current && !wrap.current.contains(e.target)) setDd(null); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => {
    if (dq.trim().length < 2) { setRes(null); return; }
    api(`/search?q=${encodeURIComponent(dq.trim())}`).then(setRes).catch(() => setRes(null));
  }, [dq]);

  const go = (path) => { setDd(null); setQ(''); navigate(path); };
  const empty = res && !res.orders.length && !res.cakes.length && !res.customers.length;

  return (
    <div id="app" className="show">
      <div id="sidebarBackdrop" className={side ? 'show' : ''} onClick={() => setSide(false)} />
      <aside id="sidebar" className={side ? 'open' : ''}>
        <div className="sb-logo"><img src={`${import.meta.env.BASE_URL}images/logo-full-light.png`} alt="Maison Dorée" /><span>Admin Panel</span></div>
        <nav className="sb-nav">
          {NAV.map(([label, links]) => (
            <div key={label}>
              <div className="sb-group-label">{label}</div>
              {links.map(([to, icon, text, badge]) => (
                <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}>
                  <Icon name={icon} />{text}{badge && alerts[badge] > 0 && <span className="badge-count">{alerts[badge]}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-foot"><a className="btn btn-gold btn-sm btn-block" href={import.meta.env.VITE_STORE_URL || (import.meta.env.PROD ? '/' : 'http://localhost:5173')} target="_blank" rel="noreferrer"><Icon name="globe" size={14} /> View storefront</a></div>
      </aside>

      <div id="mainWrap">
        <header id="topbar" ref={wrap}>
          <button className="hamburger-btn" onClick={() => setSide(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="topbar-search" onFocus={() => setDd('search')}>
            <Icon name="search" />
            <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search orders, cakes, customers..." autoComplete="off" aria-label="Search" />
            <div className={`dropdown-panel ${dd === 'search' && res ? 'show' : ''}`}>
              {empty && <div className="dd-section-label">No results</div>}
              {res?.orders.length > 0 && <><div className="dd-section-label">Orders</div>{res.orders.map(o => <div key={o.orderNum} className="dd-result" onClick={() => go(`/orders?q=${o.orderNum}`)}><Icon name="orders" size={16} /><div><b>{o.orderNum}</b> · {o.customer?.name}<div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{o.status} · {fmt(o.totals.total)}</div></div></div>)}</>}
              {res?.cakes.length > 0 && <><div className="dd-section-label">Cakes</div>{res.cakes.map(c => <div key={c._id} className="dd-result" onClick={() => go(`/cakes?q=${encodeURIComponent(c.name)}`)}>{c.images?.[0] ? <img src={assetUrl(c.images[0])} alt="" /> : <Icon name="products" size={16} />}<div><b>{c.name}</b><div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{c.category} · {fmt(c.price)}{c.active ? '' : ' · archived'}</div></div></div>)}</>}
              {res?.customers.length > 0 && <><div className="dd-section-label">Customers</div>{res.customers.map(c => <div key={c._id} className="dd-result" onClick={() => go(`/customers?q=${encodeURIComponent(c.name)}`)}><Icon name="customers" size={16} /><div><b>{c.name}</b><div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{c.email || c.phone}</div></div></div>)}</>}
            </div>
          </div>
          <div className="topbar-actions">
            <div style={{ position: 'relative' }}>
              <button className="btn-icon notif-btn" onClick={() => setDd(dd === 'notif' ? null : 'notif')} aria-label="Notifications"><Icon name="bell" />{(alerts.pending > 0 || alerts.unreadMessages > 0) && <span className="notif-dot" />}</button>
              <div className={`dropdown-panel right ${dd === 'notif' ? 'show' : ''}`}>
                <div className="dd-section-label">Needs attention</div>
                <div className="dd-result" onClick={() => go('/orders?status=Order Placed')}><Icon name="clock" size={16} /><div><b>{alerts.pending}</b> order{alerts.pending === 1 ? '' : 's'} waiting for confirmation</div></div>
                <div className="dd-result" onClick={() => go('/inbox')}><Icon name="mail" size={16} /><div><b>{alerts.unreadMessages}</b> unread message{alerts.unreadMessages === 1 ? '' : 's'}</div></div>
                {alerts.recent.length > 0 && <div className="dd-section-label">Latest orders</div>}
                {alerts.recent.map(o => <div key={o.orderNum} className="dd-result" onClick={() => go(`/orders?q=${o.orderNum}`)}><Icon name="orders" size={16} /><div><b>{o.orderNum}</b> · {o.customer?.name}<div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{fmt(o.totals.total)} · {timeAgo(o.createdAt)}</div></div></div>)}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <div className="topbar-profile" onClick={() => setDd(dd === 'profile' ? null : 'profile')} role="button" tabIndex={0}>
                <div className="tp-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div><div className="tp-name">{user.name}</div><div className="tp-role">Shop owner</div></div>
              </div>
              <div className={`dropdown-panel right ${dd === 'profile' ? 'show' : ''}`} style={{ width: 210 }}>
                <button className="dd-item" onClick={() => go('/settings')}><Icon name="settings" size={15} /> Account settings</button>
                <button className="dd-item" onClick={logout}><Icon name="logout" size={15} /> Log out</button>
              </div>
            </div>
          </div>
        </header>
        <main className="page-content"><section className="admin-page active"><Outlet /></section></main>
      </div>
    </div>
  );
}
