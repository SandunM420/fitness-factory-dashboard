// Website stock: flavours and per-location variant quantities.
//
// The POS (SQL Server) is read-only and has no concept of flavours, so the
// quantities here live in the app database and are the manager's manual split
// of the POS per-location total. Nothing in this file ever writes to SQL Server.
import { Router } from 'express';
import { getPool, sql } from './db.js';
import { all, get, run, toRow, now } from './store.js';

const router = Router();

// dbo.Stock column names, and the only values product_variants.location accepts.
const LOCATIONS = ['HCM', 'One_Galle_Face', 'Hill_Street', 'Gym_Store'];
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// SQLite constraint failures worth translating into something a manager can act on.
function friendly(error) {
  const message = String(error?.message ?? error);
  if (message.includes('UNIQUE constraint failed') || message.includes('PRIMARY KEY')) return 'That already exists';
  if (message.includes('FOREIGN KEY constraint failed')) return 'That flavour is still used by a product';
  if (message.includes('CHECK constraint failed')) return 'That value is not allowed';
  return message;
}

/** Run a write; on a constraint failure answer 400 with a readable message instead of a 500. */
async function attempt(res, fn) {
  try {
    return await fn();
  } catch (error) {
    res.status(400).json({ error: friendly(error) });
    return undefined;
  }
}

const flavourById = async (id) => toRow(await get('SELECT * FROM flavours WHERE id = ?', id));

/* ------------------------------------------------------------------ flavours */

router.get('/flavours', wrap(async (_req, res) => {
  const flavours = (await all('SELECT * FROM flavours ORDER BY sort_order, name')).map(toRow);
  return res.json({ flavours });
}));

router.post('/flavours', wrap(async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const code = String(req.body?.code ?? '').trim().toUpperCase();
  if (!name) return res.status(400).json({ error: 'Enter a flavour name' });
  if (!/^[A-Z0-9]{1,10}$/.test(code)) return res.status(400).json({ error: 'Code must be 1-10 letters or numbers' });

  const result = await attempt(res, () => run('INSERT INTO flavours (name, code, sort_order) VALUES (?, ?, ?)',
    name, code, Number(req.body?.sort_order) || 0));
  if (!result) return;
  return res.status(201).json({ flavour: await flavourById(result.lastInsertRowid) });
}));

