import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { imageMulter, saveImage } from '../uploads.js';
import auth from './auth.js';
import dashboard from './dashboard.js';
import orders from './orders.js';
import catalog from './catalog.js';
import people from './people.js';
import settings from './settings.js';

const r = Router();
r.use('/auth', auth);               // login/logout/me (login itself is public)
r.use(requireAdmin);                // everything below needs the admin cookie
r.post('/uploads', imageMulter, saveImage);
r.use(dashboard);
r.use(orders);
r.use(catalog);
r.use(people);
r.use(settings);
export default r;
