import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Badge, Field, Pagination, Empty, ErrorBox, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { useAlerts } from '../context/AlertsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, downloadFile } from '../lib/api.js';
import { fmtDateTime, fmtDate } from '../lib/format.js';

function Messages() {
  const toast = useToast(); const { refresh } = useAlerts();
  const [handled, setHandled] = useState('false'); const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(() => api(`/messages?${new URLSearchParams({ ...(handled && { handled }), page })}`), [handled, page]);
  const act = async (fn, msg) => { try { await fn(); toast(msg, 'success'); reload(); refresh(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div className="card">
      <div className="tab-strip">{[['false', `To answer (${data?.open ?? '…'})`], ['true', 'Answered'], ['', 'All']].map(([k, l]) => <button key={k} className={handled === k ? 'active' : ''} onClick={() => { setHandled(k); setPage(1); }}>{l}</button>)}</div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="mail" title={handled === 'false' ? 'Inbox zero 🎉' : 'No messages'} text="Messages from the Contact page of your website arrive here." /> : data.items.map(m => (
        <div key={m._id} className="list-row" style={{ alignItems: 'flex-start', padding: '16px 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lr-name">{m.name} {m.subject && <Badge tone="blue">{m.subject}</Badge>} {m.handled && <Badge tone="sage">Answered</Badge>}</div>
            <p style={{ fontSize: 13, margin: '6px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</p>
            <div className="lr-sub"><a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message to us'))}`} style={{ textDecoration: 'underline' }}>{m.email}</a>{m.phone && <> · <a href={`tel:${m.phone}`}>{m.phone}</a></>} · {fmtDateTime(m.createdAt)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <a className="btn btn-outline btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message to us'))}`}><Icon name="mail" size={14} /> Reply</a>
            <button className="btn btn-ghost btn-sm" onClick={() => act(() => api(`/messages/${m._id}`, { method: 'PATCH', body: { handled: !m.handled } }), m.handled ? 'Moved back to “To answer”' : 'Marked as answered')}>{m.handled ? 'Reopen' : 'Mark answered'}</button>
            <button className="btn-icon" aria-label="Delete message" onClick={() => window.confirm('Delete this message?') && act(() => api(`/messages/${m._id}`, { method: 'DELETE' }), 'Message deleted')}><Icon name="trash" size={15} /></button>
          </div>
        </div>
      ))}
      {data && <Pagination page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}

function Announce() {
  const toast = useToast();
  const { data } = useLoad(() => api('/announcements/audience'), []);
  const [audience, setAudience] = useState('offers'); const [subject, setSubject] = useState(''); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const count = data ? data[audience] : null;
  async function send() {
    setErr('');
    if (subject.trim().length < 3) { setErr('Write a subject.'); return; }
    if (message.trim().length < 10) { setErr('Write a message (at least a sentence).'); return; }
    if (!window.confirm(`Send this email to ${count} ${count === 1 ? 'person' : 'people'}?`)) return;
    setBusy(true);
    try {
      const d = await api('/announcements', { method: 'POST', body: { audience, subject: subject.trim(), message: message.trim() } });
      toast(`Sent to ${d.sent} of ${d.total}${d.failed ? ` (${d.failed} failed)` : ''}`, d.failed ? 'info' : 'success');
      if (!d.failed) { setSubject(''); setMessage(''); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className="card">
      <div className="card-head"><div><h3>Email your customers</h3><div className="sub">Offers and new cakes, sent only to people who chose to receive them in their account settings (offers also go to newsletter subscribers).</div></div></div>
      {data && !data.emailReady && <p className="field-hint" style={{ marginBottom: 12, color: 'var(--terracotta)' }}>Email is not set up yet, so nothing can be sent. Add the SMTP settings from the README (Forgot password section) and restart the server.</p>}
      <div className="segmented" style={{ maxWidth: 420, marginBottom: 14 }}>{[['offers', 'Offers & news'], ['newArrivals', 'New arrivals']].map(([k, l]) => <button key={k} className={`segmented-btn ${audience === k ? 'active' : ''}`} onClick={() => setAudience(k)}>{l}</button>)}</div>
      <p className="field-hint" style={{ marginBottom: 12 }}>{count == null ? '…' : `${count} ${count === 1 ? 'person' : 'people'} will get this.`}</p>
      <Field label="Subject"><input value={subject} maxLength={120} onChange={e => setSubject(e.target.value)} placeholder="e.g. Diwali special: 15% off all box cakes" /></Field>
      <Field label="Message"><textarea rows={7} value={message} maxLength={3000} onChange={e => setMessage(e.target.value)} placeholder="Write like you talk to a customer. Leave an empty line between paragraphs." /></Field>
      {err && <span className="field-error show" role="alert" style={{ marginBottom: 10 }}>{err}</span>}
      <button className="btn btn-primary btn-sm" onClick={send} disabled={busy || count === 0}>{busy ? 'Sending…' : 'Send email'}</button>
    </div>
  );
}

function Subscribers() {
  const toast = useToast(); const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(() => api(`/subscribers?page=${page}`), [page]);
  return (
    <div className="card">
      <div className="card-head"><div><h3>Newsletter subscribers</h3><div className="sub">{data ? `${data.total} people joined from your website` : ''}</div></div>
        <button className="btn btn-outline btn-sm" onClick={() => downloadFile('/reports/subscribers.csv', 'newsletter_subscribers.csv').catch(e => toast(e.message, 'error'))}><Icon name="download" size={14} /> Export CSV</button></div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="mail" title="No subscribers yet" text="Emails from the “Stay Sweet” box on your website appear here." /> : (
        <div className="table-wrap"><table><thead><tr><th>Email</th><th>Joined</th><th /></tr></thead><tbody>
          {data.items.map(s => <tr key={s._id}><td>{s.email}</td><td>{fmtDate(s.createdAt)}</td><td><button className="btn-icon" aria-label={`Remove ${s.email}`} onClick={async () => { if (!window.confirm(`Remove ${s.email}?`)) return; try { await api(`/subscribers/${s._id}`, { method: 'DELETE' }); toast('Removed', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } }}><Icon name="trash" size={15} /></button></td></tr>)}
        </tbody></table></div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}

export default function Inbox() {
  const [tab, setTab] = useState('messages');
  return (
    <>
      <PageHead title="Inbox" sub="Messages from your Contact page and sign-ups from your newsletter box." />
      <div className="segmented" style={{ maxWidth: 480, marginBottom: 18 }}>{[['messages', 'Messages'], ['subscribers', 'Newsletter'], ['announce', 'Send offers']].map(([k, l]) => <button key={k} className={`segmented-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'messages' ? <Messages /> : tab === 'announce' ? <Announce /> : <Subscribers />}
    </>
  );
}
