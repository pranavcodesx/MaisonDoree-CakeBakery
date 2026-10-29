// Every call goes through here: cookies for login, JSON in/out, friendly errors.
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, message, field) { super(message); this.status = status; this.field = field; }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong. Please try again.', data.field);
  return data;
}

export const assetUrl = u => (u && u.startsWith('/uploads') ? BASE + u : u);
