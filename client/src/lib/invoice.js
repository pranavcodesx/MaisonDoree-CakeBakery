import { jsPDF } from 'jspdf';
import { fmtDate } from './format.js';

const rs = n => 'Rs. ' + Math.round(n).toLocaleString('en-IN');

// Invoice built from the saved order, so it always matches what was actually charged.
export function downloadInvoice(order) {
  const doc = new jsPDF(); let y = 20;
  doc.setFontSize(20); doc.text('Maison Dorée', 14, y); y += 8;
  doc.setFontSize(10); doc.text(`Invoice for order ${order.orderNum}  |  ${fmtDate(order.createdAt)}`, 14, y); y += 10;
  doc.text(`Billed to: ${order.customer.name}  (${order.customer.phone})`, 14, y); y += 6;
  doc.text(`Deliver to: ${order.address.label}, ${order.address.line} - ${order.address.pincode}`, 14, y, { maxWidth: 180 }); y += 12;
  doc.setFont(undefined, 'bold'); doc.text('Item', 14, y); doc.text('Qty', 140, y); doc.text('Amount', 196, y, { align: 'right' }); doc.setFont(undefined, 'normal'); y += 6;
  order.items.forEach(it => {
    doc.text(`${it.name} (${it.weight}${it.flavor ? ', ' + it.flavor : ''})`, 14, y, { maxWidth: 120 });
    doc.text(String(it.qty), 140, y); doc.text(rs(it.unitPrice * it.qty), 196, y, { align: 'right' }); y += 6;
    const extra = [it.message && `Message: ${it.message}`, it.candle, it.knife].filter(Boolean).join(' | ');
    if (extra) { doc.setFontSize(8); doc.text(extra, 18, y, { maxWidth: 160 }); doc.setFontSize(10); y += 5; }
  });
  y += 4; const t = order.totals;
  [['Subtotal', t.subtotal], t.discount > 0 && [`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, -t.discount], t.pointsDiscount > 0 && ['Reward points', -t.pointsDiscount], ['Delivery', t.delivery], ['Tax', t.tax]].filter(Boolean).forEach(([k, v]) => { doc.text(k, 140, y); doc.text((v < 0 ? '-' : '') + rs(Math.abs(v)), 196, y, { align: 'right' }); y += 6; });
  doc.setFont(undefined, 'bold'); doc.text('Total', 140, y); doc.text(rs(t.total), 196, y, { align: 'right' });
  doc.save(`${order.orderNum}-invoice.pdf`);
}
