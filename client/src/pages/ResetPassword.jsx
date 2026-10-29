import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ForgotPasswordForm from '../components/ForgotPasswordForm.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// The page the reset email links to:  /reset-password?token=...
export default function ResetPassword() {
  const [params] = useSearchParams(); const token = params.get('token') || '';
  const { setUser } = useAuth(); const toast = useToast(); const navigate = useNavigate();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [dead, setDead] = useState(token.length !== 64);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) { setErr('Use at least 8 characters for a stronger password.'); return; }
    if (pw !== pw2) { setErr('The two passwords do not match.'); return; }
    setBusy(true); setErr('');
    try {
      const d = await api('/api/auth/reset-password', { method: 'POST', body: { token, password: pw } });
      setUser(d.user); toast('Password updated. Welcome back!', 'success'); navigate('/account', { replace: true });
    } catch (ex) { if (ex.field === 'token' || ex.status === 400 && /link/i.test(ex.message)) setDead(true); else setErr(ex.message); }
    setBusy(false);
  }

  return (
    <section className="page active" data-page="reset-password">
      <div className="page-hero-banner">
        <div className="container">
          <span className="eyebrow">Account</span>
          <h1 className="h-section">{dead ? 'Link expired' : 'Choose a new password'}</h1>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container" style={{ maxWidth: 440 }}>
          {dead ? (
            <div>
              <p className="lede" style={{ textAlign: 'center', marginBottom: 22 }}>This reset link has expired or was already used. Request a fresh one below.</p>
              <ForgotPasswordForm />
              <p style={{ textAlign: 'center', marginTop: 18 }}><Link to="/" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-ink)' }}>Back to Home</Link></p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="form-field">
                <label>New password</label>
                <div className="password-field">
                  <input type={show ? 'text' : 'password'} value={pw} onChange={e => { setPw(e.target.value); setErr(''); }} placeholder="At least 8 characters" autoComplete="new-password" />
                  <button className="password-toggle" type="button" onClick={() => setShow(s => !s)} aria-label="Show password"><Icon name="eye" /></button>
                </div>
              </div>
              <div className="form-field">
                <label>Confirm new password</label>
                <input type={show ? 'text' : 'password'} value={pw2} onChange={e => { setPw2(e.target.value); setErr(''); }} placeholder="Type it again" autoComplete="new-password" />
                <small className="field-error" role="alert">{err}</small>
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Update Password'}</button>
            </form>
          )}
        </div>
      </section>
    </section>
  );
}
