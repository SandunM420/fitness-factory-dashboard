import { Router } from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { all, batch, get, now, run } from './store.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const cookieName = process.env.NODE_ENV === 'production' ? '__Host-ff-customer' : 'ff-customer';
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_MS };
const tokenHash = (value) => createHash('sha256').update(value).digest('hex');
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9 ()-]{7,20}$/;

function cookie(req, name) {
  const part = (req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  if (!part) return '';
  try { return decodeURIComponent(part.slice(name.length + 1)); } catch { return ''; }
}

async function customerFor(req) {
  const token = cookie(req, cookieName);
  return token && get(`SELECT c.* FROM customer_sessions s JOIN customers c ON c.id=s.customer_id
    WHERE s.token_hash=? AND s.expires_at>?`, tokenHash(token), Date.now());
}

router.post('/checkout', wrap(async (req, res) => {
  const name = clean(req.body?.name, 100), email = clean(req.body?.email, 254).toLowerCase();
  const phone = clean(req.body?.phone, 24), address = clean(req.body?.address, 300);
  const city = clean(req.body?.city, 80), notes = clean(req.body?.notes, 500);
  const paymentMethod = req.body?.paymentMethod;
  const lines = Array.isArray(req.body?.lines) ? req.body.lines.slice(0, 30) : [];
  if (!name || !emailPattern.test(email) || !phonePattern.test(phone) || !address || !city) return res.status(400).json({ error: 'Enter valid contact and Sri Lankan delivery details.' });
  if (!['card', 'koko'].includes(paymentMethod)) return res.status(400).json({ error: 'Choose Visa/Mastercard or Koko.' });
  if (!lines.length) return res.status(400).json({ error: 'Your bag is empty.' });

  const normalized = lines.map((line) => ({ itemCode: clean(line?.itemCode, 40), sizeId: Number(line?.sizeId) || null, flavourId: Number(line?.flavourId) || null, quantity: Math.trunc(Number(line?.quantity)) }));
  if (normalized.some((line) => !line.itemCode || !line.flavourId || line.quantity < 1 || line.quantity > 10)) return res.status(400).json({ error: 'One or more bag selections are invalid.' });
  const codes = [...new Set(normalized.map((line) => line.itemCode))];
  const products = await all(`SELECT p.item_code, p.title, p.status, s.id size_id, s.label size_label, s.active size_active
    FROM website_products p LEFT JOIN product_sizes s ON s.item_code=p.item_code WHERE p.item_code IN (${codes.map(() => '?').join(',')})`, ...codes);
  const variants = await all(`SELECT v.item_code,v.flavour_id,v.location,v.qty,v.price,f.name flavour_name
    FROM product_variants v JOIN flavours f ON f.id=v.flavour_id WHERE v.item_code IN (${codes.map(() => '?').join(',')})
    AND v.active=1 AND v.visible_on_web=1 AND v.qty>0 ORDER BY v.item_code,v.flavour_id,v.price,v.location`, ...codes);
  const items = [];
  const reservations = [];
  for (const line of normalized) {
    const productRows = products.filter((p) => p.item_code === line.itemCode);
    const product = productRows[0];
    const size = line.sizeId ? productRows.find((p) => Number(p.size_id) === line.sizeId && p.size_active) : null;
    if (!product || product.status !== 'active' || (productRows.some((p) => p.size_id) && !size)) return res.status(409).json({ error: 'A product option is no longer available. Refresh your bag.' });
    let needed = line.quantity;
    const own = variants.filter((v) => v.item_code === line.itemCode && Number(v.flavour_id) === line.flavourId);
    const unitPrice = own.length ? Math.min(...own.map((v) => Number(v.price)).filter(Number.isFinite)) : NaN;
    if (!Number.isFinite(unitPrice) || own.reduce((sum, v) => sum + Number(v.qty), 0) < needed) return res.status(409).json({ error: `${product.title || line.itemCode} is no longer available in that quantity.` });
    for (const variant of own) { const take = Math.min(needed, Number(variant.qty)); if (take) reservations.push({ ...variant, take }); needed -= take; if (!needed) break; }
    items.push({ ...line, title: product.title || line.itemCode, sizeLabel: size?.size_label || null, flavourName: own[0].flavour_name, unitPrice, lineTotal: unitPrice * line.quantity });
  }
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const customer = await get('SELECT * FROM customers WHERE email=?', email);
  const customerId = customer?.id || randomUUID(), id = randomUUID();
  const orderNumber = `FF-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
  const created = now();
  const statements = customer
    ? [{ sql: 'UPDATE customers SET name=?,phone=?,updated_at=? WHERE id=?', args: [name, phone, created, customerId] }]
    : [{ sql: 'INSERT INTO customers(id,email,name,phone,created_at,updated_at) VALUES(?,?,?,?,?,?)', args: [customerId, email, name, phone, created, created] }];
  statements.push({ sql: `INSERT INTO orders(id,order_number,customer_id,status,payment_method,subtotal,delivery_fee,total,delivery_name,delivery_phone,delivery_address,delivery_city,notes,created_at,updated_at)
    VALUES(?,?,?,'pending_payment',?,?,?,?,?,?,?,?,?,?,?)`, args: [id, orderNumber, customerId, paymentMethod, subtotal, 0, subtotal, name, phone, address, city, notes || null, created, created] });
  for (const item of items) statements.push({ sql: 'INSERT INTO order_items(order_id,item_code,title,size_id,size_label,flavour_id,flavour_name,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?,?,?,?)', args: [id,item.itemCode,item.title,item.sizeId,item.sizeLabel,item.flavourId,item.flavourName,item.quantity,item.unitPrice,item.lineTotal] });
  for (const reservation of reservations) {
    // The qty CHECK constraint aborts the entire atomic batch if a concurrent
    // checkout consumed stock after validation, so an unbacked order cannot exist.
    statements.push({ sql: 'UPDATE product_variants SET qty=qty-?,updated_at=? WHERE item_code=? AND flavour_id=? AND location=?', args: [reservation.take,created,reservation.item_code,reservation.flavour_id,reservation.location] });
    statements.push({ sql: 'INSERT INTO order_reservations(order_id,item_code,flavour_id,location,quantity) VALUES(?,?,?,?,?)', args: [id,reservation.item_code,reservation.flavour_id,reservation.location,reservation.take] });
  }
  await batch(statements);
  const token = randomBytes(32).toString('base64url');
  await run('INSERT INTO customer_sessions(token_hash,customer_id,expires_at) VALUES(?,?,?)', tokenHash(token), customerId, Date.now() + SESSION_MS);
  res.cookie(cookieName, token, cookieOptions);
  return res.status(201).json({ order: { orderNumber, status: 'pending_payment', total: subtotal }, payment: { required: true, providerConfigured: false, method: paymentMethod, message: 'Order reserved. Payment provider hand-off remains disabled until approved merchant credentials are configured.' } });
}));

router.get('/account/orders', wrap(async (req, res) => {
  const customer = await customerFor(req);
  if (!customer) return res.status(401).json({ error: 'No customer session found on this device.' });
  const orders = await all('SELECT order_number,status,payment_method,total,delivery_city,created_at FROM orders WHERE customer_id=? ORDER BY created_at DESC', customer.id);
  return res.json({ customer: { name: customer.name, email: customer.email }, orders });
}));

export default router;
