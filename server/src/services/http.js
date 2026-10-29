import { z } from 'zod';

export class HttpError extends Error {
  constructor(status, message, field) { super(message); this.status = status; this.field = field; }
}

export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0];
    throw new HttpError(400, issue.message, issue.path.join('.'));
  }
  return r.data;
}

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export function normalizePhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
