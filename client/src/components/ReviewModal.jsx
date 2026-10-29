import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

// Write or edit a review. The server only accepts reviews for cakes from delivered orders.
export default function ReviewModal({ ctx, onClose, onSaved }) {
  const toast = useToast();
  const [stars, setStars] = useState(0); const [comment, setComment] = useState(''); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false);
  useEffect(() => { if (ctx) { setStars(ctx.existing?.rating || 0); setComment(ctx.existing?.comment || ''); setErr({}); } }, [ctx]);

  async function save() {
    if (!stars) { setErr({ stars: 'Please select a star rating.' }); return; }
    if (comment.trim().length < 5) { setErr({ comment: 'Please write a few words about your experience.' }); return; }
    setBusy(true);
    try {
      if (ctx.existing) await api(`/api/reviews/${ctx.existing._id}`, { method: 'PUT', body: { rating: stars, comment: comment.trim() } });
      else await api('/api/reviews', { method: 'POST', body: { orderNum: ctx.order.orderNum, cakeId: ctx.item.cake, rating: stars, comment: comment.trim() } });
      toast(ctx.existing ? 'Review updated' : 'Thanks for your review!', 'success', 'star');
      onSaved?.(); onClose();
    } catch (e) { setErr({ comment: e.message }); }
    setBusy(false);
  }
  return (
    <div className={`modal-overlay ${ctx ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 'min(440px,92vw)', padding: '36px 30px 30px' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close review dialog"><Icon name="x" /></button>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>{ctx?.existing ? 'Edit Your Review' : 'Write a Review'}</span>
        <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 20, margin: '8px 0 4px', textAlign: 'center' }}>{ctx?.item?.name}</h3>
        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 18 }}>Order {ctx?.order?.orderNum}</p>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div className="review-star-picker">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" className={`rsp-star ${n <= stars ? 'sel' : ''}`} onClick={() => { setStars(n); setErr({}); }}><Icon name="star" /></button>)}</div>
          <small className="field-error">{err.stars}</small>
        </div>
        <div className="form-field"><label>Your review</label>
          <textarea value={comment} onChange={e => { setComment(e.target.value); setErr({}); }} placeholder="Tell us what you loved (or what we can improve)..." style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--bg-alt)', fontSize: 13.6, minHeight: 100 }} />
          <small className="field-error">{err.comment}</small></div>
        <button className="btn btn-primary btn-block" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Submit Review'}</button>
      </div>
    </div>
  );
}
