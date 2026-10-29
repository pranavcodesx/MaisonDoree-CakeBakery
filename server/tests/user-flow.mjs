// Storefront API tests. Run against a THROWAWAY database (see README "Automated API tests").
import { client, ok, summary } from './e2e.mjs';
const u = client(), admin = client(), anon = client(), guest = () => client();
const PHONE = '9' + String(Math.floor(Math.random()*1e9)).padStart(9,'0');
const email = `t${Date.now()}@test.com`;

console.log('catalog');
let r = await anon('GET', '/api/cakes?limit=50'); ok(r.status === 200 && r.data.total === 47, 'lists 47 seeded cakes', JSON.stringify(r.data).slice(0, 120));
const cakes = r.data.items; const cake = cakes[0];
r = await anon('GET', '/api/cakes?category=eggless'); ok(r.data.total > 0 && r.data.items.every(c => c.category === 'eggless'), 'category filter');
r = await anon('GET', '/api/cakes?eggless=true'); ok(r.data.items.every(c => !c.egg), 'eggless filter');
r = await anon('GET', '/api/cakes?q=chocolate'); ok(r.data.total > 0, 'search q=chocolate');
r = await anon('GET', '/api/cakes?occasions=mothers-day'); ok(r.status === 200, 'occasion filter ok');
r = await anon('GET', '/api/cakes/meta'); ok(r.data.flavors.length > 5, 'meta flavors');
r = await anon('GET', `/api/cakes/${cake._id}`); ok(r.data.cake?._id === cake._id, 'cake detail');

console.log('auth');
r = await u('POST', '/api/auth/signup', { name: 'Test User', identifier: email, password: 'short' }); ok(r.status === 400, 'weak password rejected');
r = await u('POST', '/api/auth/signup', { name: 'Test User', identifier: email, password: 'GoodPass123' }); ok(r.status === 201 && r.data.user.email === email, 'signup');
r = await u('POST', '/api/auth/signup', { name: 'Dup', identifier: email, password: 'GoodPass123' }); ok(r.status === 409, 'duplicate signup rejected');
r = await u('GET', '/api/auth/me'); ok(r.data.user?.email === email, 'session cookie works');
r = await anon('GET', '/api/auth/me'); ok(r.status === 401, 'anonymous blocked');
r = await guest()('POST', '/api/auth/login', { identifier: email, password: 'wrong' }); ok(r.status === 401, 'wrong password rejected');
r = await guest()('POST', '/api/auth/login', { identifier: email, password: 'GoodPass123' }); ok(r.status === 200, 'login');

console.log('account');
r = await u('POST', '/api/me/addresses', { label: 'Home', line: '12 Test Street, Tarabai Park', pincode: '416003' }); ok(r.status === 201 && r.data.addresses[0].isDefault, 'add address (first is default)');
r = await u('POST', '/api/me/addresses', { label: 'Office', line: '99 Office Road, Rajarampuri', pincode: '416008', isDefault: true }); ok(r.data.addresses.filter(a => a.isDefault).length === 1 && r.data.addresses[1].isDefault, 'only one default address');
const addrId = r.data.addresses[0]._id;
r = await u('PUT', `/api/me/addresses/${addrId}`, { label: 'Home 2', line: '12 Test Street, Tarabai Park', pincode: '416003' }); ok(r.data.addresses[0].label === 'Home 2', 'edit address');
r = await u('PUT', '/api/me', { name: 'Test User 2', email, phone: PHONE }); ok(r.data.user.phone === PHONE, 'profile update');
r = await u('PUT', '/api/me/password', { current: 'GoodPass123', next: 'NewPass12345' }); ok(r.status === 200, 'password change');
r = await u('PUT', '/api/me/notifications', { offers: false }); ok(r.data.notifPrefs.offers === false, 'notification prefs');
r = await u('POST', `/api/me/wishlist/${cake._id}`); ok(r.data.added === true, 'wishlist add');
r = await u('GET', '/api/me/wishlist'); ok(r.data.items.length === 1, 'wishlist list');

