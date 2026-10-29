import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { STATUS_TONE } from '../lib/constants.js';

export const Badge = ({ tone = 'gray', children }) => <span className={`badge ${tone}`}>{children}</span>;
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'gray'}>{status}</Badge>;

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {error && <span className="field-error show" role="alert">{error}</span>}
      {hint && !error && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function Pagination({ page, pages, onPage }) {
  if (!pages || pages < 2) return null;
  const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><Icon name="chev-left" size={14} /></button>
      {nums.map((n, i) => <span key={n} style={{ display: 'contents' }}>{i > 0 && n - nums[i - 1] > 1 && <span style={{ alignSelf: 'center', color: 'var(--ink-faint)' }}>…</span>}<button className={n === page ? 'active' : ''} onClick={() => onPage(n)}>{n}</button></span>)}
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><Icon name="chev-right" size={14} /></button>
    </div>
  );
}

export const Empty = ({ icon = 'orders', title, text, action }) => (
  <div className="empty-state-card"><div className="es-ic-wrap"><Icon name={icon} /></div><h4>{title}</h4><p>{text}</p>{action}</div>
);

export const Loading = () => <div style={{ padding: 30 }}>{[80, 60, 70].map((w, i) => <div key={i} className="skel-line" style={{ width: w + '%', marginBottom: 14 }} />)}</div>;

export const ErrorBox = ({ message, onRetry }) => (
  <div className="card" style={{ textAlign: 'center', padding: 36 }}>
    <p style={{ color: 'var(--terracotta)', fontWeight: 700, marginBottom: 12 }}>{message}</p>
    {onRetry && <button className="btn btn-outline btn-sm" onClick={onRetry}>Try again</button>}
  </div>
);

export function PageHead({ title, sub, children }) {
  return <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div></div>;
}

// load data with loading / error state and a reload function
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let stale = false;
    setState(s => ({ ...s, loading: true }));
    fn().then(data => !stale && setState({ data, error: '', loading: false })).catch(e => !stale && setState({ data: null, error: e.message, loading: false }));
    return () => { stale = true; };
  }, [...deps, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: () => setN(x => x + 1) };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
