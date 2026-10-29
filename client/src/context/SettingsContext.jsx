import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// Store info, FAQs, team, builder prices, tax and delivery rules all come from the admin panel.
// These defaults only show for a moment while the first request is in flight.
export const DEFAULT_SETTINGS = {
  store: { name: 'Maison Dorée', phone: '', email: '', address: '', hours: '', foundedYear: null, citiesServed: 0 },
  content: {
    home: { heroMain: '', heroSide: '' },
    occasions: ['Birthday', 'Wedding', 'Baby Shower', 'Engagement', 'Graduation', "Mother's Day", "Father's Day", 'Anniversary', 'Valentine', 'Christmas', 'Diwali', 'Friendship Day'],
    personalize: { candles: ['Number Candle', 'Spiral Candles', 'No Candle'], knives: ['Classic Knife', 'Gold-Edge Knife', 'No Knife'] },
    founder: { name: '', title: 'Founder' }, team: [], faqs: [],
    about: {
      title: 'The Atelier Behind Every Layer', tagline: 'One obsession: better cake.',
      story: ['Maison Dorée began as a single kitchen counter and a family recipe book, baking for neighbors who wanted something better than the supermarket aisle.', 'Every recipe on our menu has been tasted, argued over, and re-tested until it earned its place — no shortcuts, no cake mixes, no compromise on butter.'],
      features: [], photoMain: '', photoAccent: '', gallery: [],
    },
  },
  builder: {
    base: { 1: 699, 2: 1199, 3: 1899 },
    topper: { candles: 0, cherries: 60, gold: 220, berries: 90, none: 0 },
    cream: { Buttercream: 0, 'Whipped Cream': 40, Fondant: 180, Ganache: 120 },
  },
  taxRate: 5,
  googleClientId: '',
  spinEnabled: false,
  rewards: { earnPer100: 5, pointValue: 0.5, minRedeem: 100, maxPct: 20, silverFrom: 5000, goldFrom: 15000 },
  delivery: { cutoffHour: 16, maxAdvanceDays: 30, slots: [], codMax: 10000 },
};

const Ctx = createContext({ ...DEFAULT_SETTINGS, loaded: false });
export const useSettings = () => useContext(Ctx);

export function SettingsProvider({ children }) {
  const [s, setS] = useState({ ...DEFAULT_SETTINGS, loaded: false });
  useEffect(() => { api('/api/settings/public').then(d => setS({ ...DEFAULT_SETTINGS, ...d, loaded: true })).catch(() => setS(x => ({ ...x, loaded: true }))); }, []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
