import { Router } from 'express';
import { all, batch, get, now, run } from './store.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const statuses = new Set(['pending_payment', 'paid', 'accepted', 'processing', 'shipped', 'completed', 'cancelled']);

router.get('/orders', wrap(async (_req, res) => {
  const orders = await all(`SELECT o.id,o.order_number,o.status,o.payment_method,o.total,o.delivery_name,o.delivery_phone,
    o.delivery_city,o.created_at,c.email FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 200`);
  return res.json({ orders });
}));

router.get('/orders/:id', wrap(async (req, res) => {
  const order = await get(`SELECT o.*,c.email FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.id=?`, req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json({ order, items: await all('SELECT * FROM order_items WHERE order_id=? ORDER BY id', req.params.id) });
}));

router.patch('/orders/:id/status', wrap(async (req, res) => {
  if (!statuses.has(req.body?.status)) return res.status(400).json({ error: 'Invalid order status' });
  const order = await get('SELECT id,status FROM orders WHERE id=?', req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'cancelled' || order.status === 'completed') return res.status(409).json({ error: 'A finalised order cannot be changed' });
  const changedAt = now();
  if (req.body.status === 'cancelled') {
    const reservations = await all('SELECT * FROM order_reservations WHERE order_id=?', req.params.id);
    await batch([
      ...reservations.map((item) => ({ sql: 'UPDATE product_variants SET qty=qty+?,updated_at=? WHERE item_code=? AND flavour_id=? AND location=?', args: [item.quantity,changedAt,item.item_code,item.flavour_id,item.location] })),
      { sql: 'UPDATE orders SET status=?,updated_at=? WHERE id=?', args: ['cancelled', changedAt, req.params.id] },
      { sql: 'DELETE FROM order_reservations WHERE order_id=?', args: [req.params.id] },
    ]);
  } else await run('UPDATE orders SET status=?,updated_at=? WHERE id=?', req.body.status, changedAt, req.params.id);
  return res.json({ id: req.params.id, status: req.body.status });
}));

export default router;
