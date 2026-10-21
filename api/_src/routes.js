import { Router } from 'express';
import { getPool, sql } from './db.js';
import { metrics } from './metrics.js';
import { login, logout, publicUser, requireAuth, roleForUser, updatePassword } from './auth.js';
import adminRoutes from './admin.js';
import catalogRoutes from './catalog.js';
import { canAccessPage, pagesForRole } from './permissions.js';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Tables that must never be exposed through the explorer (credentials, permissions).
const BLOCKED_TABLES = new Set(['dbo.users', 'dbo.userpermissions']);
const isBlocked = (schema, table) => BLOCKED_TABLES.has(`${schema}.${table}`.toLowerCase());

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.get('/health', wrap(async (_req, res) => {
  const pool = await getPool();
  await pool.request().query('SELECT 1');
  res.json({ ok: true });
}));

// Authentication is handled server-side. The session token is kept in an HttpOnly
// cookie and is never exposed to the React application.
router.post('/auth/login', wrap(login));
router.post('/auth/logout', wrap(logout));
router.get('/auth/session', requireAuth, wrap(async (req, res) => res.json({ user: await publicUser(req.user) })));
router.post('/auth/password', requireAuth, wrap(updatePassword));

// Everything below this line contains business data and requires a valid user.
router.use(requireAuth);
router.use('/admin', adminRoutes);

// Page access is checked on the server for every data route, so hiding a menu
// entry in the browser is never the only thing standing between a role and the data.
// Not built on wrap(): wrap only forwards (req, res), and middleware needs next.
// Accepts several page ids: some endpoints back more than one page.
const requirePage = (...pageIds) => (req, res, next) => {
  pagesForRole(roleForUser(req.user))
    .then((allowed) => pageIds.some((id) => allowed.includes(id))
      ? next()
      : res.status(403).json({ error: 'You do not have access to this page' }))
    .catch(next);
};

// Mounted after requirePage is defined - a const is not hoisted.
router.use('/catalog', requirePage('webstock', 'subproducts', 'flavours'), catalogRoutes);

// List metric definitions (without SQL), limited to pages the caller may open.
router.get('/metrics', wrap(async (req, res) => {
  const allowed = new Set(await pagesForRole(roleForUser(req.user)));
  res.json(metrics
    .filter((m) => !m.hidden && allowed.has(m.page))
    .map(({ sql: _omit, ...meta }) => meta));
}));

router.get('/metrics/:id', wrap(async (req, res) => {
  const metric = metrics.find((m) => m.id === req.params.id);
  if (!metric) return res.status(404).json({ error: 'Unknown metric' });
  if (!(await canAccessPage(roleForUser(req.user), metric.page))) {
    return res.status(403).json({ error: 'You do not have access to this page' });
  }

  const request = (await getPool()).request();
  for (const name of metric.params ?? []) {
    const handler = PARAMS[name];
    const raw = req.query[name];
    const error = handler(request, typeof raw === 'string' ? raw.trim() : raw === undefined ? '' : null);
    if (error) return res.status(400).json({ error: `Invalid ${name}: ${error}` });
  }

  const result = await request.query(metric.sql);
  res.json({ rows: result.recordset });
}));

// Every query parameter a metric may accept. Each handler validates the raw
// string and binds typed SQL inputs; it returns an error message if invalid.
const PARAMS = {
  from: (request, raw) => dateParam(request, 'from', raw),
  to: (request, raw) => dateParam(request, 'to', raw),
  // A calendar year, bound as @yearStart / @yearEnd (exclusive) so date indexes can be used.
  year: (request, raw) => {
    const year = raw ? Number(raw) : new Date().getFullYear();
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return 'expected a year like 2025';
    request.input('yearStart', sql.Date, new Date(Date.UTC(year, 0, 1)));
    request.input('yearEnd', sql.Date, new Date(Date.UTC(year + 1, 0, 1)));
  },
  month: (request, raw) => {
    const month = raw ? Number(raw) : 0;
    if (!Number.isInteger(month) || month < 0 || month > 12) return 'expected 0 for all months or a month from 1 to 12';
    request.input('month', sql.Int, month);
  },
  rankBy: (request, raw) => {
    const value = raw || 'qty';
    if (!['qty', 'revenue'].includes(value)) return "expected 'qty' or 'revenue'";
    request.input('rankBy', sql.VarChar(10), value);
  },
  // A single day (YYYY-MM-DD); empty means "today" in Sri Lanka time, resolved in SQL.
  date: (request, raw) => dateParam(request, 'date', raw),
  shop: (request, raw) => {
    const value = raw || 'all';
    if (!SHOPS.includes(value)) return `expected one of ${SHOPS.join(', ')}`;
    request.input('shop', sql.VarChar(30), value);
  },
  category: (request, raw) => {
    if (!raw || raw.length > 100) return 'expected a category name';
    request.input('category', sql.NVarChar(100), raw);
  },
  top: (request, raw) => {
    const top = raw ? Number(raw) : 1;
    if (!Number.isInteger(top) || top < 1 || top > 10) return 'expected a number from 1 to 10';
    request.input('top', sql.Int, top);
  },
};