console.log('checkout');
r = await anon('GET', '/api/pincodes/416003'); ok(r.data.deliverable === true, 'pincode deliverable');
r = await anon('GET', '/api/pincodes/999999'); ok(r.data.deliverable === false, 'pincode not deliverable');
r = await anon('GET', '/api/delivery/slots'); ok(r.data.days.length === 5 && r.data.slots.length > 2, 'slots');
const tomorrow = r.data.days[1].date; const slot = r.data.slots[0];
const items = [
  { kind: 'catalog', cakeId: cake._id, weight: '1 kg', flavor: cake.flavor, qty: 2, message: 'Happy Birthday Aria', candle: 'Spiral Candles', knife: 'Gold-Edge Knife' },
  { kind: 'custom', qty: 1, message: 'Congrats', custom: { shape: 'heart', layers: 2, flavor: 'Chocolate', cream: 'Fondant', topper: 'gold', color: '#F0D9C4' } },
];
r = await u('POST', '/api/cart/quote', { items, couponCode: 'SWEET50', pincode: '416003' });
ok(r.status === 200 && r.data.totals.discount === 50 && r.data.lines[1].unitPrice === 1599, 'quote: SWEET50 + custom price', JSON.stringify(r.data).slice(0, 200));
const quote = r.data.totals;
r = await u('POST', '/api/cart/quote', { items, couponCode: 'GOLD20', pincode: '416003' }); ok(r.data.couponError || r.data.totals.discount > 0, 'quote: GOLD20 handled');
r = await u('POST', '/api/cart/quote', { items, couponCode: 'NOPE' }); ok(r.data.couponError, 'quote: invalid coupon reported');
r = await u('POST', '/api/cart/quote', { items: [{ ...items[0], candle: 'Rocket' }] }); ok(r.status === 400, 'quote: bad candle rejected');

const orderBody = { items, customer: { name: 'Test User', phone: PHONE, email }, address: { label: 'Home', line: '12 Test Street, Tarabai Park', pincode: '416003' }, delivery: { date: tomorrow, slot, note: 'Call first' }, paymentMethod: 'cod', couponCode: 'SWEET50' };
r = await u('POST', '/api/orders', { ...orderBody, address: { ...orderBody.address, pincode: '999999' } }); ok(r.status === 400, 'order: undeliverable pincode rejected');
r = await u('POST', '/api/orders', { ...orderBody, delivery: { date: '2020-01-01', slot } }); ok(r.status === 400, 'order: past date rejected');
r = await u('POST', '/api/orders', { ...orderBody, paymentMethod: 'online' }); ok(r.status === 400, 'order: online rejected without razorpay keys');
r = await guest()('POST', '/api/orders', orderBody); ok(r.status === 401, 'order: needs login');
r = await u('POST', '/api/orders', orderBody); ok(r.status === 201, 'order placed', JSON.stringify(r.data).slice(0, 200));
const order = r.data.order;
ok(order.totals.total === quote.total, 'order total equals quote (server priced)', `${order.totals.total} vs ${quote.total}`);
ok(order.items[0].candle === 'Spiral Candles' && order.items[0].knife === 'Gold-Edge Knife' && order.items[0].message === 'Happy Birthday Aria', 'personalisation saved on item');
ok(order.items[1].kind === 'custom' && order.items[1].custom.shape === 'heart' && order.items[1].custom.topper === 'gold', 'custom cake spec saved');
ok(/^MD-\d{6}$/.test(order.orderNum) && order.status === 'Order Placed' && order.payment.status === 'cod', 'order number/status/payment');

r = await u('GET', '/api/orders'); ok(r.data.items.length === 1 && r.data.active?.orderNum === order.orderNum, 'my orders + active');
r = await u('GET', `/api/orders/${order.orderNum}`); ok(r.data.order.delivery.slot === slot, 'order detail');
r = await guest()('POST', '/api/auth/signup', { name: 'Other', identifier: `o${Date.now()}@t.com`, password: 'GoodPass123' });
const other = client(); await other('POST', '/api/auth/login', { identifier: r.data.user.email, password: 'GoodPass123' });
r = await other('GET', `/api/orders/${order.orderNum}`); ok(r.status === 404, "other user can't read my order");

console.log('upload');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
let fd = new FormData(); fd.append('photo', new Blob([png], { type: 'image/png' }), 'x.png');
r = await u('POST', '/api/uploads', fd); ok(r.status === 201 && /^\/uploads\/[a-f0-9]{32}\.png$/.test(r.data.url), 'upload png', JSON.stringify(r.data));
const photoUrl = r.data.url;
r = await anon('GET', photoUrl); ok(r.status === 200, 'uploaded file is served');
fd = new FormData(); fd.append('photo', new Blob([Buffer.from('<?php evil ?>')], { type: 'image/png' }), 'evil.png');
r = await u('POST', '/api/uploads', fd); ok(r.status === 400, 'fake image rejected');
r = await u('POST', '/api/orders', { ...orderBody, couponCode: undefined, items: [{ ...items[0], qty: 1, photoUrl }] }); ok(r.status === 201 && r.data.order.items[0].photoUrl === photoUrl, 'photo carried onto order');
const order2 = r.data.order;

