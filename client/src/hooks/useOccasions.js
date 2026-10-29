import { useSettings } from '../context/SettingsContext.jsx';
import { OCCASION_COLORS, occasionSlug } from '../lib/constants.js';

// Occasions are managed in the admin panel (Website → Occasions).
export function useOccasions() {
  const { content } = useSettings();
  return content.occasions.map((name, i) => ({ name, slug: occasionSlug(name), ...OCCASION_COLORS[i % OCCASION_COLORS.length] }));
}
