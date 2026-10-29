import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';
import { fmt } from '../lib/format.js';

const Ctx = createContext({ pending: 0, unreadMessages: 0, recent: [], fresh: new Set(), tick: 0, refresh: () => {} });
export const useAlerts = () => useContext(Ctx);

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.08, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch { /* sound is optional */ }
}

// Polls the server so a new customer order shows up without refreshing the page.
export function AlertsProvider({ children }) {
  const { user } = useAuth(); const toast = useToast();
  const [data, setData] = useState({ pending: 0, unreadMessages: 0, recent: [] });
  const [fresh, setFresh] = useState(new Set()); const [tick, setTick] = useState(0);
  const since = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const d = await api(`/notifications${since.current ? `?since=${encodeURIComponent(since.current)}` : ''}`);
      setData({ pending: d.pending, unreadMessages: d.unreadMessages, recent: d.recent });
      if (since.current && d.fresh.length) {
        setFresh(s => new Set([...s, ...d.fresh.map(o => o.orderNum)]));
        setTick(t => t + 1);   // pages watching `tick` reload their lists
        const o = d.fresh[0];
        toast(d.fresh.length > 1 ? `${d.fresh.length} new orders just came in` : `New order ${o.orderNum} from ${o.customer?.name || 'a customer'} (${fmt(o.totals.total)})`, 'success');
        beep();
      }
      since.current = d.now;
    } catch { /* offline or logged out: ignore */ }
  }, [toast]);

  useEffect(() => {
    if (!user) { since.current = null; return undefined; }
    refresh();
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, [user, refresh]);

  return <Ctx.Provider value={{ ...data, fresh, tick, refresh }}>{children}</Ctx.Provider>;
}
