// Usage: npm run create-admin -- "Owner Name" owner@email.com "StrongPassword123"
// Run it again with the same email to RESET that admin's password.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { User } from '../models/User.js';

// PowerShell sometimes passes the "--" through to the script; ignore it.
let args = process.argv.slice(2).filter(a => a !== '--');
// No values given: on your own computer, create the default admin (admin@gmail.com / Admin123).
// On a live server (NODE_ENV=production) you must choose your own email and a strong password.
if (!args.length && process.env.NODE_ENV !== 'production') {
  args = ['Admin', 'admin@gmail.com', 'Admin123'];
  console.log('No values given, so creating the default admin for local use.\n⚠  Change this password before the site goes live (DEPLOY.md).');
}
const [name, rawEmail, password] = args;
const email = (rawEmail || '').trim().toLowerCase();

const problems = [];
if (args.length !== 3) problems.push(`I need exactly 3 values (name, email, password) but got ${args.length}.`);
if (!name || name.trim().length < 2) problems.push('The name is missing or too short.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push(`"${rawEmail}" does not look like an email address.`);
if (!password || password.length < 8) problems.push('The password must be at least 8 characters.');
if (problems.length) {
  console.error('\nCould not create the admin:\n - ' + problems.join('\n - '));
  console.error('\nExample:\n  npm run create-admin -- "Asha Patil" asha@mybakery.com "Password123"\n(Use letters and numbers in the password; symbols like & ^ % can break the command line.)');
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
const passwordHash = await bcrypt.hash(password, 12);
await User.updateOne({ email }, { $set: { name: name.trim(), role: 'admin', passwordHash }, $setOnInsert: { email } }, { upsert: true });
const check = await User.findOne({ email }).select('+passwordHash');
const ok = check && check.role === 'admin' && await bcrypt.compare(password, check.passwordHash);
console.log(ok ? `\n✔ Admin ready. Log in with:\n   email:    ${email}\n   password: (the one you just typed)\n   database: ${config.mongoUri.replace(/\/\/[^@]*@/, '//***@')}` : '\n✖ Something went wrong while saving the admin.');
await mongoose.disconnect();
process.exit(ok ? 0 : 1);
