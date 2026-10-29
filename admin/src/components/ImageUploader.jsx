import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { api, assetUrl } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

// Upload up to `max` photos. With `cover` (cakes) the first one is the cover; arrows change the order.
export default function ImageUploader({ value, onChange, max = 5, cover = true }) {
  const toast = useToast(); const ref = useRef(null);
  const [busy, setBusy] = useState(0); const [over, setOver] = useState(false);

  async function addFiles(fileList) {
    const files = [...fileList].slice(0, max - value.length);
    if (fileList.length > files.length) toast(`You can add up to ${max} photos.`, 'info');
    const added = [];
    for (const f of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast(`${f.name}: use a JPG, PNG or WebP image.`, 'error'); continue; }
      if (f.size > 5 * 1024 * 1024) { toast(`${f.name} is larger than 5 MB.`, 'error'); continue; }
      setBusy(b => b + 1);
      try { const fd = new FormData(); fd.append('photo', f); const d = await api('/uploads', { method: 'POST', form: fd }); added.push(d.url); }
      catch (e) { toast(`${f.name}: ${e.message}`, 'error'); }
      setBusy(b => b - 1);
    }
    if (added.length) onChange([...value, ...added]);
  }
  const move = (i, d) => { const n = [...value]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {value.map((u, i) => (
          <div key={u} style={{ width: 124 }}>
            <div className="img-upload-box" style={{ width: 124, height: 124, cursor: 'default', borderStyle: cover && i === 0 ? 'solid' : 'dashed', borderColor: cover && i === 0 ? 'var(--gold-500)' : undefined }}>
              <img className="img-upload-preview" src={assetUrl(u)} alt={`Cake photo ${i + 1}`} />
              {cover && i === 0 && <span className="badge gold" style={{ position: 'absolute', top: 6, left: 6, padding: '3px 8px', fontSize: 9.5 }}>Cover</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <button type="button" className="btn-icon" style={{ width: 28, height: 28 }} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move earlier"><Icon name="chev-left" size={13} /></button>
              <button type="button" className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => onChange(value.filter(x => x !== u))} aria-label="Remove photo"><Icon name="trash" size={13} /></button>
              <button type="button" className="btn-icon" style={{ width: 28, height: 28 }} disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move later"><Icon name="chev-right" size={13} /></button>
            </div>
          </div>
        ))}
        {value.length < max && (
          <div className={`img-upload-box ${over ? 'dragover' : ''}`} style={{ width: 124, height: 124 }} onClick={() => ref.current.click()}
            onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}>
            <div className="img-upload-placeholder"><Icon name="upload" /><span>{busy ? 'Uploading…' : 'Add photos'}</span><span className="img-upload-hint">JPG, PNG, WebP</span></div>
            {busy > 0 && <div className="img-upload-busy">…</div>}
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
