export const fmt = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
export const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
export const fmtDay = d => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });   // delivery dates are stored as UTC midnight
export const fmtDateTime = d => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
export const timeAgo = d => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return fmtDate(d);
};
export const weightLabel = g => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);
export const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
export const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
