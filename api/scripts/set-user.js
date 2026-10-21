// Create a user, or reset an existing user's password, from the command line.
// Needed for the very first super admin, before anyone can sign in to the Users page.
//
//   npm run set-user -- someone@example.com [viewer|manager|admin]
//
// Prints a one-time password; the user must choose a new one on first sign-in.
// Super admins are whoever is listed in SUPER_ADMIN_EMAILS, whatever role is stored.
import { randomUUID } from 'node:crypto';
import { store } from '../src/store.js';
import { hashPassword, temporaryPassword } from '../src/passwords.js';

const [email, role = 'viewer'] = process.argv.slice(2);
if (!email || !['viewer', 'manager', 'admin'].includes(role)) {
  console.error('Usage: npm run set-user -- <email> [viewer|manager|admin]');
  process.exit(1);
}

const password = temporaryPassword();
const hash = await hashPassword(password);
const existing = store.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  store.prepare('UPDATE users SET password_hash = ?, must_change_password = 1, suspended = 0 WHERE id = ?').run(hash, existing.id);
  store.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  console.log(`Password reset for ${email}`);
} else {
  store.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), email.trim().toLowerCase(), hash, role);
  console.log(`Created ${email} (${role})`);
}
console.log(`One-time password: ${password}`);