// Branch codes as stored in dbo.Invoice.branch ('all' = no filter).
const SHOPS = ['all', 'HCM', 'One_Galle_Face'];

function dateParam(request, name, raw) {
  if (raw === null || (raw && !DATE_RE.test(raw))) return 'expected YYYY-MM-DD';
  request.input(name, sql.Date, raw ? new Date(raw) : null);
}

// Schema explorer: tables and their columns.
router.get('/schema', requirePage('explorer'), wrap(async (_req, res) => {
  const result = await (await getPool()).request().query(`
    SELECT c.TABLE_SCHEMA AS [schema], c.TABLE_NAME AS [table], c.COLUMN_NAME AS [column],
           c.DATA_TYPE AS [type], c.IS_NULLABLE AS [nullable]
    FROM INFORMATION_SCHEMA.COLUMNS c
    JOIN INFORMATION_SCHEMA.TABLES t
      ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
    WHERE t.TABLE_TYPE IN ('BASE TABLE', 'VIEW')
    ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION`);

  const tables = new Map();
  for (const r of result.recordset) {
    if (isBlocked(r.schema, r.table)) continue;
    const key = `${r.schema}.${r.table}`;
    if (!tables.has(key)) tables.set(key, { schema: r.schema, table: r.table, columns: [] });
    tables.get(key).columns.push({ name: r.column, type: r.type, nullable: r.nullable === 'YES' });
  }
  res.json([...tables.values()]);
}));

// Binary/spatial columns (e.g. Stock.pics images) are not sent to the browser.
const HIDDEN_TYPES = new Set(['image', 'varbinary', 'binary', 'timestamp', 'geography', 'geometry', 'hierarchyid']);
// Types SQL Server can't sort by.
const UNSORTABLE_TYPES = new Set(['text', 'ntext', 'xml', ...HIDDEN_TYPES]);
const quote = (id) => `[${id.replace(/]/g, ']]')}]`;

// Page through all rows of a table. The table and column names come from the
// catalog, never from user input, so identifiers can't be injected.
router.get('/tables/:schema/:table/rows', requirePage('explorer'), wrap(async (req, res) => {
  const { schema, table } = req.params;
  if (isBlocked(schema, table)) return res.status(404).json({ error: 'Unknown table' });
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 100, 1), 1000);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pool = await getPool();

  const meta = await pool.request()
    .input('schema', sql.NVarChar, schema)
    .input('table', sql.NVarChar, table)
    .query(`
      SELECT c.COLUMN_NAME AS name, c.DATA_TYPE AS type,
             CASE WHEN k.COLUMN_NAME IS NULL THEN 0 ELSE 1 END AS isPk, k.ORDINAL_POSITION AS pkOrder
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        ON tc.TABLE_SCHEMA = c.TABLE_SCHEMA AND tc.TABLE_NAME = c.TABLE_NAME AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
        ON k.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND k.TABLE_SCHEMA = c.TABLE_SCHEMA
       AND k.TABLE_NAME = c.TABLE_NAME AND k.COLUMN_NAME = c.COLUMN_NAME
      WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table
      ORDER BY c.ORDINAL_POSITION`);
  const columns = meta.recordset;
  if (!columns.length) return res.status(404).json({ error: 'Unknown table' });

  const visible = columns.filter((c) => !HIDDEN_TYPES.has(c.type));
  const hidden = columns.filter((c) => HIDDEN_TYPES.has(c.type)).map((c) => c.name);

  // Stable ordering so pages don't overlap: primary key if there is one, otherwise every sortable column.
  const pk = columns.filter((c) => c.isPk).sort((a, b) => a.pkOrder - b.pkOrder);
  const orderCols = pk.length ? pk : columns.filter((c) => !UNSORTABLE_TYPES.has(c.type));
  const orderBy = orderCols.length ? orderCols.map((c) => quote(c.name)).join(', ') : '(SELECT NULL)';

  const from = `${quote(schema)}.${quote(table)}`;
  const selectList = visible.map((c) => quote(c.name)).join(', ');
  const [countResult, rowsResult] = await Promise.all([
    pool.request().query(`SELECT COUNT_BIG(*) AS total FROM ${from}`),
    pool.request()
      .input('start', sql.BigInt, (page - 1) * pageSize + 1)
      .input('end', sql.BigInt, page * pageSize)
      .query(`
        SELECT ${selectList} FROM (
          SELECT ${selectList}, ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS __rn FROM ${from}
        ) x WHERE __rn BETWEEN @start AND @end ORDER BY __rn`),
  ]);

  res.json({
    rows: rowsResult.recordset,
    total: Number(countResult.recordset[0].total),
    page,
    pageSize,
    hiddenColumns: hidden,
  });
}));

export default router;
