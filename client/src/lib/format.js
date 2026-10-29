export const fmtPrice = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
export const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDateTime = d => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
export const weightLabel = g => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);
export const timeAgo = d => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} days ago`;
  return fmtDate(d);
};
