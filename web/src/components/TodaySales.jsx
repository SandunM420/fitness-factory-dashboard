import { useCallback, useEffect, useMemo, useState } from 'react';
import useResizableColumns from '../useResizableColumns.js';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getJson } from '../api.js';

// Branch codes as stored in the database → names shown to users.
const SHOPS = [
  { code: 'all', name: 'All shops' },
  { code: 'HCM', name: 'Havelock City Mall' },
  { code: 'One_Galle_Face', name: 'One Galle Face' },
];
const shopName = (code) => SHOPS.find((s) => s.code === code)?.name ?? code;
const SHOP_COLORS = { HCM: '#3b82f6', One_Galle_Face: '#e5e7eb' };

const num = new Intl.NumberFormat();
const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const REFRESH_MS = 60_000;

// Today's date in Sri Lanka (where the shops are), whatever timezone this browser is in.
const sriLankaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());

function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function prettyDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const tooltipStyle = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' },
  labelStyle: { color: 'var(--text)', fontWeight: 600 },
  itemStyle: { color: 'var(--text)' },
  cursor: { fill: 'var(--border)', opacity: 0.4 },
};

export default function TodaySales() {
  const columnsRef = useResizableColumns('today-sales');
  const [date, setDate] = useState(sriLankaToday);
  const [shop, setShop] = useState('all');
  const [lines, setLines] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const today = sriLankaToday();
  const isToday = date === today;

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const d = await getJson(`/metrics/daily-sales-lines?date=${date}&shop=${shop}`);
      if (!signal.cancelled) {
        setLines(d.rows);
        setUpdatedAt(new Date());
      }
    } catch (e) {
      if (!signal.cancelled) setError(e.message);
    } finally {
      if (!signal.cancelled) setLoading(false);
    }
  }, [date, shop]);

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    // Keep today's figures live.
    const timer = isToday ? setInterval(() => load(signal), REFRESH_MS) : null;
    return () => { signal.cancelled = true; if (timer) clearInterval(timer); };
  }, [load, isToday]);

  const view = useMemo(() => summarise(lines ?? []), [lines]);

  // Margin is measured against the revenue that actually has a cost behind it.
  const profitHint = view.costedRevenue
    ? [
        `${Math.round((view.profit / view.costedRevenue) * 100)}% margin`,
        view.uncostedLines && `${view.uncostedLines} line${view.uncostedLines > 1 ? 's' : ''} without a cost`,
      ].filter(Boolean).join(' · ')
    : undefined;

  return (
    <main className="today">
      <div className="card today-toolbar">
        <div>
          <p className="muted small">
            {prettyDate(date)}{isToday && ' · updates every minute'}
            {updatedAt && ` · last updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            {loading && ' · loading…'}
          </p>
        </div>
        <div className="controls">
          <div className="segmented" role="group" aria-label="Shop">
            {SHOPS.map((s) => (
              <button key={s.code} className={shop === s.code ? 'active' : ''} onClick={() => setShop(s.code)}>{s.name}</button>
            ))}
          </div>
          <div className="date-nav">
            <button onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</button>
            <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <button onClick={() => setDate(shiftDate(date, 1))} disabled={date >= today} aria-label="Next day">›</button>
            <button onClick={() => setDate(today)} disabled={isToday}>Today</button>
          </div>
          <button onClick={() => load({ cancelled: false })} disabled={loading} title="Refresh now">↻ Refresh</button>
        </div>
      </div>

      {error && <div className="card error">Could not load sales: {error}</div>}

      <section className="kpis">
        <Kpi label="Revenue" value={money.format(view.revenue)} />
        <Kpi label="Invoices" value={num.format(view.invoices.length)} />
        <Kpi label="Items sold" value={num.format(view.qty)} />
        <Kpi label="Profit" value={view.costedRevenue ? money.format(view.profit) : '–'} hint={profitHint} />
      </section>

      {shop === 'all' && (
        <section className="shop-split">
          {SHOPS.filter((s) => s.code !== 'all').map((s) => {
            const t = view.byShop[s.code] ?? { revenue: 0, invoices: 0, qty: 0 };
            const share = view.revenue ? Math.round((t.revenue / view.revenue) * 100) : 0;
            return (
              <button key={s.code} className="card shop-card" onClick={() => setShop(s.code)} title={`Show only ${s.name}`}>
                <div className="shop-card-head">
                  <span className="shop-dot" style={{ background: SHOP_COLORS[s.code] }} />
                  <span className="shop-card-name">{s.name}</span>
                  <span className="muted small">{share}% of revenue</span>
                </div>
                <div className="shop-card-value">{money.format(t.revenue)}</div>
                <div className="muted small">{num.format(t.invoices)} invoices · {num.format(t.qty)} items</div>
                <div className="share-bar"><span style={{ width: `${share}%`, background: SHOP_COLORS[s.code] }} /></div>
              </button>
            );
          })}
        </section>
      )}

      <section className="card">
        <h3>Sales by hour</h3>
        {lines && !lines.length ? <p className="muted">No sales recorded {isToday ? 'yet today' : 'on this day'}.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={view.hours} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => compact.format(v)} tick={{ fontSize: 12 }} />
              <Tooltip {...tooltipStyle} formatter={(v, name) => [money.format(v), shopName(name)]} />
              {shop === 'all' && <Legend formatter={(v) => shopName(v)} />}
              {(shop === 'all' ? ['HCM', 'One_Galle_Face'] : [shop]).map((code) => (
                <Bar key={code} dataKey={code} stackId="shops" fill={SHOP_COLORS[code]} maxBarSize={48} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="today-grid">
        <section className="card">
          <h3>Invoices <span className="muted small">({num.format(view.invoices.length)})</span></h3>
          {!view.invoices.length ? <p className="muted">No invoices.</p> : (
            <div className="table-scroll">
              <table ref={columnsRef} className="product-table invoice-table">
                <thead>
                  <tr>
                    <th>Time</th><th>Invoice</th>{shop === 'all' && <th>Shop</th>}<th>Staff</th><th>Items</th><th>Payment</th><th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {view.invoices.map((inv) => (
                    <tr key={inv.invoiceNo}>
                      <td className="strong">{inv.time}</td>
                      <td className="muted">{inv.invoiceNo}</td>
                      {shop === 'all' && <td><span className="shop-tag" style={{ borderColor: SHOP_COLORS[inv.shop] }}>{shopName(inv.shop)}</span></td>}
                      <td>{inv.staff}</td>
                      <td>
                        {inv.items.map((it) => (
                          <div key={it.itemCode} className="invoice-item" title={it.itemName}>
                            {it.itemName} <span className="muted">×{num.format(it.qty)}</span>
                          </div>
                        ))}
                      </td>
                      <td>{inv.payment}</td>
                      <td className="num strong">{money.format(inv.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Top items</h3>
          {!view.items.length ? <p className="muted">No items sold.</p> : (
            <ol className="top-items">
              {view.items.slice(0, 10).map((it) => (
                <li key={it.itemCode}>
                  <div className="top-item-name" title={it.itemName}>{it.itemName}</div>
                  <div className="muted small">{it.category} · {num.format(it.qty)} sold</div>
                  <div className="top-item-rev">{money.format(it.revenue)}</div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="card kpi">
      <h3>{label}</h3>
      <div className="kpi-value">{value}</div>
      {hint && <div className="muted small kpi-hint">{hint}</div>}
    </div>
  );
}

// Turn invoice lines into totals, per-shop totals, hourly buckets, invoices and top items.
function summarise(lines) {
  const invoices = new Map();
  const items = new Map();
  const byShop = {};
  const hourly = new Map();
  let revenue = 0;
  let qty = 0;
  // Profit is summed only over lines whose cost is known, so lines with no recorded
  // cost do not show up as pure margin. costedRevenue is the revenue behind that profit.
  let cost = 0;
  let costedRevenue = 0;
  let uncostedLines = 0;

  for (const l of lines) {
    revenue += l.revenue;
    qty += l.qty;
    if (l.cost === null || l.cost === undefined) uncostedLines += 1;
    else { cost += l.cost; costedRevenue += l.revenue; }

    const s = (byShop[l.shop] ??= { revenue: 0, qty: 0, invoiceSet: new Set() });
    s.revenue += l.revenue;
    s.qty += l.qty;
    s.invoiceSet.add(l.invoiceNo);

    if (!invoices.has(l.invoiceNo)) {
      invoices.set(l.invoiceNo, { invoiceNo: l.invoiceNo, time: l.time, shop: l.shop, staff: l.staff, payment: l.payment, customer: l.customer, revenue: 0, items: [] });
    }
    const inv = invoices.get(l.invoiceNo);
    inv.revenue += l.revenue;
    inv.items.push(l);

    const it = items.get(l.itemCode) ?? { itemCode: l.itemCode, itemName: l.itemName, category: l.category, qty: 0, revenue: 0 };
    it.qty += l.qty;
    it.revenue += l.revenue;
    items.set(l.itemCode, it);

    const hour = Number(l.time?.slice(0, 2));
    if (!Number.isNaN(hour)) {
      const h = hourly.get(hour) ?? {};
      h[l.shop] = (h[l.shop] ?? 0) + l.revenue;
      hourly.set(hour, h);
    }
  }

  for (const s of Object.values(byShop)) s.invoices = s.invoiceSet.size;

  // Show at least normal trading hours (10:00–22:00), widened if sales fall outside them.
  const seen = [...hourly.keys()];
  const from = Math.min(10, ...seen);
  const to = Math.max(21, ...seen);
  const hours = [];
  for (let h = from; h <= to; h++) hours.push({ label: `${String(h).padStart(2, '0')}:00`, ...hourly.get(h) });

  return {
    revenue,
    qty,
    profit: costedRevenue - cost,
    costedRevenue,
    uncostedLines,
    byShop,
    hours,
    invoices: [...invoices.values()].sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '')),
    items: [...items.values()].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty),
  };
}
