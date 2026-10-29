import { useState } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function NewsletterForm({ className = 'newsletter-row', style, placeholder = 'you@email.com', button = 'Subscribe', btnClass = 'btn btn-primary btn-sm', inputStyle }) {
  const toast = useToast(); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { await api('/api/newsletter', { method: 'POST', body: { email } }); toast("You're on the list — thank you!", 'success', 'mail'); setEmail(''); }
    catch (err) { toast(err.message, 'error'); }
    setBusy(false);
  }
  return (
    <form className={className} style={style} onSubmit={submit}>
      <input type="email" required placeholder={placeholder} value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
      <button className={btnClass} type="submit" disabled={busy}>{button}</button>
    </form>
  );
}
