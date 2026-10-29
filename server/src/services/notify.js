import { User } from '../models/User.js';
import { Subscriber } from '../models/Lead.js';
import { sendMail } from './mailer.js';
import { getSettings } from './settings.js';
import { config } from '../config.js';

// E-mails to customers: order confirmation, order progress, cancellation, and the owner's offer / new-arrival announcements.
// They are sent in the background, so a slow or broken mail server never delays or breaks an order.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const dayText = d => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function layout(shop, heading, bodyHtml, footer) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#2b1810;line-height:1.55">
<div style="text-align:center;padding:18px 0;border-bottom:1px solid #e9dbc3;font-size:20px;letter-spacing:.04em">${esc(shop)}</div>
<h2 style="font-weight:600;font-size:20px;margin:24px 0 12px">${esc(heading)}</h2>${bodyHtml}
<p style="font-size:12px;color:#8a7466;border-top:1px solid #e9dbc3;margin-top:28px;padding-top:14px">${footer}</p></div>`;
}
const button = (href, text) => `<p style="margin:22px 0"><a href="${esc(href)}" style="background:#2b1810;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;display:inline-block">${esc(text)}</a></p>`;

const STATUS_COPY = {
  Confirmed: ['Your order is confirmed', 'Good news: we have confirmed your order and our kitchen has it.'],
  Baking: ['Your cake is in the oven', 'Our bakers have started baking your order.'],
  Decorating: ['Decorating time', 'Your cake is being decorated by hand.'],
  Packed: ['Packed and ready', 'Your order is packed and waiting for the delivery rider.'],
  'Out for Delivery': ['On its way', 'Your order is out for delivery. Please keep your phone nearby.'],
  Delivered: ['Delivered. Enjoy!', 'Your order has been delivered. We hope it made the moment sweeter.'],
  Cancelled: ['Your order was cancelled', 'Your order has been cancelled.'],
};

const itemsHtml = o => o.items.map(i => `<tr><td style="padding:4px 0">${esc(i.qty)} × ${esc(i.name)}<br><span style="font-size:12px;color:#8a7466">${esc([i.weight, i.flavor].filter(Boolean).join(' · '))}</span></td><td style="padding:4px 0;text-align:right;white-space:nowrap">${money(i.unitPrice * i.qty)}</td></tr>`).join('');

function orderBody(o, S, intro, extra = '') {
  const t = o.totals;
  const row = (l, v, c = '') => `<tr><td style="padding:2px 0;${c}">${l}</td><td style="padding:2px 0;text-align:right;${c}">${v}</td></tr>`;
  return `<p>Hi ${esc(o.customer?.name?.split(' ')[0] || 'there')},</p><p>${esc(intro)}</p>${extra}
