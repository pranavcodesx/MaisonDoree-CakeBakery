// Every admin call goes through here: admin cookie, JSON in/out, friendly errors.
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, message, field) { super(message); this.status = status; this.field = field; }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = fn => { onUnauthorized = fn; };

export async function api(path, { method = 'GET', body, form, raw } = {}) {
  const res = await fetch(`${BASE}/api/admin${path}`, {
    method, credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  if (raw && res.ok) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized();
    throw new ApiError(res.status, data.error || 'Something went wrong. Please try again.', data.field);
  }
  return data;
}

export const assetUrl = u => (u && u.startsWith('/uploads') ? BASE + u : u);

// download a CSV through the authenticated API
export async function downloadFile(path, filename) {
  const res = await api(path, { raw: true });
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
