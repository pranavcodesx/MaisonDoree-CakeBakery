import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const img = name => `${import.meta.env.BASE_URL}images/${name}`;
const FEATURES = [['orders', 'Order Management', 'Track & update orders in real-time'], ['reports', 'Analytics', 'Smart insights & reports'], ['shield', 'Secure Access', 'Your data is safe with us']];
const Pill = ({ className = '' }) => <span className={`secure-pill ${className}`}><Icon name="shield" size={12} /> Secure Admin Portal <span className="online-dot" /></span>;

// The original admin sign-in design. (There is no "Register" tab on purpose: admins are created with `npm run create-admin`.)
export default function Login() {
  const { login } = useAuth();
  const [f, setF] = useState({ email: '', password: '' }); const [show, setShow] = useState(false);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!f.email.trim() || !f.password) { setErr('Enter your email and password.'); return; }
    setBusy(true);
    try { await login(f.email.trim(), f.password); } catch (ex) { setErr(ex.message); }
    setBusy(false);
  }
  return (
    <div id="loginScreen">
      <div className="login-shell">
        <div className="login-mobile-top">
          <div className="login-logo"><div className="login-logo-row"><img src={img('logo-icon.png')} alt="" style={{ width: 22, height: 'auto' }} /><b>Maison Dorée</b></div><span>— Admin —</span></div>
          <Pill />
        </div>
        <div className="login-mobile-banner">
          <img src={img('login-cake.jpg')} alt="Chocolate drip cake at Maison Dorée bakery" />
          <svg className="wave-divider" viewBox="0 0 500 44" preserveAspectRatio="none"><path d="M0,22 C130,48 370,-6 500,22 L500,44 L0,44 Z" fill="var(--surface)" /></svg>
        </div>
        <div className="login-mobile-features">
          {FEATURES.map(([ic, t, s]) => <div key={t}><span className="lf-ic"><Icon name={ic} /></span><b>{t}</b><small>{s}</small></div>)}
        </div>

        <div className="login-brand-panel">
          <img className="lbp-photo" src={img('login-cake.jpg')} alt="Chocolate drip cake at Maison Dorée bakery" />
          <div className="lbp-scrim" />
          <div className="lbp-content">
            <div className="login-logo"><img src={img('logo-full-dark.png')} alt="Maison Dorée" style={{ width: 220, height: 'auto' }} /></div>
            <h2>Manage your<br /><em>Bakery,</em><br />Effortlessly.</h2>
            <p>A smart &amp; powerful dashboard to<br />manage orders, customers, and more<br />— all in one place.</p>
            <div className="lbp-features">
              {FEATURES.map(([ic, t, s]) => <div key={t}><span className="lf-ic"><Icon name={ic} /></span><b>{t}</b><small>{s}</small></div>)}
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <Pill className="desktop-only-pill" />
          <form className="login-card" onSubmit={submit} noValidate>
            <p className="login-sub">Welcome Back 👋</p>
            <h3 className="login-title">Log in to your account</h3>
            <p className="login-desc">Log in to continue to Maison Dorée Admin</p>

            <div className="field icon-field"><label htmlFor="adminEmail">Email</label><span className="fi-ic"><Icon name="mail" /></span>
              <input id="adminEmail" type="email" autoComplete="username" placeholder="you@maisondoree.com" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
            <div className="field icon-field"><label htmlFor="adminPassword">Password</label><span className="fi-ic"><Icon name="lock" /></span>
              <input id="adminPassword" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
              <button type="button" className="fi-toggle" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eye-off' : 'eye'} /></button></div>
            {err && <p className="field-error show" role="alert">{err}</p>}
            <button className="btn btn-primary btn-block btn-arrow" type="submit" disabled={busy}><span>{busy ? 'Signing in…' : 'Log In'}</span><Icon name="arrow-right" size={15} /></button>
            <p className="switch-line" style={{ marginTop: 22 }}>Need a new admin or lost your password? Run <code>npm run create-admin</code> on the server.</p>
          </form>
          <svg className="lfp-leaves" viewBox="0 0 200 300" fill="none" stroke="#C79A4B" strokeWidth="1.2" opacity=".35"><path d="M180 10C150 60 160 120 130 160S90 220 60 290" /><path d="M150 60c-10-12-30-14-38-2M140 100c-12-8-32-6-38 6M120 145c-12-6-30 0-34 12M95 200c-12-2-26 8-28 20" /></svg>
        </div>
      </div>
    </div>
  );
}