<p style="margin:18px 0 6px"><b>Order ${esc(o.orderNum)}</b><br><span style="font-size:13px;color:#6b5a50">Delivery: ${esc(dayText(o.delivery.date))}, ${esc(o.delivery.slot)}<br>To: ${esc(o.address.line)} (${esc(o.address.pincode)})</span></p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${itemsHtml(o)}
<tr><td colspan="2"><hr style="border:0;border-top:1px solid #e9dbc3"></td></tr>
${row('Subtotal', money(t.subtotal))}${t.discount > 0 ? row(`Discount${o.couponCode ? ` (${esc(o.couponCode)})` : ''}`, '−' + money(t.discount)) : ''}${t.pointsDiscount > 0 ? row('Reward points', '−' + money(t.pointsDiscount)) : ''}${row('Delivery', money(t.delivery))}${row('Tax', money(t.tax))}${row('<b>Total</b>', `<b>${money(t.total)}</b>`)}
</table><p style="font-size:13px;color:#6b5a50">Payment: ${o.payment.method === 'cod' ? 'Cash on delivery' : o.payment.status === 'paid' ? 'Paid online' : 'Online'}</p>
${button(`${config.publicUrl}/track/${o.orderNum}`, 'Track your order')}`;
}

// the plain-text version of an order e-mail (for mail apps that don't show HTML, and for local testing)
function orderText(o, intro) {
  const t = o.totals;
  return [`Hi ${o.customer?.name?.split(' ')[0] || 'there'},`, '', intro, '', `Order ${o.orderNum}`, `Delivery: ${dayText(o.delivery.date)}, ${o.delivery.slot}`, `To: ${o.address.line} (${o.address.pincode})`, '',
    ...o.items.map(i => `${i.qty} x ${i.name}${i.weight ? ` (${i.weight})` : ''}  ${money(i.unitPrice * i.qty)}`), '',
    `Subtotal ${money(t.subtotal)}`, t.discount > 0 ? `Discount -${money(t.discount)}` : '', t.pointsDiscount > 0 ? `Reward points -${money(t.pointsDiscount)}` : '',
    `Delivery ${money(t.delivery)}`, `Tax ${money(t.tax)}`, `Total ${money(t.total)}`, '', `Track your order: ${config.publicUrl}/track/${o.orderNum}`].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}

async function recipient(order) {
  const user = await User.findById(order.user);
  const to = order.customer?.email || user?.email;
  return { user, to };
}

// kind: 'placed' (order confirmation) or 'status' (the order moved on, or was cancelled)
export function notifyOrder(order, kind) {
  (async () => {
    const { user, to } = await recipient(order);
    if (!to) return;
    // the confirmation is a receipt and always goes out; progress updates respect the customer's "Order updates" choice
    if (kind === 'status' && user?.notifPrefs?.orderUpdates === false) return;
    const S = await getSettings(); const shop = S.store.name;
    let subject; let html; let intro;
    if (kind === 'placed') {
      subject = `Order ${order.orderNum} confirmed`;
      intro = 'We have received your order and will start preparing it soon.';
      html = layout(shop, 'Thank you for your order!', orderBody(order, S, intro), 'You are receiving this because you placed an order with us.');
    } else {
      const [title, line] = STATUS_COPY[order.status] || [`Order update: ${order.status}`, `Your order is now "${order.status}".`];
      subject = `${title} (order ${order.orderNum})`;
      intro = line;
      let extra = '';
      if (order.status === 'Cancelled' && order.payment.status === 'refund_pending') extra = '<p>Your online payment will be refunded to the original payment method by our team.</p>';
      if (order.status === 'Delivered' && order.pointsAwarded) extra = `<p>You earned <b>${order.pointsAwarded} reward points</b>. You can use them as a discount on your next order.</p>`;
      html = layout(shop, title, orderBody(order, S, line, extra), 'You get order updates because you chose “Order updates” in your account. You can change this under Account → Settings.');
    }
    await sendMail({ to, subject, html, text: orderText(order, intro) });
  })().catch(e => console.error('Order email failed:', e.message));
}

// The owner's announcement. audience: 'offers' | 'newArrivals'. Only people who chose to get it (plus newsletter subscribers for offers).
export async function recipientsFor(audience) {
  const users = await User.find({ role: 'user', email: { $exists: true, $ne: null }, [`notifPrefs.${audience}`]: true }).select('email name').lean();
  const map = new Map(users.map(u => [u.email.toLowerCase(), u.name]));
  if (audience === 'offers') for (const s of await Subscriber.find().select('email').lean()) if (!map.has(s.email.toLowerCase())) map.set(s.email.toLowerCase(), '');
  return [...map].map(([email, name]) => ({ email, name }));
}

export async function sendAnnouncement({ audience, subject, message }) {
  const S = await getSettings(); const shop = S.store.name;
  const people = (await recipientsFor(audience)).slice(0, 1000);
  const paragraphs = message.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const why = audience === 'offers' ? 'offers and news' : 'new arrivals';
  let sent = 0; let failed = 0;
  for (let i = 0; i < people.length; i += 5) {
    await Promise.all(people.slice(i, i + 5).map(async p => {
      try {
        await sendMail({ to: p.email, subject, text: `${message}\n\n${config.publicUrl}`, html: layout(shop, subject, paragraphs + button(config.publicUrl, 'Visit the shop'), `You get this because you chose to receive ${why} from ${esc(shop)} (in your account settings, or by joining our newsletter). Reply to this email if you want to stop.`) });
        sent++;
      } catch (e) { failed++; console.error('Announcement email failed:', e.message); }
    }));
  }
  return { total: people.length, sent, failed };
}
