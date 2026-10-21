import { createHash, randomBytes } from 'node:crypto';
import { pagesForRole } from './permissions.js';
import { get, run, now } from './store.js';
import { hashPassword, verifyPassword } from './passwords.js';

const isProd = process.env.NODE_ENV === 'production';
const sessionCookie = isProd ? '__Host-ff-session' : 'ff-session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const bootstrapAdmins = new Set(
  (process.env.SUPER_ADMIN_EMAILS || process.env.SUPABASE_SUPER_ADMIN_EMAILS || '')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
);

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/',
};

// Compared against when the email is unknown, so a wrong email takes as long
// as a wrong password and response timing doesn't reveal which accounts exist.
const dummyHash = await hashPassword(randomBytes(16).toString('hex'));

const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

function readCookies(req) {
  const cookies = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    try { cookies[name] = decodeURIComponent(part.slice(separator + 1)); } catch { /* ignore malformed cookies */ }
  }
  return cookies;
}

async function startSession(res, userId) {
  const token = randomBytes(32).toString('base64url');
  await run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    tokenHash(token), userId, Date.now() + SESSION_MS);
  res.cookie(sessionCookie, token, { ...cookieOptions, maxAge: SESSION_MS });
}

/** Sign a user out everywhere, e.g. after a password change or suspension. */
export async function endSessions(userId) {
  await run('DELETE FROM sessions WHERE user_id = ?', userId);
}

export async function login(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = await get('SELECT * FROM users WHERE email = ?', email);
  const valid = await verifyPassword(password, user?.password_hash ?? dummyHash);
  if (!user || !valid) return res.status(401).json({ error: 'Invalid email or password' });
  if (user.suspended) return res.status(403).json({ error: 'This account is suspended' });

  await run('UPDATE users SET last_sign_in_at = ? WHERE id = ?', now(), user.id);
  await run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
  await startSession(res, user.id);
  return res.json({ user: await publicUser(user) });
}

export async function logout(req, res) {
  const token = readCookies(req)[sessionCookie];
  if (token) await run('DELETE FROM sessions WHERE token_hash = ?', tokenHash(token));
  res.clearCookie(sessionCookie, cookieOptions);
  return res.status(204).end();
}

export async function updatePassword(req, res) {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (password.length < 12) return res.status(400).json({ error: 'Use a password with at least 12 characters' });

  await run('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    await hashPassword(password), req.user.id);
  // Any other signed-in browser keeps the old credentials' session; drop them all
  // and give this browser a fresh one.
  await endSessions(req.user.id);
  await startSession(res, req.user.id);
  return res.status(204).end();
}

export async function requireAuth(req, res, next) {
  try {
    const token = readCookies(req)[sessionCookie];
    const user = token && await get(`
      SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.suspended = 0`, tokenHash(token), Date.now());
    if (user) {
      req.user = user;
      return next();
    }
    res.clearCookie(sessionCookie, cookieOptions);
    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    return next(error);
  }
}

// Async because the page list is read from the permissions matrix. The browser
// uses it to draw the menu; the server still re-checks on every data request.
export async function publicUser(user) {
  const role = roleForUser(user);
  return {
    id: user.id,
    email: user.email,
    role,
    mustChangePassword: Boolean(user.must_change_password),
    pages: await pagesForRole(role),
  };
}

export function roleForUser(user) {
  if (bootstrapAdmins.has((user.email || '').toLowerCase())) return 'super_admin';
  return user.role || 'viewer';
}

export function requireSuperAdmin(req, res, next) {
  if (roleForUser(req.user) !== 'super_admin') return res.status(403).json({ error: 'Super administrator access required' });
  return next();
}
