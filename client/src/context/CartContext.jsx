import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);
const KEY = 'md-cart-v2';

// Items keep every personalisation the customer chose, so it travels cart → checkout → order.
export const itemKey = i => [i.kind, i.cakeId || '', i.weight, i.flavor, i.message || '', i.candle || '', i.knife || '', i.photoUrl || '', JSON.stringify(i.custom || {})].join('|');

// what the server expects (display-only fields like `snap` stay on the client)
export const toServerItem = i => (i.kind === 'custom'
  ? { kind: 'custom', qty: i.qty, message: i.message || undefined, photoUrl: i.photoUrl || undefined, custom: i.custom }
  : { kind: 'catalog', cakeId: i.cakeId, weight: i.weight, flavor: i.flavor, qty: i.qty, message: i.message || undefined, candle: i.candle, knife: i.knife, photoUrl: i.photoUrl || undefined });

export function CartProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY))?.items || []; } catch { return []; } });
  const [couponCode, setCouponCode] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY))?.couponCode || ''; } catch { return ''; } });
  const [pincode, setPincode] = useState('');
  const [usePoints, setUsePoints] = useState(false);     // spend reward points on this order
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ items, couponCode })); } catch { /* private mode */ } }, [items, couponCode]);

  // prices, discount, delivery and tax always come from the server
  useEffect(() => {
    if (!items.length) { setQuote(null); setQuoteError(null); return undefined; }
    let stale = false;
    const t = setTimeout(async () => {
      try {
        const d = await api('/api/cart/quote', { method: 'POST', body: { items: items.map(toServerItem), couponCode: couponCode || undefined, pincode: pincode || undefined, usePoints: usePoints || undefined } });
        if (stale) return;
        setQuote(d); setQuoteError(null);
        if (couponCode && d.couponError) { toast(d.couponError, 'error'); setCouponCode(''); }
      } catch (e) { if (!stale) setQuoteError(e.message); }
    }, 200);
    return () => { stale = true; clearTimeout(t); };
  }, [items, couponCode, pincode, usePoints, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback(item => {
    setItems(list => {
      const key = itemKey(item);
      const found = list.find(i => itemKey(i) === key);
      return found ? list.map(i => (i === found ? { ...i, qty: Math.min(20, i.qty + item.qty) } : i)) : [...list, item];
    });
  }, []);
  const setQty = useCallback((key, qty) => setItems(list => list.map(i => (itemKey(i) === key ? { ...i, qty: Math.max(1, Math.min(i.kind === 'custom' ? 5 : 20, qty)) } : i))), []);
  const remove = useCallback(key => setItems(list => list.filter(i => itemKey(i) !== key)), []);
  const clear = useCallback(() => { setItems([]); setCouponCode(''); setUsePoints(false); }, []);

  const applyCoupon = useCallback(async code => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const d = await api('/api/cart/quote', { method: 'POST', body: { items: items.map(toServerItem), couponCode: c } });
    if (d.couponError) { toast(d.couponError, 'error'); return; }
    setCouponCode(c); toast(`${c} applied`, 'success', 'tag');
  }, [items, toast]);

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  return (
    <Ctx.Provider value={{ items, count, add, setQty, remove, clear, quote, quoteError, couponCode, setCouponCode, applyCoupon, pincode, setPincode, usePoints, setUsePoints }}>
      {children}
    </Ctx.Provider>
  );
}