router.patch('/flavours/:id', wrap(async (req, res) => {
  const current = await flavourById(req.params.id);
  if (!current) return res.status(404).json({ error: 'Flavour not found' });

  const patch = {};
  if (req.body?.name !== undefined) {
    patch.name = String(req.body.name).trim();
    if (!patch.name) return res.status(400).json({ error: 'Enter a flavour name' });
  }
  // The code is deliberately NOT editable. Sub-product codes are built from it
  // (PRT060-CHOC), so changing it would silently rename every sub-product using
  // this flavour - including any already published to the website.
  if (req.body?.code !== undefined && String(req.body.code).trim().toUpperCase() !== current.code) {
    return res.status(400).json({ error: 'A flavour code cannot be changed once created' });
  }
  if (req.body?.active !== undefined) patch.active = req.body.active ? 1 : 0;
  if (req.body?.sort_order !== undefined) patch.sort_order = Number(req.body.sort_order) || 0;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update' });

  // Column names come from the fixed keys above, never from the request.
  const columns = Object.keys(patch);
  const result = await attempt(res, () => run(`UPDATE flavours SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    ...columns.map((c) => patch[c]), req.params.id));
  if (!result) return;
  return res.json({ flavour: await flavourById(req.params.id) });
}));

// A flavour in use cannot be deleted - the foreign key refuses it, and that is
// deliberate: deleting one would orphan every sub-product built on it. We count
// the users first so the refusal says WHY and what to do instead.
router.delete('/flavours/:id', wrap(async (req, res) => {
  const flavour = await flavourById(req.params.id);
  const { count } = await get('SELECT COUNT(*) AS count FROM product_variants WHERE flavour_id = ?', req.params.id);

  if (count > 0) {
    const name = flavour?.name ?? 'That flavour';
    return res.status(409).json({
      error: `${name} is used by ${count} sub-product${count === 1 ? '' : 's'}. `
        + 'Delete those first, or untick Active to hide it from the dropdown without losing them.',
    });
  }

  if (!(await attempt(res, () => run('DELETE FROM flavours WHERE id = ?', req.params.id)))) return;
  return res.status(204).end();
}));

/* ------------------------------------------------------------------ products */

// One row per product per location. The location columns of dbo.Stock are
// discovered by matching sys.columns against dbo.Loca, so a shop added to the
// POS appears here on its own. Column names come from the catalog and go
// through QUOTENAME - never from user input.
const PRODUCTS_SQL = `
  DECLARE @cols nvarchar(max), @sql nvarchar(max);

  -- FOR XML PATH rather than STRING_AGG: the database runs at an older compatibility level.
  SELECT @cols = STUFF((
           SELECT ', (N''' + REPLACE(c.name, '''', '''''') + ''', ISNULL(s.' + QUOTENAME(c.name) + ', 0))'
           FROM sys.columns c
           WHERE c.object_id = OBJECT_ID('dbo.Stock')
             AND EXISTS (SELECT 1 FROM dbo.Loca l WHERE RTRIM(l.LocaName) = c.name)
           ORDER BY c.name
           FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 2, '');

  IF @cols IS NULL
    SELECT TOP 0 CAST(NULL AS varchar(40)) AS itemCode, CAST(NULL AS varchar(200)) AS itemName,
                 CAST(NULL AS varchar(100)) AS category, CAST(NULL AS float) AS price, CAST(NULL AS float) AS cost,
                 CAST(NULL AS nvarchar(128)) AS location, CAST(NULL AS float) AS qty;
  ELSE
  BEGIN
    SET @sql = N'
      SELECT RTRIM(s.itcode) AS itemCode,
             RTRIM(s.itname) AS itemName,
             COALESCE(NULLIF(RTRIM(s.cdes), ''''), ''Uncategorised'') AS category,
             s.uprice AS price,
             s.cprice AS cost,
             v.location,
             v.qty
      FROM dbo.Stock s
      CROSS APPLY (VALUES ' + @cols + ') v(location, qty)';
    EXEC sp_executesql @sql;
  END`;

/**
 * POS products merged with their flavour rows.
 * `assigned` is what the manager has split into flavours at each location;
 * `unassigned` is POS minus assigned - the number that drives the warning.
 */
router.get('/products', wrap(async (req, res) => {
  // The POS and the app database are independent, so ask both at once.
  const [posRows, variants, flavours] = await Promise.all([
    getPool().then((pool) => pool.request().query(PRODUCTS_SQL)).then((r) => r.recordset),
    all('SELECT * FROM product_variants').then((rows) => rows.map(toRow)),
    all('SELECT * FROM flavours').then((rows) => rows.map(toRow)),
  ]);

  const flavourMap = new Map(flavours.map((f) => [f.id, f]));
  const byItem = new Map();
  const locations = new Set();

  for (const row of posRows) {
    locations.add(row.location);
    if (!byItem.has(row.itemCode)) {
      byItem.set(row.itemCode, {
        itemCode: row.itemCode,
        itemName: row.itemName,
        category: row.category,
        price: row.price,
        cost: row.cost,
        pos: {},
        variants: [],
      });
    }
    byItem.get(row.itemCode).pos[row.location] = Number(row.qty) || 0;
  }

  for (const variant of variants) {
    const product = byItem.get(variant.item_code);
    if (!product) continue; // flavour left behind by a product removed from the POS
    const flavour = flavourMap.get(variant.flavour_id);
    product.variants.push({
      key: `${variant.item_code}|${variant.flavour_id}|${variant.location}`,
      itemCode: variant.item_code,
      flavourId: variant.flavour_id,
      flavour: flavour?.name ?? 'Unknown',
      variantCode: flavour ? `${variant.item_code}-${flavour.code}` : variant.item_code,
      location: variant.location,
      qty: variant.qty,
      price: variant.price,                       // null = inherits the POS price
      effectivePrice: variant.price ?? product.price,
      visibleOnWeb: variant.visible_on_web,
      active: variant.active,
    });
  }

  // assigned / unassigned per location, so the page can flag what does not add up.
  for (const product of byItem.values()) {
    product.assigned = {};
    product.unassigned = {};
    for (const location of locations) {
      const assigned = product.variants
        .filter((v) => v.location === location)
        .reduce((sum, v) => sum + v.qty, 0);
      product.assigned[location] = assigned;
      product.unassigned[location] = (product.pos[location] ?? 0) - assigned;
    }
  }

  const products = [...byItem.values()].sort((a, b) => a.itemName.localeCompare(b.itemName));
  res.json({
    products,
    locations: [...locations].sort(),
    categories: [...new Set(products.map((p) => p.category))].sort(),
    flavours: flavours.filter((f) => f.active),
  });
}));

/* ------------------------------------------------------------------ variants */

// How many units the POS holds of this product at this location, and how many
// are already split into flavours. A sub-product can never claim more than the
// POS actually has - the split has to add up.
async function capacity(item_code, location, exceptFlavourId) {
  // location is validated against LOCATIONS before this runs, so it is one of
  // four known dbo.Stock column names - never anything a caller supplied.
  if (!LOCATIONS.includes(location)) throw new Error('Unknown location');
  const pool = await getPool();
  const result = await pool.request()
    .input('code', sql.VarChar(40), item_code)
    .query(`SELECT ISNULL([${location}], 0) AS qty FROM dbo.Stock WHERE RTRIM(itcode) = @code`);
  const pos = Number(result.recordset[0]?.qty ?? 0);

  const { assigned } = await get(`
    SELECT COALESCE(SUM(qty), 0) AS assigned FROM product_variants
    WHERE item_code = ? AND location = ? AND flavour_id IS NOT ?`, item_code, location, exceptFlavourId);

  return { pos, assigned, free: pos - assigned };
}

// price is optional: null/blank means the sub-product inherits the POS price.
function priceValue(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const price = Number(raw);
  if (!Number.isFinite(price) || price < 0) return undefined; // undefined = invalid
  return price;
}

const variantByKey = async ({ item_code, flavour_id, location }) => toRow(await get(
  'SELECT * FROM product_variants WHERE item_code = ? AND flavour_id = ? AND location = ?',
  item_code, flavour_id, location,
));

router.post('/variants', wrap(async (req, res) => {
  const item_code = String(req.body?.item_code ?? '').trim();
  const flavour_id = Number(req.body?.flavour_id);
  const location = String(req.body?.location ?? '').trim();
  const qty = Number(req.body?.qty ?? 0);

  if (!item_code) return res.status(400).json({ error: 'Missing product' });
  if (!Number.isInteger(flavour_id)) return res.status(400).json({ error: 'Pick a flavour' });
  if (!LOCATIONS.includes(location)) return res.status(400).json({ error: 'Pick a location' });
  if (!Number.isInteger(qty) || qty < 0) return res.status(400).json({ error: 'Quantity must be 0 or more' });
  const price = priceValue(req.body?.price);
  if (price === undefined) return res.status(400).json({ error: 'Price must be 0 or more' });

  const room = await capacity(item_code, location, null);
  if (qty > room.free) {
    return res.status(400).json({
      error: room.free <= 0
        ? `All ${room.pos} in stock at ${location.replace(/_/g, ' ')} are already assigned to flavours.`
        : `Only ${room.free} left to assign at ${location.replace(/_/g, ' ')} (${room.pos} in POS, ${room.assigned} already assigned).`,
    });
  }

  if (await variantByKey({ item_code, flavour_id, location })) {
    return res.status(400).json({ error: 'That flavour already exists for this product and location' });
  }
  const visible = req.body?.visible_on_web === undefined ? true : Boolean(req.body.visible_on_web);
  const result = await attempt(res, () => run(`
    INSERT INTO product_variants (item_code, flavour_id, location, qty, price, visible_on_web)
    VALUES (?, ?, ?, ?, ?, ?)`, item_code, flavour_id, location, qty, price, visible ? 1 : 0));
  if (!result) return;
  return res.status(201).json({ variant: await variantByKey({ item_code, flavour_id, location }) });
}));

// A variant is addressed by its primary key (item_code, flavour_id, location),
// so the three parts come in as query params rather than a single id.
function variantKey(req, res) {
  const item_code = String(req.query.item_code ?? '').trim();
  const flavour_id = Number(req.query.flavour_id);
  const location = String(req.query.location ?? '').trim();
  if (!item_code || !Number.isInteger(flavour_id) || !LOCATIONS.includes(location)) {
    res.status(400).json({ error: 'Missing product, flavour or location' });
    return null;
  }
  return { item_code, flavour_id, location };
}

router.patch('/variants', wrap(async (req, res) => {
  const patch = { updated_at: now() };
  if (req.body?.qty !== undefined) {
    const qty = Number(req.body.qty);
    if (!Number.isInteger(qty) || qty < 0) return res.status(400).json({ error: 'Quantity must be 0 or more' });
    patch.qty = qty;
  }
  if (req.body?.active !== undefined) patch.active = req.body.active ? 1 : 0;
  if (req.body?.visible_on_web !== undefined) patch.visible_on_web = req.body.visible_on_web ? 1 : 0;
  if (req.body?.price !== undefined) {
    const price = priceValue(req.body.price);
    if (price === undefined) return res.status(400).json({ error: 'Price must be 0 or more' });
    patch.price = price;
  }

  const key = variantKey(req, res);
  if (!key) return;
  if (!(await variantByKey(key))) return res.status(404).json({ error: 'Not found' });

  if (patch.qty !== undefined) {
    const room = await capacity(key.item_code, key.location, key.flavour_id);
    if (patch.qty > room.free) {
      return res.status(400).json({
        error: room.free <= 0
          ? `All ${room.pos} in stock at ${key.location.replace(/_/g, ' ')} are already assigned to flavours.`
          : `Only ${room.free} left to assign at ${key.location.replace(/_/g, ' ')} (${room.pos} in POS).`,
      });
    }
  }

  // Column names come from the fixed keys above, never from the request.
  const columns = Object.keys(patch);
  const result = await attempt(res, () => run(`
    UPDATE product_variants SET ${columns.map((c) => `${c} = ?`).join(', ')}
    WHERE item_code = ? AND flavour_id = ? AND location = ?`,
    ...columns.map((c) => patch[c]), key.item_code, key.flavour_id, key.location));
  if (!result) return;
  return res.json({ variant: await variantByKey(key) });
}));

router.delete('/variants', wrap(async (req, res) => {
  const key = variantKey(req, res);
  if (!key) return;
  const result = await attempt(res, () => run(
    'DELETE FROM product_variants WHERE item_code = ? AND flavour_id = ? AND location = ?',
    key.item_code, key.flavour_id, key.location,
  ));
  if (!result) return;
  return res.status(204).end();
}));

export default router;
