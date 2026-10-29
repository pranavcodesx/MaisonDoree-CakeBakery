// End-to-end API checks against a running server (BASE) and a Mongo-compatible DB.
const BASE = process.env.BASE || 'http://localhost:5000';
let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { if (c) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗ FAIL', name, extra); } };

function client() {
  const jar = {};
  return async (method, path, body, opts = {}) => {
    const headers = {};
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookie) headers.cookie = cookie;
    const res = await fetch(BASE + path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const [k, v] = kv.split('='); if (c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970')) delete jar[k]; else jar[k] = v; }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    return { status: res.status, data };
  };
}
export { client, ok, BASE };
export const summary = () => { console.log(`\n${pass} passed, ${fail} failed`); return fail; };
