// Role-based page access.
//
// The catalogue below is the SERVER's source of truth for which pages exist.
// web/src/pages/registry.jsx must use the same ids, but the server never trusts
// the browser: every data route checks the caller's role against this list.
//
// The role -> pages matrix is stored in the local store (role_permissions) so it
// survives restarts and can be edited from the Users page. A role with no saved
// row gets the DEFAULTS below, so access control never silently falls open.
import { store, now } from './store.js';

/** Every page a role can be granted. `group` only affects how the matrix is drawn. */
export const PAGES = [
  { id: 'dashboard', label: 'Dashboard', group: 'Dashboard' },
  { id: 'today', label: "Today's sales", group: 'Sales' },
  { id: 'items', label: 'Items & prices', group: 'Products', note: 'Shows cost prices and margins' },
  { id: 'stock', label: 'Stock by location', group: 'Products' },
  { id: 'webstock', label: 'Website stock', group: 'Products', note: 'Split POS stock into flavours' },
  { id: 'subproducts', label: 'Sub-products', group: 'Products', note: 'Flat list of every flavour created' },
  { id: 'flavours', label: 'Flavours', group: 'Products', note: 'Master flavour list' },
  { id: 'explorer', label: 'Data explorer', group: 'Data explorer', note: 'Raw access to every POS table' },
];

export const PAGE_IDS = PAGES.map((page) => page.id);

/** Roles whose access can be edited. super_admin is deliberately absent - it always gets everything. */
export const EDITABLE_ROLES = ['admin', 'manager', 'viewer'];

/** Applied when the matrix has never been saved, tiered by how sensitive each page is. */
export const DEFAULTS = {
  admin: ['dashboard', 'today', 'items', 'stock', 'webstock', 'subproducts', 'flavours'],
  manager: ['dashboard', 'today', 'stock', 'webstock', 'subproducts', 'flavours'],
  viewer: ['dashboard', 'today'],
};

/** Drop unknown ids so a renamed page can't linger as a stale grant. */
const clean = (pages) => PAGE_IDS.filter((id) => Array.isArray(pages) && pages.includes(id));

/** The whole matrix, as { admin: [...], manager: [...], viewer: [...] }. A local read, so no cache. */
export async function getMatrix() {
  const matrix = { ...DEFAULTS };
  for (const row of store.prepare('SELECT role, pages FROM role_permissions').all()) {
    if (EDITABLE_ROLES.includes(row.role)) matrix[row.role] = clean(JSON.parse(row.pages));
  }
  return matrix;
}

export async function saveRole(role, pages) {
  if (!EDITABLE_ROLES.includes(role)) throw new Error(`Cannot edit the ${role} role`);
  const next = clean(pages);
  store.prepare(`
    INSERT INTO role_permissions (role, pages, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (role) DO UPDATE SET pages = excluded.pages, updated_at = excluded.updated_at`)
    .run(role, JSON.stringify(next), now());
  return next;
}

/** Page ids a role may open. super_admin always gets every page. */
export async function pagesForRole(role) {
  if (role === 'super_admin') return [...PAGE_IDS];
  const matrix = await getMatrix();
  return matrix[role] ?? [];
}

export async function canAccessPage(role, pageId) {
  return (await pagesForRole(role)).includes(pageId);
}
