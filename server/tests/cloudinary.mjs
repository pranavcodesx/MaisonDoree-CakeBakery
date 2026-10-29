// Photo storage: checks the Cloudinary upload request (signature, fields) without calling the real service.
import crypto from 'node:crypto';
process.env.JWT_SECRET ||= 'test-only-secret-0123456789abcdef';
process.env.CLOUDINARY_CLOUD_NAME = 'democloud'; process.env.CLOUDINARY_API_KEY = '12345'; process.env.CLOUDINARY_API_SECRET = 'abcd';
let pass = 0, fail = 0;
const ok = (c, n) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗ FAIL', n); };

const { signParams, storeImage, cloudinaryEnabled } = await import('../src/services/storage.js');
ok(cloudinaryEnabled(), 'Cloudinary mode switches on when the three CLOUDINARY_* settings exist');
ok(signParams({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }, 'abcd') === 'bfd09f95f331f558cbd1320e67aa8d488770583e', "signature matches the example in Cloudinary's documentation");

let seen;
globalThis.fetch = async (url, init) => { seen = { url, form: init.body }; return new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/democloud/image/upload/v1/maison-doree/abc.jpg' }), { status: 200, headers: { 'content-type': 'application/json' } }); };
const url = await storeImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), 'jpg', '/tmp');
ok(seen.url === 'https://api.cloudinary.com/v1_1/democloud/image/upload', 'uploads to the right Cloudinary endpoint');
ok(url === 'https://res.cloudinary.com/democloud/image/upload/v1/maison-doree/abc.jpg', 'returns the https address Cloudinary gives back');
const f = seen.form; const ts = f.get('timestamp');
ok(f.get('api_key') === '12345' && f.get('folder') === 'maison-doree' && f.get('file') instanceof Blob, 'sends api_key, folder and the file');
ok(f.get('signature') === crypto.createHash('sha1').update(`folder=maison-doree&timestamp=${ts}abcd`).digest('hex'), 'signature covers folder + timestamp');
ok(![...f.entries()].some(([, v]) => typeof v === 'string' && v.includes('abcd')), 'the API secret itself is never sent');

globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Invalid' } }), { status: 401, headers: { 'content-type': 'application/json' } });
let err; try { await storeImage(Buffer.from([1, 2, 3]), 'png', '/tmp'); } catch (e) { err = e; }
ok(err?.status === 502 && !/Invalid|abcd/.test(err.message), 'a Cloudinary failure becomes a friendly 502 without leaking details');
globalThis.fetch = async () => { throw new Error('network down'); };
err = null; try { await storeImage(Buffer.from([1, 2, 3]), 'png', '/tmp'); } catch (e) { err = e; }
ok(err?.status === 502, 'a network failure becomes a friendly 502');

const { cartItemSchema } = await import('../src/services/checkout.js');
const base = { kind: 'catalog', cakeId: '64b7f8f8f8f8f8f8f8f8f8f8', weight: '1 kg', qty: 1 };
ok(cartItemSchema.safeParse({ ...base, photoUrl: 'https://res.cloudinary.com/democloud/image/upload/v1/maison-doree/abc.jpg' }).success, 'cart accepts a Cloudinary photo address');
ok(!cartItemSchema.safeParse({ ...base, photoUrl: 'https://evil.example/x.jpg' }).success, 'cart rejects photo addresses from other sites');
ok(cartItemSchema.safeParse({ ...base, photoUrl: '/uploads/' + 'a'.repeat(32) + '.png' }).success, 'cart still accepts local uploads');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
