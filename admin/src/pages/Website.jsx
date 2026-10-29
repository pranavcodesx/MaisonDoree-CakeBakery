import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import { Field, ErrorBox, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

const ICONS = [['leaf', 'Leaf (ingredients)'], ['truck', 'Truck (delivery)'], ['chef', 'Chef hat'], ['shield', 'Shield (promise)'], ['star', 'Star'], ['heart', 'Heart'], ['gift', 'Gift'], ['sparkle', 'Sparkle']];

const Block = ({ title, sub, action, children }) => (
  <div className="card" style={{ marginBottom: 20 }}>
    <div className="card-head"><div><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div>{action}</div>
    {children}
  </div>
);

export default function Website() {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api('/settings'), []);
  const [c, setC] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { if (data) setC(JSON.parse(JSON.stringify(data.settings.content))); }, [data]);
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!c) return <Loading />;

  const setAbout = patch => setC({ ...c, about: { ...c.about, ...patch } });
  const upd = (key, i, patch) => setC({ ...c, [key]: c[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const updAbout = (key, i, patch) => setAbout({ [key]: c.about[key].map((x, j) => (j === i ? (typeof x === 'string' ? patch : { ...x, ...patch }) : x)) });
  const lines = (key, sub) => ({ value: (sub ? c[sub][key] : c[key]).join('\n'), onChange: e => setC(sub ? { ...c, [sub]: { ...c[sub], [key]: e.target.value.split('\n') } } : { ...c, [key]: e.target.value.split('\n') }) });
  const clean = a => a.map(x => x.trim()).filter(Boolean);
  const move = (key, i, d) => { const a = [...c[key]]; [a[i], a[i + d]] = [a[i + d], a[i]]; setC({ ...c, [key]: a }); };

  async function save() {
    setErr('');
    const story = c.about.story.map(s => s.trim()).filter(Boolean);
    if (c.about.title.trim().length < 3) { setErr('Enter a title for the About page.'); return; }
    if (!story.length) { setErr('Write at least one paragraph of your story.'); return; }
    const occasions = clean(c.occasions), candles = clean(c.personalize.candles), knives = clean(c.personalize.knives);
    if (!occasions.length) { setErr('Keep at least one occasion.'); return; }
    if (!candles.length || !knives.length) { setErr('Keep at least one candle choice and one knife choice.'); return; }
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', body: { content: {
        home: { heroMain: c.home?.heroMain || '', heroSide: c.home?.heroSide || '' },
        occasions, personalize: { candles, knives },
        founder: { name: c.founder.name.trim(), title: c.founder.title.trim() },
        team: c.team.filter(t => t.name.trim()).map(t => ({ name: t.name.trim(), role: t.role.trim(), photo: t.photo || '' })),
        faqs: c.faqs.filter(f => f.q.trim() && f.a.trim()).map(f => ({ q: f.q.trim(), a: f.a.trim() })),
        about: {
          title: c.about.title.trim(), tagline: c.about.tagline.trim(), story,
          features: c.about.features.filter(f => f.title.trim() && f.text.trim()).map(f => ({ icon: f.icon, title: f.title.trim(), text: f.text.trim() })),
          photoMain: c.about.photoMain || '', photoAccent: c.about.photoAccent || '', gallery: c.about.gallery,
        },
      } } });
      toast('Website content saved — it is live on your website now', 'success'); reload();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const oneHome = key => <ImageUploader value={c.home?.[key] ? [c.home[key]] : []} onChange={v => setC({ ...c, home: { ...c.home, [key]: v[v.length - 1] || '' } })} max={1} cover={false} />;
  const one = (key) => <ImageUploader value={c.about[key] ? [c.about[key]] : []} onChange={v => setAbout({ [key]: v[v.length - 1] || '' })} max={1} cover={false} />;

  return (
    <>
      <PageHead title="Website content" sub="The home page banner, occasions, About page, Contact page questions and cake personalisation choices. Nothing here is fixed text.">
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save all changes'}</button>
      </PageHead>
      {err && <div className="card" style={{ marginBottom: 16, color: 'var(--terracotta)', fontWeight: 700 }} role="alert">{err}</div>}

      <Block title="Home page banner" sub="The two photos at the top of your home page. Without a photo, a stock picture is shown.">
        <div className="form-row2">
          <Field label="Large banner photo" hint="Best as a tall photo of your signature cake."><div>{oneHome('heroMain')}</div></Field>
          <Field label="Small corner photo"><div>{oneHome('heroSide')}</div></Field>
        </div>
      </Block>

      <Block title="Occasions" sub="Shown as “Shop by occasion” on the home page and in the Shop filter. You pick them for each cake in Cakes → Occasions.">
        <Field label="One occasion per line" hint="Up to 24. Removing one hides it from the website; cakes that had it simply stop showing under it."><textarea rows={8} {...lines('occasions')} /></Field>
      </Block>

      <Block title="Cake personalisation choices" sub="What customers can pick under “Personalize” on every cake.">
        <div className="form-row2">
          <Field label="Candles (one per line)" hint="The first one is chosen by default."><textarea rows={4} {...lines('candles', 'personalize')} /></Field>
          <Field label="Knives (one per line)" hint="The first one is chosen by default."><textarea rows={4} {...lines('knives', 'personalize')} /></Field>
        </div>
      </Block>

      <Block title="Our story" sub="The top of your About page. The first paragraph also appears on your home page.">
        <div className="form-row2">
          <Field label="Page title"><input value={c.about.title} maxLength={80} onChange={e => setAbout({ title: e.target.value })} /></Field>
          <Field label="Short tagline" hint="Shown as the heading of the story box on the home page."><input value={c.about.tagline} maxLength={80} onChange={e => setAbout({ tagline: e.target.value })} /></Field>
        </div>
        {c.about.story.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}><Field label={`Paragraph ${i + 1}`}><textarea rows={3} value={p} maxLength={700} onChange={e => updAbout('story', i, e.target.value)} /></Field></div>
            {c.about.story.length > 1 && <button className="btn-icon" style={{ marginTop: 22 }} aria-label="Remove paragraph" onClick={() => setAbout({ story: c.about.story.filter((_, j) => j !== i) })}><Icon name="trash" size={15} /></button>}
          </div>
        ))}
        {c.about.story.length < 4 && <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setAbout({ story: [...c.about.story, ''] })}><Icon name="plus" size={13} /> Add a paragraph</button>}
        <div className="form-row2">
          <Field label="Large story photo" hint="Without a photo, a stock picture is shown."><div>{one('photoMain')}</div></Field>
          <Field label="Small corner photo"><div>{one('photoAccent')}</div></Field>
        </div>
        <div className="form-row2"><Field label="Founder name — optional" hint="Shown in script writing under the story."><input value={c.founder.name} maxLength={60} onChange={e => setC({ ...c, founder: { ...c.founder, name: e.target.value } })} /></Field><Field label="Founder title"><input value={c.founder.title} maxLength={40} onChange={e => setC({ ...c, founder: { ...c.founder, title: e.target.value } })} /></Field></div>
      </Block>

      <Block title="Our chefs" sub="Photo, name and specialty. The “Meet the team” section appears once you add someone."
        action={c.team.length < 12 && <button className="btn btn-outline btn-sm" onClick={() => setC({ ...c, team: [...c.team, { name: '', role: '', photo: '' }] })}><Icon name="plus" size={14} /> Add chef</button>}>
        {c.team.length === 0 && <p className="field-hint">No chefs added yet. The section stays hidden.</p>}
        {c.team.map((t, i) => (
          <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 130, flex: 'none' }}><ImageUploader value={t.photo ? [t.photo] : []} onChange={v => upd('team', i, { photo: v[v.length - 1] || '' })} max={1} cover={false} /></div>
            <div style={{ flex: 1 }}><div className="form-row2">
              <Field label="Name"><input value={t.name} maxLength={60} onChange={e => upd('team', i, { name: e.target.value })} placeholder="e.g. Rohan Jadhav" /></Field>
              <Field label="Specialty"><input value={t.role} maxLength={80} placeholder="e.g. Fondant & wedding cakes" onChange={e => upd('team', i, { role: e.target.value })} /></Field>
            </div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn-icon" aria-label="Move chef up" disabled={i === 0} onClick={() => move('team', i, -1)}><Icon name="up" size={14} /></button>
              <button className="btn-icon" aria-label="Move chef down" disabled={i === c.team.length - 1} onClick={() => move('team', i, 1)}><Icon name="down" size={14} /></button>
              <button className="btn-icon" aria-label="Remove chef" onClick={() => setC({ ...c, team: c.team.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </Block>

      <Block title="Why people choose us" sub="Up to 6 small cards on the About page. Only write what is true for your bakery."
        action={c.about.features.length < 6 && <button className="btn btn-outline btn-sm" onClick={() => setAbout({ features: [...c.about.features, { icon: 'star', title: '', text: '' }] })}><Icon name="plus" size={14} /> Add card</button>}>
        {c.about.features.length === 0 && <p className="field-hint">No cards — this section stays hidden.</p>}
        {c.about.features.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 170, flex: 'none' }}><Field label="Icon"><select value={f.icon} onChange={e => updAbout('features', i, { icon: e.target.value })}>{ICONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field></div>
            <div style={{ flex: 1 }}>
              <Field label="Heading"><input value={f.title} maxLength={40} onChange={e => updAbout('features', i, { title: e.target.value })} placeholder="e.g. Real ingredients" /></Field>
              <Field label="Text"><input value={f.text} maxLength={160} onChange={e => updAbout('features', i, { text: e.target.value })} placeholder="One short sentence" /></Field>
            </div>
            <button className="btn-icon" style={{ marginTop: 22 }} aria-label="Remove card" onClick={() => setAbout({ features: c.about.features.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
          </div>
        ))}
      </Block>

      <Block title="Kitchen gallery" sub="Photos of your kitchen, cakes and team. Up to 12. Customers can tap a photo to enlarge it. With no photos the section stays hidden.">
        <ImageUploader value={c.about.gallery} onChange={v => setAbout({ gallery: v })} max={12} cover={false} />
      </Block>

      <Block title="Frequently asked questions" sub="Shown at the bottom of your Contact page. Tip: type {{cutoff}} in an answer and it becomes your same-day order cut-off time (for example “4 PM”), so it never goes out of date."
        action={c.faqs.length < 20 && <button className="btn btn-outline btn-sm" onClick={() => setC({ ...c, faqs: [...c.faqs, { q: '', a: '' }] })}><Icon name="plus" size={14} /> Add question</button>}>
        {c.faqs.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <Field label={`Question ${i + 1}`}><input value={f.q} maxLength={160} onChange={e => upd('faqs', i, { q: e.target.value })} /></Field>
              <Field label="Answer"><textarea rows={2} value={f.a} maxLength={600} onChange={e => upd('faqs', i, { a: e.target.value })} /></Field>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn-icon" aria-label="Move up" disabled={i === 0} onClick={() => move('faqs', i, -1)}><Icon name="up" size={14} /></button>
              <button className="btn-icon" aria-label="Move down" disabled={i === c.faqs.length - 1} onClick={() => move('faqs', i, 1)}><Icon name="down" size={14} /></button>
              <button className="btn-icon" aria-label="Remove question" onClick={() => setC({ ...c, faqs: c.faqs.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </Block>
      <div style={{ textAlign: 'right' }}><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save all changes'}</button></div>
    </>
  );
}
