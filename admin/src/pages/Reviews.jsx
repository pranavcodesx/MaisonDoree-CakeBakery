import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Confirm } from '../components/Modal.jsx';
import { Badge, Pagination, Empty, ErrorBox, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, assetUrl } from '../lib/api.js';
import { fmtDate } from '../lib/format.js';

const Stars = ({ n }) => <span style={{ color: 'var(--gold-500)', letterSpacing: 1 }} aria-label={`${n} out of 5`}>{'★'.repeat(n)}<span style={{ color: 'var(--border)' }}>{'★'.repeat(5 - n)}</span></span>;

export default function Reviews() {
  const toast = useToast();
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [del, setDel] = useState(null);
  const { data, error, reload } = useLoad(() => api(`/reviews?${new URLSearchParams({ ...(status && { status }), page })}`), [status, page]);
  const act = async (fn, msg) => { try { await fn(); toast(msg, 'success'); reload(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <>
      <PageHead title="Reviews" sub="Customers can review a cake once their order is delivered. Reviews go live straight away. Hide any that you don't want on your website." />
      <div className="card">
        <div className="tab-strip">
          {[['', 'All'], ['approved', `Live (${data?.counts.approved ?? '…'})`], ['hidden', `Hidden (${data?.counts.hidden ?? '…'})`]].map(([k, l]) => <button key={k} className={status === k ? 'active' : ''} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>)}
        </div>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="reviews" title="No reviews here" text="Reviews appear after customers receive their cakes." /> : data.items.map(r => (
          <div key={r._id} className="list-row" style={{ alignItems: 'flex-start', padding: '16px 0' }}>
            {r.cake?.images?.[0] ? <img src={assetUrl(r.cake.images[0])} alt="" /> : <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--bg-alt)' }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lr-name">{r.cake?.name || 'Deleted cake'} <Stars n={r.rating} /> {r.status === 'hidden' && <Badge tone="gray">Hidden</Badge>}</div>
              <p style={{ fontSize: 13, margin: '4px 0', lineHeight: 1.55 }}>{r.comment}</p>
              <div className="lr-sub">{r.user?.name || 'Customer'} · order {r.order?.orderNum} · {fmtDate(r.createdAt)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={() => act(() => api(`/reviews/${r._id}`, { method: 'PATCH', body: { status: r.status === 'hidden' ? 'approved' : 'hidden' } }), r.status === 'hidden' ? 'Review is live again' : 'Review hidden from your website')}><Icon name={r.status === 'hidden' ? 'eye' : 'eye-off'} size={14} /> {r.status === 'hidden' ? 'Show' : 'Hide'}</button>
              <button className="btn-icon" aria-label="Delete review" onClick={() => setDel(r)}><Icon name="trash" size={15} /></button>
            </div>
          </div>
        ))}
        {data && <Pagination page={data.page} pages={data.pages} onPage={setPage} />}
      </div>
      <Confirm open={!!del} danger title="Delete this review?" confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={async () => { await act(() => api(`/reviews/${del._id}`, { method: 'DELETE' }), 'Review deleted'); setDel(null); }} text="This removes it for good and updates the cake's star rating. Hiding it instead keeps a copy." />
    </>
  );
}
