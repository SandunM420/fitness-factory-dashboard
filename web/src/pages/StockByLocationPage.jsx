import { useCallback, useEffect, useMemo, useState } from 'react';
import { getJson } from '../api.js';
import ItemTable from '../components/ItemTable.jsx';
import { locationName, locationShort } from '../locations.js';

const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat();
const qty = (v) => (v ? num.format(v) : <span className="muted">0</span>);

export default function StockByLocationPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [location, setLocation] = useState('all');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(() => {
    getJson('/metrics/stock-by-location')
      .then((d) => { setData(d.rows); setUpdatedAt(new Date()); setError(''); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  // The API returns one row per item per location. Fold it into one row per item, and
  // keep only the locations that actually hold something — both lists come from the data.
  const { items, locations } = useMemo(() => {
    if (!data) return { items: [], locations: [] };
    const byItem = new Map();
    const stocked = new Set();
    for (const r of data) {
      const item = byItem.get(r.itemCode)
        ?? { itemCode: r.itemCode, itemName: r.itemName, category: r.category, cost: r.cost, total: 0, stockValue: 0 };
      item[r.location] = r.qty;
      item.total += r.qty;
      item.stockValue += r.qty * r.cost;
      byItem.set(r.itemCode, item);
      if (r.qty) stocked.add(r.location);
    }
    return {
      items: [...byItem.values()],
      locations: [...stocked].sort((a, b) => locationName(a).localeCompare(locationName(b))),
    };
  }, [data]);

  const picked = locations.includes(location) ? location : null;

  // One location: keep only what is held there, and value it at that location's quantity.
  const shown = useMemo(() => (picked ? items.filter((r) => r[picked] > 0) : items), [items, picked]);

  const columns = useMemo(() => [
    { key: 'itemCode', label: 'Code' },
    { key: 'itemName', label: 'Item', format: (v) => <span className="product-name" title={v}>{v}</span> },
    { key: 'category', label: 'Category' },
    ...(picked
      ? [
          { key: picked, label: `In stock · ${locationName(picked)}`, align: 'num', total: true, format: (v) => <strong>{num.format(v)}</strong> },
          { key: 'total', label: 'All locations', align: 'num', total: true, format: qty },
        ]
      : [
          ...locations.map((code) => ({ key: code, label: locationName(code), align: 'num', total: true, format: qty })),
          { key: 'total', label: 'Total', align: 'num', total: true, format: (v) => (v ? <strong>{num.format(v)}</strong> : <span className="muted">Out of stock</span>) },
        ]),
  ], [locations, picked]);

  if (error) return <div className="card error">Could not load stock: {error}</div>;
  if (!data) return <div className="card">Loading…</div>;

  const inStock = items.filter((r) => r.total > 0).length;
  const sum = (fn) => items.reduce((a, r) => a + fn(r), 0);

  // The tiles double as the location filter: click one to narrow the table to that shop.
  const Tile = ({ code, name, units, hint }) => (
    <button
      className={`card kpi stock-tile${location === code ? ' active' : ''}`}
      onClick={() => setLocation(code)}
      aria-pressed={location === code}
      title={`Show ${name}`}
    >
      <h3>{name}</h3>
      <div className="kpi-value">{num.format(units)}</div>
      <div className="muted small kpi-hint">{hint}</div>
    </button>
  );

  return (
    <div className="stock-page">
      <section className="kpis">
        {locations.map((code) => (
          <Tile
            key={code}
            code={code}
            name={locationName(code)}
            units={sum((r) => r[code] ?? 0)}
            hint={`${num.format(items.filter((r) => r[code] > 0).length)} items · ${money.format(sum((r) => (r[code] ?? 0) * r.cost))} at cost`}
          />
        ))}
        <Tile
          code="all"
          name="All locations"
          units={sum((r) => r.total)}
          hint={`${inStock} of ${items.length} items in stock · ${money.format(sum((r) => r.stockValue))} at cost`}
        />
      </section>

      <ItemTable
        rows={shown}
        columns={columns}
        searchKeys={['itemName', 'itemCode', 'category']}
        filterKey="category"
        filterLabel="Category"
        stockKey="total"
        onRefresh={load}
        updatedAt={updatedAt}
        initialSort={{ key: 'total', dir: 'desc' }}
        toolbarExtra={(
          <div className="segmented" role="group" aria-label="Location">
            <button className={location === 'all' ? 'active' : ''} onClick={() => setLocation('all')}>All</button>
            {locations.map((code) => (
              <button key={code} className={location === code ? 'active' : ''} onClick={() => setLocation(code)} title={locationName(code)}>
                {locationShort(code)}
              </button>
            ))}
          </div>
        )}
        emptyText={picked ? `No stock at ${locationName(picked)} matches that search.` : 'No items match that search.'}
      />
    </div>
  );
}
