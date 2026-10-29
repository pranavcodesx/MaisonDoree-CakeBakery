import { useCallback, useState } from 'react';

const KEY = 'md-recent-v2';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

export function useRecentlyViewed() {
  const [items, setItems] = useState(read);
  const track = useCallback(cake => {
    const next = [cake, ...read().filter(c => c._id !== cake._id)].slice(0, 8);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setItems(next);
  }, []);
  return { items, track };
}
