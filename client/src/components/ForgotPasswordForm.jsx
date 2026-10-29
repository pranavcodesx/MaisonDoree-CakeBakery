import { useState } from 'react';
import { api } from '../lib/api.js';

// Asks for the account's email and requests a reset link. Not a <form>, so it can sit inside the login box.
export default function ForgotPasswordForm({ onBack, backLabel = 'Back to log in' }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState('');

  async function send() {
    if (busy) return;
    if (!email.trim()) { setErr('Please enter your account email.'); return; }
    setBusy(true); setErr('');
    try { const d = await api('/api/auth/forgot-password', { method: 'POST', body: { email } }); setSent(d.message); }
    catch (ex) { setErr(ex.message); }
    setBusy(false);
  }
  const onKey = e => { if (e.key === 'Enter') { e.preventDefault(); send(); } };

  if (sent) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-soft)', margin: '4px 0 18px' }}>{sent}</p>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 18 }}>Can't see it? Check your spam folder, or try again in a minute.</p>
        {onBack && <button type="button" className="btn btn-primary btn-block" onClick={onBack}>{backLabel}</button>}
      </div>
    );
  }
  return (
    <div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-soft)', margin: '0 0 16px', textAlign: 'center' }}>Enter the email you signed up with and we'll send you a link to choose a new password.</p>
      <div className="form-field">
        <label>Email</label>
        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} onKeyDown={onKey} placeholder="you@email.com" autoComplete="email" />
        <small className="field-error" role="alert">{err}</small>
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={send} disabled={busy}>{busy ? 'Please wait…' : 'Send Reset Link'}</button>
      {onBack && <p style={{ textAlign: 'center', marginTop: 16 }}><button type="button" onClick={onBack} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--accent-ink)' }}>{backLabel}</button></p>}
    </div>
  );
}
