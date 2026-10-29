import { useEffect } from 'react';
import Icon from './Icon.jsx';

// A dialog in the original admin style. Closes on Esc and on a click outside.
export default function Modal({ open, title, onClose, wide, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);
  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      {open && (
        <div className={`modal-box ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
          <div className="modal-head"><h3>{title}</h3><button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      )}
    </div>
  );
}

// "Are you sure?" dialog
export function Confirm({ open, title, text, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  return (
    <Modal open={open} title={title} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>{busy ? 'Please wait…' : confirmLabel}</button></>}>
      <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{text}</p>
    </Modal>
  );
}
