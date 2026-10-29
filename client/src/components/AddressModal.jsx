import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Add / edit one saved address. Saved on the account, so checkout and profile always agree.
export default function AddressModal({ open, address, onClose, onSaved }) {
  const { patchUser } = useAuth(); const toast = useToast();
  const [f, setF] = useState({ label: '', line: '', pincode: '' }); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF({ label: address?.label || '', line: address?.line || '', pincode: address?.pincode || '' }); setErr({}); } }, [open, address]);
  const set = k => e => { setF(s => ({ ...s, [k]: e.target.value })); setErr(x => ({ ...x, [k]: '' })); };

  async function save() {
    const errors = {};
    if (!f.label.trim()) errors.label = 'Please give this address a label.';
    if (f.line.trim().length < 8) errors.line = 'Please enter your full address.';
    if (!/^\d{6}$/.test(f.pincode)) errors.pincode = 'Enter a valid 6-digit pincode.';
    if (Object.keys(errors).length) { setErr(errors); return; }
    setBusy(true);
    try {
      const body = { label: f.label.trim(), line: f.line.trim(), pincode: f.pincode };
      const d = address ? await api(`/api/me/addresses/${address._id}`, { method: 'PUT', body }) : await api('/api/me/addresses', { method: 'POST', body });
      patchUser({ addresses: d.addresses });
      toast(address ? 'Address updated' : 'Address added', 'success');
      onSaved?.(d.addresses); onClose();
    } catch (e) { setErr({ [e.field || 'line']: e.message }); }
    setBusy(false);
  }
  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 'min(440px,92vw)', padding: '36px 30px 30px' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close address dialog"><Icon name="x" /></button>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Delivery Address</span>
        <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 20, margin: '8px 0 20px', textAlign: 'center' }}>{address ? 'Edit Address' : 'Add New Address'}</h3>
        <div className="form-field"><label>Label</label><input type="text" value={f.label} onChange={set('label')} placeholder="e.g. Home, Office" /><small className="field-error">{err.label}</small></div>
        <div className="form-field"><label>Full address</label>
          <textarea value={f.line} onChange={set('line')} placeholder="House no., street, area, city, state" style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--bg-alt)', fontSize: 13.6, minHeight: 84 }} />
          <small className="field-error">{err.line}</small></div>
        <div className="form-field"><label>Pincode</label><input type="text" inputMode="numeric" maxLength={6} value={f.pincode} onChange={set('pincode')} placeholder="6-digit pincode" /><small className="field-error">{err.pincode}</small></div>
        <button className="btn btn-primary btn-block" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Address'}</button>
      </div>
    </div>
  );
}
