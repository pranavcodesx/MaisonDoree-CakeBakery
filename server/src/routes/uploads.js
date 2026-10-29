import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { wrap, HttpError } from '../services/http.js';
import { storeImage } from '../services/storage.js';

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Only real images, max 5 MB. The file name is random and the extension comes from the
// detected type, never from what the user sent.
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const imageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Please upload a JPG, PNG or WebP image.'))),
}).single('photo');

// check the real bytes, not just the declared type
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

export const saveImage = wrap(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No image received.');
  const ext = sniff(req.file.buffer);
  if (!ext) throw new HttpError(400, 'That file is not a valid image.');
  res.status(201).json({ url: await storeImage(req.file.buffer, ext, UPLOAD_DIR) });
});

// customers: reference photos for their cake
const r = Router();
r.post('/', requireAuth, imageMulter, saveImage);
export default r;
