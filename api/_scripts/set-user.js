// Create a user, or reset an existing user's password, from the command line.
// Needed for the very first super admin, before anyone can sign in to the Users page.
//
//   npm run set-user -- someone@example.com [viewer|manager|admin]
//
// Prints a one-time password; the user must choose a new one on first sign-in.
// Super admins are whoever is listed in SUPER_ADMIN_EMAILS, whatever role is stored.
// Writes to Turso when TURSO_DATABASE_URL is set in api/.env, otherwise to the local file.
import { randomUUID } from 'node:crypto';
import { get, run } from '../_src/store.js';
import { hashPassword, temporaryPassword } from '../_src/passwords.js';

const [email, role = 'viewer'] = process.argv.slice(2);
if (!email || !['viewer', 'manager', 'admin'].includes(role)) {
  console.error('Usage: npm run set-user -- <email> [viewer|manager|admin]');
  process.exit(1);
}

const password = temporaryPassword();
const hash = await hashPassword(password);
const existing = await get('SELECT id FROM users WHERE email = ?', email);

if (existing) {
  await run('UPDATE users SET password_hash = ?, must_change_password = 1, suspended = 0 WHERE id = ?', hash, existing.id);
  await run('DELETE FROM sessions WHERE user_id = ?', existing.id);
  console.log(`Password reset for ${email}`);
} else {
  await run('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
    randomUUID(), email.trim().toLowerCase(), hash, role);
  console.log(`Created ${email} (${role})`);
}
console.log(`One-time password: ${password}`);