console.log('cancel + lifecycle');
r = await u('POST', `/api/orders/${order2.orderNum}/cancel`); ok(r.data.order.status === 'Cancelled', 'customer can cancel early order');
r = await admin('POST', '/api/admin/auth/login', { email: 'owner@test.com', password: 'StrongPass123' }); ok(r.status === 200 && r.data.user.role === 'admin', 'admin login');
r = await u('GET', '/api/admin/dashboard'); ok(r.status === 401, 'customer session cannot open admin API');
r = await admin('GET', '/api/auth/me'); ok(r.status === 401, 'admin session is not a storefront session');
r = await admin('GET', '/api/admin/dashboard'); ok(r.status === 200, 'admin dashboard');
for (const st of ['Confirmed', 'Baking', 'Decorating', 'Packed', 'Out for Delivery', 'Delivered']) {
  r = await admin('PATCH', `/api/admin/orders/${order.orderNum}/status`, { status: st }); ok(r.status === 200 && r.data.order.status === st, `admin → ${st}`);
}
r = await u('POST', `/api/orders/${order.orderNum}/cancel`); ok(r.status === 400, "can't cancel delivered");
r = await u('GET', `/api/orders/${order.orderNum}`); ok(r.data.order.statusHistory.length === 7 && r.data.order.payment.status === 'paid' && r.data.order.pointsAwarded > 0, 'history, COD marked paid, points awarded');
r = await u('GET', '/api/me/rewards'); ok(r.data.points === r.data.history.reduce((s, h) => s + h.points, 0) && r.data.points > 0, 'rewards points', JSON.stringify(r.data).slice(0, 120));

console.log('reviews');
r = await u('POST', '/api/reviews', { orderNum: order2.orderNum, cakeId: cake._id, rating: 5, comment: 'Lovely cake!' }); ok(r.status === 400, 'cannot review undelivered order');
r = await u('POST', '/api/reviews', { orderNum: order.orderNum, cakeId: cake._id, rating: 5, comment: 'Absolutely lovely cake!' }); ok(r.status === 201, 'review after delivery');
r = await u('POST', '/api/reviews', { orderNum: order.orderNum, cakeId: cake._id, rating: 4, comment: 'again' }); ok(r.status === 409, 'duplicate review rejected');
const reviewId = (await u('GET', '/api/me/reviews')).data.items[0]._id;
r = await u('PUT', `/api/reviews/${reviewId}`, { rating: 4, comment: 'Edited: still lovely' }); ok(r.status === 200, 'edit review');
r = await anon('GET', `/api/cakes/${cake._id}`); ok(r.data.cake.rating === 4 && r.data.cake.reviewCount === 1, 'cake rating aggregated', JSON.stringify(r.data.cake).slice(0, 80));
r = await anon('GET', '/api/reviews/summary'); ok(r.data.count === 1 && r.data.avg === 4, 'review summary');
r = await anon('GET', '/api/reviews/featured'); ok(r.data.items.length === 1, 'featured reviews');
r = await anon('GET', `/api/cakes/${cake._id}/reviews`); ok(r.data.items.length === 1, 'cake reviews');

console.log('misc');
r = await anon('POST', '/api/newsletter', { email: 'sub@test.com' }); ok(r.status === 201, 'newsletter');
r = await anon('POST', '/api/contact', { name: 'Ann', email: 'ann@test.com', message: 'Hello there, a question' }); ok(r.status === 201, 'contact form');
r = await anon('GET', '/api/spin/prizes'); ok(r.data.enabled && r.data.segments.length >= 6 && r.data.segments.includes('Try Again') && r.data.segments.some(s => /OFF/.test(s)), 'spin wheel is built from the SPIN coupons', JSON.stringify(r.data));
r = await anon('GET', '/api/settings/public'); ok(r.data.spinEnabled === true, 'public settings say the wheel is running');
r = await u('POST', '/api/me/spin'); ok(r.status === 200 && r.data.index >= 0 && r.data.segments.length >= 6 && r.data.segments[r.data.index] === r.data.prize.label, 'spin');
const won = r.data.prize.code;
r = await u('POST', '/api/me/spin'); ok(r.status === 400, 'second spin rejected');
r = await anon('GET', '/api/stats/public'); ok(r.data.deliveredOrders === 1, 'public stats');
r = await anon('POST', '/api/auth/google', { credential: 'x'.repeat(40) }); ok(r.status === 404, 'Google sign-in is off until GOOGLE_CLIENT_ID is set');
r = await anon('GET', '/api/categories'); ok(r.data.items.length === 17, 'public categories');
r = await anon('GET', '/api/settings/public'); ok(r.data.taxRate === 5 && r.data.delivery.slots.length === 5 && r.data.builder.base['2'] === 1199, 'public settings');

