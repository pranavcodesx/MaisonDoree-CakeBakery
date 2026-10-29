import { useState } from 'react';
import Icon from './Icon.jsx';
import GoogleButton from './GoogleButton.jsx';
import ForgotPasswordForm from './ForgotPasswordForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function Field({ label, error, children }) {
  return <div className="form-field"><label>{label}</label>{children}<small className="field-error" role="alert">{error}</small></div>;
}

export default function LoginModal() {
  const { login, signup, googleLogin } = useAuth(); const { loginOpen, setLoginOpen, afterLogin } = useUI(); const toast = useToast();
  const [tab, setTab] = useState('login');
  const [f, setF] = useState({ name: '', identifier: '', password: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = k => e => { setF(s => ({ ...s, [k]: e.target.value })); setErr(x => ({ ...x, [k]: '', form: '' })); };

  async function submit(e) {
    e.preventDefault();
    const errors = {};
    if (tab === 'signup' && f.name.trim().length < 2) errors.name = 'Please enter your full name.';
    if (!f.identifier.trim()) errors.identifier = 'Please enter your email or phone number.';
    if (!f.password) errors.password = tab === 'signup' ? 'Please create a password.' : 'Please enter your password.';
    if (Object.keys(errors).length) { setErr(errors); return; }
    setBusy(true);
    try {
      const u = tab === 'login' ? await login(f.identifier, f.password) : await signup(f.name, f.identifier, f.password);
      toast(tab === 'login' ? `Welcome back, ${u.name.split(' ')[0]}!` : `Welcome to Maison Dorée, ${u.name.split(' ')[0]}!`, 'success');
      setF({ name: '', identifier: '', password: '' });
      afterLogin();
    } catch (ex) { setErr({ [ex.field || 'form']: ex.message }); }
    setBusy(false);
  }

  async function withGoogle(credential) {
    setBusy(true); setErr({});
    try { const u = await googleLogin(credential); toast(`Welcome, ${u.name.split(' ')[0]}!`, 'success'); afterLogin(); }
    catch (ex) { setErr({ form: ex.message }); }
    setBusy(false);
  }

  return (
    <div className={`modal-overlay ${loginOpen ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setLoginOpen(false)}>
      <form className="modal-box" style={{ width: 'min(420px,92vw)', padding: '38px 32px 32px' }} onSubmit={submit} noValidate>
        <button type="button" className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Close account dialog"><Icon name="x" /></button>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Welcome to Maison Dorée</span>
          <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 22, marginTop: 8 }}>{tab === 'forgot' ? 'Forgot your password?' : tab === 'login' ? 'Log in to your account' : 'Create your account'}</h3>
        </div>
        {tab === 'forgot' ? <ForgotPasswordForm onBack={() => { setTab('login'); setErr({}); }} /> : (<>
        <div className="pd-tabs" style={{ justifyContent: 'center', borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
          <button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setErr({}); }}>Log In</button>
          <button type="button" className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); setErr({}); }}>Sign Up</button>
        </div>
        {tab === 'signup' && <Field label="Full name" error={err.name}><input type="text" value={f.name} onChange={set('name')} placeholder="Your name" autoComplete="name" /></Field>}
        <Field label="Email or phone" error={err.identifier}><input type="text" value={f.identifier} onChange={set('identifier')} placeholder="you@email.com or 98765 43210" autoComplete="username" /></Field>
        <Field label="Password" error={err.password}>
          <div className="password-field">
            <input type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} placeholder={tab === 'signup' ? 'At least 8 characters' : '••••••••'} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} />
            <button className="password-toggle" type="button" onClick={() => setShow(s => !s)} aria-label="Show password"><Icon name="eye" /></button>
          </div>
        </Field>
        {tab === 'login' && <p style={{ textAlign: 'right', margin: '-6px 0 14px' }}><button type="button" onClick={() => { setTab('forgot'); setErr({}); }} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--accent-ink)' }}>Forgot password?</button></p>}
        {err.form && <p className="field-error" style={{ display: 'block', marginBottom: 12 }} role="alert">{err.form}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Please wait…' : tab === 'login' ? 'Log In' : 'Create Account'}</button>
        {loginOpen && <GoogleButton onCredential={withGoogle} />}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)', marginTop: 16 }}>
          {tab === 'login' ? 'New here? Switch to Sign Up to create an account.' : 'Use the same email or phone to log in next time.'}
        </p>
        </>)}
      </form>
    </div>
  );
}
