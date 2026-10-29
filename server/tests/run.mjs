// `npm run test:api` — runs each suite on a fresh, throwaway database with its own server.
// Safety: it refuses to touch any database whose name does not end in "_test".
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/maison_doree_test';
const dbName = (() => { try { return new URL(uri).pathname.replace(/^\//, ''); } catch { return ''; } })();
if (!/_test$/.test(dbName)) {
  console.error(`Refusing to run: the test database name must end in "_test" (got "${dbName || 'none'}").\nSet TEST_MONGO_URI, e.g. mongodb://127.0.0.1:27017/maison_doree_test`);
  process.exit(1);
}
const PORT = '5099';
// the JWT secret is fixed on purpose: the tests must not depend on your own .env
const baseEnv = { ...process.env, MONGO_URI: uri, PORT, BASE: `http://localhost:${PORT}`, JWT_SECRET: 'test-only-secret-0123456789abcdef-0123456789', RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '', GOOGLE_CLIENT_ID: '', CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '' };
const wait = ms => new Promise(r => setTimeout(r, ms));

// A fake "Google": our own key pair, and a tiny server that publishes the public key the way Google does.
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-key-1';
const jwks = { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' }] };
const jwksServer = http.createServer((_q, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(jwks)); }).listen(5098);
const googleEnv = { GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com', GOOGLE_JWKS_URL: 'http://127.0.0.1:5098/jwks', GOOGLE_TEST_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }), GOOGLE_TEST_KID: KID };

async function resetDb(env) {
  await mongoose.connect(uri); await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  for (const args of [['src/scripts/seed.js'], ['src/scripts/createAdmin.js', 'Owner', 'owner@test.com', 'StrongPass123']]) {
    const r = spawnSync('node', args, { env, stdio: 'pipe' });
    if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
  }
}

let failed = 0;
console.log('\n=== cloudinary (no server needed) ===');
if (spawnSync('node', ['tests/cloudinary.mjs'], { env: baseEnv, stdio: 'inherit' }).status !== 0) failed++;
for (const [suite, extra] of [['user-flow', {}], ['admin-flow', {}], ['google-flow', googleEnv]]) {
  console.log(`\n=== ${suite} ===`);
  const env = { ...baseEnv, ...extra };
  await resetDb(env);
  const server = spawn('node', ['src/index.js'], { env, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 30 && !up; i++) { await wait(500); up = await fetch(`${env.BASE}/api/health`).then(r => r.ok).catch(() => false); }
  if (!up) { console.error('The test server did not start. Is MongoDB running?'); server.kill(); process.exit(1); }
  // async (not spawnSync) so this process can keep serving the fake-Google key file while the suite runs
  const code = await new Promise(resolve => spawn('node', [`tests/${suite}.mjs`], { env, stdio: 'inherit' }).on('exit', resolve));
  server.kill();
  if (code !== 0) failed++;
}
jwksServer.close();
console.log(failed ? `\n${failed} suite(s) FAILED` : '\nAll suites passed ✔');
process.exit(failed ? 1 : 0);
