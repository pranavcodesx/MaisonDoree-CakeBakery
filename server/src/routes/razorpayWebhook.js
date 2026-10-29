// ============================================================================================
//  RAZORPAY WEBHOOK  —  NOT ACTIVE. Everything below is commented out on purpose.
//
//  Why it exists: after paying, the customer's browser tells our server "payment done" (verify-payment).
//  If the customer closes the tab or loses internet at that exact moment, the money is taken but the
//  order stays "pending" and nobody sees it. A webhook fixes this: Razorpay itself calls our server
//  when a payment succeeds, so the order is marked paid even if the customer's browser never came back.
//
//  You only need this for REAL payments. While the website is a project / demo (test keys), leave it off.
//
//  To switch it on, follow README.md → "Going live with real payments":
//    1. remove the /*  and  */  lines around the code below,
//    2. un-comment the 2 lines marked WEBHOOK in server/src/index.js,
//    3. put RAZORPAY_WEBHOOK_SECRET in server/.env and create the webhook in the Razorpay dashboard.
// ============================================================================================

/*
import { Router } from 'express';
import crypto from 'crypto';
import { Order } from '../models/Order.js';
import { onConfirmed } from './orders.js';

const r = Router();

// IMPORTANT: this route needs the RAW request body (the signature is calculated on the exact bytes Razorpay sent),
// so it is mounted in index.js BEFORE express.json() and uses express.raw() there.
r.post('/', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;        // the secret you type in Razorpay → Settings → Webhooks (not your API key secret)
    if (!secret) return res.status(503).end();

    const signature = String(req.get('x-razorpay-signature') || '');
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');      // req.body is a Buffer here
    const a = Buffer.from(expected), b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).end();  // not from Razorpay

    const event = JSON.parse(req.body.toString('utf8'));
    // payment.captured = money received.  order.paid = the whole Razorpay order is paid.
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id || event.payload?.order?.entity?.id;
      if (razorpayOrderId) {
        // One atomic update: if the browser (verify-payment) already marked it paid, this finds nothing and does nothing,
        // so the customer never gets two confirmation emails.
        const order = await Order.findOneAndUpdate(
          { 'payment.razorpayOrderId': razorpayOrderId, 'payment.status': { $in: ['pending', 'failed'] } },
          { $set: { 'payment.status': 'paid', 'payment.razorpayPaymentId': payment?.id } },
          { new: true },
        );
        if (order) await onConfirmed(order);        // sends the confirmation email, uses up a spin coupon ...
      }
    }
    // Always answer 200 quickly, otherwise Razorpay keeps retrying.
    res.json({ ok: true });
  } catch (e) {
    console.error('Razorpay webhook error:', e.message);
    res.status(500).end();     // Razorpay will retry later
  }
});

export default r;
*/