console.log('small cakes are fixed packs');
const small = cakes.find(c => c.weightG === 300), sized = cakes.find(c => c.weightG === 1000);
r = await u('POST', '/api/cart/quote', { items: [{ kind: 'catalog', cakeId: small._id, weight: '1 kg', qty: 1 }] });
ok(r.status === 200 && r.data.lines[0].weight === '300 g' && r.data.lines[0].unitPrice === small.price, 'a 300 g box is sold as one 300 g pack at its own price', JSON.stringify(r.data.lines[0]));
r = await u('POST', '/api/cart/quote', { items: [{ kind: 'catalog', cakeId: small._id, weight: '3 kg', qty: 1 }] });
ok(r.data.lines[0].unitPrice === small.price && r.data.lines[0].weight === '300 g', 'a fixed pack cannot be scaled up by sending another weight');
r = await u('POST', '/api/cart/quote', { items: [{ kind: 'catalog', cakeId: sized._id, weight: '500 g', qty: 1 }] });
ok(r.data.lines[0].weight === '500 g' && r.data.lines[0].unitPrice < sized.price, 'a 1 kg cake can still be bought in 500 g');

console.log('reward points');
r = await u('GET', '/api/me/rewards'); const before = r.data;
ok(before.points > 0 && before.rules.pointValue > 0 && before.history.every(h => h.type === 'earned'), 'points balance and rules');
const ptsBody = { ...orderBody, items: [items[0]], couponCode: undefined, usePoints: true };
r = await u('POST', '/api/cart/quote', { items: [items[0]], pincode: '416003', usePoints: true });
ok(r.data.points.applied && r.data.totals.pointsDiscount === r.data.points.discount && r.data.points.discount > 0, 'quote: points applied', JSON.stringify(r.data.points));
const ptsQuote = r.data.totals;
r = await u('POST', '/api/cart/quote', { items: [items[0]], pincode: '416003' });
ok(r.data.points.canUse > 0 && r.data.totals.pointsDiscount === 0 && r.data.totals.total === ptsQuote.total + ptsQuote.pointsDiscount, 'quote: points are only used when switched on');
r = await u('POST', '/api/orders', ptsBody); ok(r.status === 201 && r.data.order.pointsRedeemed > 0 && r.data.order.totals.pointsDiscount === ptsQuote.pointsDiscount && r.data.order.totals.total === ptsQuote.total, 'order uses points', JSON.stringify(r.data).slice(0, 200));
const ptsOrder = r.data.order;
r = await u('GET', '/api/me/rewards'); ok(r.data.points === before.points - ptsOrder.pointsRedeemed && r.data.history.some(h => h.type === 'redeemed' && h.points === ptsOrder.pointsRedeemed), 'points balance goes down');
r = await u('POST', '/api/cart/quote', { items: [items[0]], pincode: '416003', usePoints: true }); ok(r.data.totals.pointsDiscount <= Math.floor(r.data.points.balance * before.rules.pointValue), 'cannot spend more points than the balance');
r = await u('POST', `/api/orders/${ptsOrder.orderNum}/cancel`); ok(r.status === 200, 'cancel the order that used points');
r = await u('GET', '/api/me/rewards'); ok(r.data.points === before.points, 'cancelled order gives the points back');

console.log('spin prizes stay usable');
const adminCoupons = (await admin('GET', '/api/admin/coupons')).data.items.filter(c => c.code.startsWith('SPIN'));
for (const c of adminCoupons) await admin('PATCH', `/api/admin/coupons/${c._id}`, { active: false });
r = await anon('GET', '/api/spin/prizes'); ok(r.data.enabled === false && r.data.segments.length === 0, 'switch all SPIN coupons off → wheel stops');
r = await anon('GET', '/api/settings/public'); ok(r.data.spinEnabled === false, 'public settings hide the wheel');
const fresh = client(); await fresh('POST', '/api/auth/signup', { name: 'Fresh Spinner', identifier: `spin${Date.now()}@test.com`, password: 'GoodPass123' });
r = await fresh('POST', '/api/me/spin'); ok(r.status === 400, 'no spin while the wheel is off');
if (won) { r = await u('POST', '/api/cart/quote', { items: [{ kind: 'catalog', cakeId: sized._id, weight: '1 kg', qty: 1 }], couponCode: won }); ok(!/not valid/.test(r.data.couponError || ''), 'a prize already won still works after the coupon is switched off', JSON.stringify(r.data.couponError)); }
for (const c of adminCoupons) await admin('PATCH', `/api/admin/coupons/${c._id}`, { active: true });
r = await anon('GET', '/api/spin/prizes'); ok(r.data.enabled === true, 'switch them on again → wheel is back');

process.exit(summary() ? 1 : 0);
