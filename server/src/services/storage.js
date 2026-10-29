import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { HttpError } from './http.js';

// Where uploaded photos live.
//  - Cloudinary when CLOUDINARY_* is configured (needed on hosts whose disk is wiped, e.g. Render's free plan)
//  - otherwise the server's own `uploads/` folder
export const cloudinaryEnabled = () => !!(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);

// Cloudinary signature: sha1 of "k1=v1&k2=v2" (sorted by key, file/api_key excluded) followed by the API secret.
export function signParams(params, secret) {
  const base = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== '').sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(base + secret).digest('hex');
}

export async function storeImage(buffer, ext, uploadDir) {
  if (!cloudinaryEnabled()) {
    const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    await fs.promises.writeFile(path.join(uploadDir, name), buffer);
    return `/uploads/${name}`;
  }
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: 'maison-doree', timestamp };
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` }), `upload.${ext}`);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', params.folder);
  form.append('signature', signParams(params, apiSecret));
  let res;
  try { res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form }); }
  catch { throw new HttpError(502, 'Could not reach the image service. Please try again.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    console.error('Cloudinary upload failed:', res.status, data.error?.message);
    throw new HttpError(502, 'The photo could not be saved. Please try again.');
  }
  return data.secure_url;
}
