import { useEffect, useState } from 'react';
import { Field, ErrorBox, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { TOPPER_LABEL } from '../lib/constants.js';

function Section({ title, sub, children, onSave, busy, error }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head"><div><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div></div>
      {children}
      {error && <span className="field-error show" role="alert" style={{ marginBottom: 10 }}>{error}</span>}
      <button className="btn btn-primary btn-sm" onClick={onSave} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}

export default function Settings() {
  const toast = useToast(); const { user, setUser } = useAuth();
  const { data, error, reload } = useLoad(() => api('/settings'), []);
  const [s, setS] = useState(null); const [busy, setBusy] = useState(''); const [err, setErr] = useState({});
  const [me, setMe] = useState({ name: user.name }); const [pw, setPw] = useState({ current: '', next: '' });
  useEffect(() => { if (data) setS(JSON.parse(JSON.stringify(data.settings))); }, [data]);
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!s) return <Loading />;

  async function save(key, body, msg) {
    setBusy(key); setErr({});
    try { await api('/settings', { method: 'PUT', body }); toast(msg, 'success'); reload(); } catch (e) { setErr({ [key]: e.message }); }
    setBusy('');
  }
  const num = v => (v === '' ? 0 : Number(v));
  const store = k => ({ value: s.store[k], onChange: e => setS({ ...s, store: { ...s.store, [k]: e.target.value } }) });
  const setB = (g, k, v) => setS({ ...s, builder: { ...s.builder, [g]: { ...s.builder[g], [k]: v } } });

  return (
    <>
      <PageHead title="Settings" sub="Changes here show on your website straight away." />
      <Section title="Shop details" sub="Shown on your Contact page and in the About page numbers." busy={busy === 'store'} error={err.store}
        onSave={() => save('store', { store: { name: s.store.name, phone: s.store.phone, email: s.store.email, address: s.store.address, hours: s.store.hours, foundedYear: s.store.foundedYear === '' || s.store.foundedYear == null ? null : Number(s.store.foundedYear), citiesServed: num(s.store.citiesServed) } }, 'Shop details saved')}>
        <div className="form-row2"><Field label="Shop name"><input {...store('name')} maxLength={60} /></Field><Field label="Phone"><input {...store('phone')} maxLength={30} placeholder="+91 98765 43210" /></Field></div>
        <div className="form-row2"><Field label="Email"><input type="email" {...store('email')} placeholder="hello@yourbakery.com" /></Field><Field label="Opening hours"><input {...store('hours')} maxLength={80} /></Field></div>
        <Field label="Address"><textarea rows={2} value={s.store.address} maxLength={200} onChange={e => setS({ ...s, store: { ...s.store, address: e.target.value } })} /></Field>
        <div className="form-row2"><Field label="Year you started" hint="Leave empty to hide “years baking” on the website."><input type="number" {...store('foundedYear')} value={s.store.foundedYear ?? ''} placeholder="e.g. 2018" /></Field><Field label="Cities you serve" hint="Leave 0 to hide it."><input type="number" min="0" {...store('citiesServed')} /></Field></div>
      </Section>

      <Section title="Tax" sub="Added on top of every order's subtotal." busy={busy === 'tax'} error={err.tax} onSave={() => save('tax', { tax: { rate: num(s.tax.rate) } }, 'Tax rate saved')}>
        <Field label="Tax rate (%)"><input type="number" min="0" max="40" step="0.5" value={s.tax.rate} onChange={e => setS({ ...s, tax: { rate: e.target.value } })} style={{ maxWidth: 160 }} /></Field>
      </Section>

      <Section title="Reward points" sub="Customers earn points when an order is delivered and spend them as a discount at checkout." busy={busy === 'rewards'} error={err.rewards}
        onSave={() => save('rewards', { rewards: { earnPer100: num(s.rewards.earnPer100), pointValue: num(s.rewards.pointValue), minRedeem: num(s.rewards.minRedeem), maxPct: num(s.rewards.maxPct), silverFrom: num(s.rewards.silverFrom), goldFrom: num(s.rewards.goldFrom) } }, 'Reward settings saved')}>
        {(() => { const R = s.rewards; const setR = (k, v) => setS({ ...s, rewards: { ...s.rewards, [k]: v } });
          const back = Number(R.earnPer100) * Number(R.pointValue);
          return (<>
            <div className="form-row2">
              <Field label="Points earned per ₹100 spent"><input type="number" min="0" max="100" value={R.earnPer100} onChange={e => setR('earnPer100', e.target.value)} /></Field>
              <Field label="Value of 1 point (₹)" hint={`Today a customer gets about ${back.toFixed(1)}% of their spend back as points.`}><input type="number" min="0.1" step="0.1" value={R.pointValue} onChange={e => setR('pointValue', e.target.value)} /></Field>
            </div>
            <div className="form-row2">
              <Field label="Minimum points to use"><input type="number" min="0" value={R.minRedeem} onChange={e => setR('minRedeem', e.target.value)} /></Field>
              <Field label="Most of an order points can pay (%)" hint="Protects your margin: points can never cover more than this."><input type="number" min="1" max="100" value={R.maxPct} onChange={e => setR('maxPct', e.target.value)} /></Field>
            </div>
            <div className="form-row2">
              <Field label="Silver member from (₹ spent)"><input type="number" min="0" value={R.silverFrom} onChange={e => setR('silverFrom', e.target.value)} /></Field>
              <Field label="Gold member from (₹ spent)" hint="Counted on delivered orders."><input type="number" min="0" value={R.goldFrom} onChange={e => setR('goldFrom', e.target.value)} /></Field>
            </div>
          </>); })()}
      </Section>

      <Section title="Custom cake prices" sub="Used by the “Build your cake” page. Price = tiers + topper + cream." busy={busy === 'builder'} error={err.builder}
        onSave={() => save('builder', { builder: { base: Object.fromEntries(Object.entries(s.builder.base).map(([k, v]) => [k, num(v)])), topper: Object.fromEntries(Object.entries(s.builder.topper).map(([k, v]) => [k, num(v)])), cream: Object.fromEntries(Object.entries(s.builder.cream).map(([k, v]) => [k, num(v)])) } }, 'Custom cake prices saved')}>
        <h4 style={{ fontSize: 12, marginBottom: 8 }}>Base price by tiers (₹)</h4>
        <div className="form-row2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{['1', '2', '3'].map(k => <Field key={k} label={`${k} tier`}><input type="number" min="0" value={s.builder.base[k]} onChange={e => setB('base', k, e.target.value)} /></Field>)}</div>
        <h4 style={{ fontSize: 12, margin: '4px 0 8px' }}>Extra for topper (₹)</h4>
        <div className="form-row2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{Object.keys(s.builder.topper).map(k => <Field key={k} label={TOPPER_LABEL[k] || k}><input type="number" min="0" value={s.builder.topper[k]} onChange={e => setB('topper', k, e.target.value)} /></Field>)}</div>
        <h4 style={{ fontSize: 12, margin: '4px 0 8px' }}>Extra for cream (₹)</h4>
        <div className="form-row2" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>{Object.keys(s.builder.cream).map(k => <Field key={k} label={k}><input type="number" min="0" value={s.builder.cream[k]} onChange={e => setB('cream', k, e.target.value)} /></Field>)}</div>
      </Section>

      <Section title="Your account" sub="You are signed in as the shop owner." busy={busy === 'me'} error={err.me}
        onSave={async () => { setBusy('me'); setErr({}); try { const d = await api('/auth/profile', { method: 'PUT', body: { name: me.name } }); setUser(d.user); toast('Name updated', 'success'); } catch (e) { setErr({ me: e.message }); } setBusy(''); }}>
        <Field label="Your name"><input value={me.name} onChange={e => setMe({ name: e.target.value })} style={{ maxWidth: 320 }} /></Field>
        <p className="field-hint" style={{ marginBottom: 10 }}>Login email: {user.email}</p>
      </Section>
      <Section title="Change password" busy={busy === 'pw'} error={err.pw}
        onSave={async () => { setBusy('pw'); setErr({}); try { await api('/auth/password', { method: 'PUT', body: pw }); setPw({ current: '', next: '' }); toast('Password changed', 'success'); } catch (e) { setErr({ pw: e.message }); } setBusy(''); }}>
        <div className="form-row2"><Field label="Current password"><input type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} /></Field><Field label="New password" hint="At least 8 characters."><input type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} /></Field></div>
      </Section>
    </>
  );
}
