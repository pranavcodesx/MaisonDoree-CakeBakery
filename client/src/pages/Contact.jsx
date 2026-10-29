import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Contact() {
  const toast = useToast(); const { store: SITE, content } = useSettings(); const FAQS = content.faqs;
  const [f, setF] = useState({ name: '', phone: '', email: '', subject: 'General enquiry', message: '' });
  const [busy, setBusy] = useState(false); const [open, setOpen] = useState(0);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { await api('/api/contact', { method: 'POST', body: f }); toast("Message sent — we'll get back to you soon", 'success', 'mail'); setF({ name: '', phone: '', email: '', subject: 'General enquiry', message: '' }); }
    catch (err) { toast(err.message, 'error'); }
    setBusy(false);
  }
  return (
<section className="page active" data-page="contact">
  <div className="page-hero-banner">
    <div className="container">
      <span className="eyebrow">We'd Love To Hear From You</span>
      <h1 className="h-section">Get In Touch</h1>
    </div>
  </div>
  <section className="section" style={{paddingTop: "40px"}}>
    <div className="container contact-layout">
      <div className="reveal">
        <div className="contact-info-card">
          <span className="ic"><svg className="icon"><use href="#ic-phone"/></svg></span>
          <div><h5>Call us</h5><p>{SITE.phone || '—'}</p></div>
        </div>
        <div className="contact-info-card">
          <span className="ic"><svg className="icon"><use href="#ic-mail"/></svg></span>
          <div><h5>Email us</h5><p>{SITE.email || '—'}</p></div>
        </div>
        <div className="contact-info-card">
          <span className="ic" style={{background: "var(--sage-100)", color: "var(--sage)"}}><svg className="icon"><use href="#ic-message"/></svg></span>
          <div><h5>WhatsApp</h5><p>Chat with our order support team</p></div>
        </div>
        <div className="contact-info-card">
          <span className="ic"><svg className="icon"><use href="#ic-pin"/></svg></span>
          <div><h5>Visit our flagship store</h5><p>{SITE.address || '—'}</p></div>
        </div>
        <div className="contact-info-card" style={{borderBottom: "none"}}>
          <span className="ic"><svg className="icon"><use href="#ic-clock"/></svg></span>
          <div><h5>Working hours</h5><p>{SITE.hours || '—'}</p></div>
        </div>
        <div className="map-placeholder" style={{marginTop: "6px"}}>
          <svg className="pin"><use href="#ic-pin"/></svg>
          <small>Google Maps — flagship store location</small>
        </div>
      </div>
      <div className="reveal">
        <form className="contact-form" onSubmit={submit}>
          <h3 style={{fontSize: "18px", marginBottom: "18px"}}>Send us a message</h3>
          <div className="form-row">
            <div className="form-field"><label>Name</label><input type="text" required placeholder="Your name" value={f.name} onChange={set('name')} /></div>
            <div className="form-field"><label>Phone</label><input type="tel" placeholder="Optional" value={f.phone} onChange={set('phone')} /></div>
          </div>
          <div className="form-field"><label>Email</label><input type="email" required placeholder="you@email.com" value={f.email} onChange={set('email')} /></div>
          <div className="form-field"><label>Subject</label>
            <select value={f.subject} onChange={set('subject')}>{['General enquiry','Order issue','Custom cake request','Corporate orders','Feedback'].map(o => <option key={o}>{o}</option>)}</select>
          </div>
          <div className="form-field"><label>Message</label><textarea required minLength={5} placeholder="How can we help?" value={f.message} onChange={set('message')}></textarea></div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send Message'}</button>
        </form>
      </div>
    </div>
  </section>
  <section className="section" style={{background: "var(--bg-alt)"}}>
    <div className="container" style={{maxWidth: "820px"}}>
      <div className="section-head center reveal">
        <span className="eyebrow">Questions</span>
        <h2 className="h-section">Frequently asked</h2>
      </div>
      <div className="reveal">{FAQS.map((q, i) => <div key={q.q} className={`faq-item ${open === i ? 'open' : ''}`}><div className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>{q.q}<Icon name="chev-down" /></div><div className="faq-a"><p>{q.a}</p></div></div>)}</div>
    </div>
  </section>
</section>

  );
}
