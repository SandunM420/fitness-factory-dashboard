import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { endSessions, requireSuperAdmin, roleForUser } from './auth.js';
import { EDITABLE_ROLES, PAGES, getMatrix, saveRole } from './permissions.js';
import { all, get, run } from './store.js';
import { hashPassword, temporaryPassword } from './passwords.js';

const router = Router();
const assignableRoles = new Set(['viewer', 'manager', 'admin']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const findUser = (id) => get('SELECT * FROM users WHERE id = ?', id);

router.use(requireSuperAdmin);

router.get('/users', wrap(async (_req, res) => {
  const users = await all('SELECT * FROM users ORDER BY email');
  return res.json({ users: users.map(toPublicAdminUser) });
}));

// There is no email service: the admin is shown a one-time password to pass on,
// and the user must replace it on first sign-in.
router.post('/users/invite', wrap(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const role = req.body?.role;
  if (!emailPattern.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!assignableRoles.has(role)) return res.status(400).json({ error: 'Invalid role' });
  if (await get('SELECT 1 FROM users WHERE email = ?', email)) {
    return res.status(400).json({ error: 'A user with that email already exists' });
  }

  const tempPassword = temporaryPassword();
  const id = randomUUID();
  await run('INSERT INTO users (id, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)',
    id, email, await hashPassword(tempPassword), role);
  return res.status(201).json({ user: toPublicAdminUser(await findUser(id)), tempPassword });
}));

router.patch('/users/:id/role', wrap(async (req, res) => {
  const role = req.body?.role;
  if (!assignableRoles.has(role)) return res.status(400).json({ error: 'Invalid role' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role' });
  if (!(await findUser(req.params.id))) return res.status(404).json({ error: 'User not found' });

  await run('UPDATE users SET role = ? WHERE id = ?', role, req.params.id);
  return res.json({ user: toPublicAdminUser(await findUser(req.params.id)) });
}));

router.patch('/users/:id/status', wrap(async (req, res) => {
  const suspended = req.body?.suspended;
  if (typeof suspended !== 'boolean') return res.status(400).json({ error: 'Suspended must be true or false' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot suspend your own account' });
  if (!(await findUser(req.params.id))) return res.status(404).json({ error: 'User not found' });

  await run('UPDATE users SET suspended = ? WHERE id = ?', suspended ? 1 : 0, req.params.id);
  if (suspended) await endSessions(req.params.id);
  return res.json({ user: toPublicAdminUser(await findUser(req.params.id)) });
}));

router.post('/users/:id/password-reset', wrap(async (req, res) => {
  if (!(await findUser(req.params.id))) return res.status(404).json({ error: 'User not found' });
  const tempPassword = temporaryPassword();
  await run('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
    await hashPassword(tempPassword), req.params.id);
  await endSessions(req.params.id);
  return res.json({ tempPassword });
}));

// Role -> page matrix. The page catalogue comes from the server so the browser
// cannot invent a page id, and super_admin is never listed as editable.
router.get('/permissions', wrap(async (_req, res) => {
  res.json({ pages: PAGES, roles: EDITABLE_ROLES, matrix: await getMatrix() });
}));

router.put('/permissions/:role', wrap(async (req, res) => {
  const { role } = req.params;
  if (!EDITABLE_ROLES.includes(role)) return res.status(400).json({ error: 'That role cannot be edited' });
  if (!Array.isArray(req.body?.pages)) return res.status(400).json({ error: 'Pages must be a list' });
  try {
    const pages = await saveRole(role, req.body.pages);
    return res.json({ role, pages });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}));

function toPublicAdminUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: roleForUser(user),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    mustChangePassword: Boolean(user.must_change_password),
    suspended: Boolean(user.suspended),
  };
}

export default router;
