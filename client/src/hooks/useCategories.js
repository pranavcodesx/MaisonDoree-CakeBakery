import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { CATEGORIES } from '../lib/constants.js';

let cache = null;
// Categories are managed in the admin panel, so wait for them instead of flashing an old list.
// The built-in list is only a fallback if the API can't be reached.
export function useCategories() {
  const [list, setList] = useState(cache || []);
  useEffect(() => {
    if (cache) return;
    api('/api/categories')
      .then(d => { cache = d.items.map(c => ({ slug: c.slug, name: c.name, emoji: c.emoji })); setList(cache); })
      .catch(() => { cache = CATEGORIES; setList(CATEGORIES); });
  }, []);
  return list;
}
