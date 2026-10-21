import { useEffect, useMemo, useState } from 'react';
import useResizableColumns from '../useResizableColumns.js';
import { getJson } from '../api.js';

const num = new Intl.NumberFormat();
const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
const MONTHS = [
  { value: '0', label: 'All months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const COLUMNS = [
  { key: 'rank', label: '#', num: true, sortable: false },
  { key: 'itemName', label: 'Product' },
  { key: 'qty', label: 'Units sold', num: true },
  { key: 'revenue', label: 'Revenue', num: true },
  { key: 'avgPrice', label: 'Avg. price', num: true },
  { key: 'costPerUnit', label: 'Cost per unit', num: true },
  { key: 'invoices', label: 'Invoices', num: true },
  { key: 'share', label: 'Share of category', num: true },
  { key: 'lastSold', label: 'Last sold', num: true },
];

// Pop-up window listing every product in a category for a year/month, sortable by any column.
export default function CategoryProductsModal({ category, years, initialYear, initialMonth, initialSort, onClose }) {
  const columnsRef = useResizableColumns('category-products');
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth ?? '0');
  const [sort, setSort] = useState({ key: initialSort, dir: 'desc' });
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getJson(`/metrics/category-products?year=${year}&month=${month}&category=${encodeURIComponent(category)}`)
      .then((d) => !cancelled && setRows(d.rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [category, year, month]);

  // Close on Escape and stop the page behind from scrolling.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const totals = useMemo(() => {
    const list = rows ?? [];
    return {
      qty: list.reduce((s, r) => s + r.qty, 0),
      revenue: list.reduce((s, r) => s + r.revenue, 0),
      sold: list.filter((r) => r.qty > 0).length,
      all: list.length,
    };
  }, [rows]);

  const shareKey = sort.key === 'revenue' ? 'revenue' : 'qty';

  const products = useMemo(() => {
    const list = (rows ?? []).map((r) => ({
      ...r,
      avgPrice: r.qty ? r.revenue / r.qty : 0,
      share: totals[shareKey] ? (r[shareKey] / totals[shareKey]) * 100 : 0,
    }));
    // Rank by units sold (highest first) regardless of how the table is sorted.
    [...list].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).forEach((r, i) => { r.rank = r.qty > 0 ? i + 1 : null; });

    const dir = sort.dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return cmp * dir || b.qty - a.qty;
    });

    const q = search.trim().toLowerCase();
    return q ? list.filter((r) => `${r.itemName} ${r.itemCode}`.toLowerCase().includes(q)) : list;
  }, [rows, sort, search, totals, shareKey]);

  const toggleSort = (key) => setSort((s) => (s.key === key
    ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
    : { key, dir: key === 'itemName' ? 'asc' : 'desc' }));

  const isCurrentYear = Number(year) === new Date().getFullYear();
  const monthLabel = MONTHS.find((m) => m.value === month)?.label;
  const periodLabel = month === '0' ? year : `${monthLabel} ${year}`;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div>
            <span className="leader-category">Category</span>
            <h2 id="modal-title">{category}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="modal-toolbar">
          <label>
            <span>Year</span>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label>
            <span>Month</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <input type="search" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading && <span className="muted small">Loading…</span>}
        </div>

        <div className="modal-summary">
          <div><span>Units sold</span><strong>{num.format(totals.qty)}</strong></div>
          <div><span>Revenue</span><strong>{money.format(totals.revenue)}</strong></div>
          <div><span>Products sold</span><strong>{num.format(totals.sold)} <small className="muted">of {num.format(totals.all)}</small></strong></div>
          <div><span>Period</span><strong>{periodLabel}{month === '0' && isCurrentYear && <small className="muted"> year to date</small>}</strong></div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-body">
          <table ref={columnsRef} className="product-table">
            <thead>
              <tr>
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key;
                  const label = c.key === 'share' ? `Share of ${shareKey === 'revenue' ? 'revenue' : 'units'}` : c.label;
                  return (
                    <th key={c.key} className={`${c.num ? 'num' : ''}${active ? ' sorted' : ''}`} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {c.sortable === false ? label : (
                        <button className="sort-btn" onClick={() => toggleSort(c.key)}>
                          {label}<span className="sort-arrow">{active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {products.map((r) => (
                <tr key={r.itemCode} className={r.qty === 0 ? 'no-sales' : ''}>
                  <td className="num rank-cell">{r.rank ?? '–'}</td>
                  <td>
                    <div className="product-name" title={r.itemName}>{r.itemName}</div>
                    <div className="muted small">{r.itemCode}</div>
                  </td>
                  <td className="num strong">{num.format(r.qty)}</td>
                  <td className="num">{money.format(r.revenue)}</td>
                  <td className="num">{r.qty ? money.format(r.avgPrice) : '–'}</td>
                  <td
                    className="num"
                    title={r.costSource === 'current'
                      ? 'No sales this year: current cost from the stock list'
                      : 'Average cost at time of sale, weighted by units sold'}
                  >
                    {r.costPerUnit == null ? '–' : money.format(r.costPerUnit)}
                    {r.costSource === 'current' && <sup className="muted"> *</sup>}
                  </td>
                  <td className="num">{num.format(r.invoices)}</td>
                  <td className="num">
                    <div className="share-cell">
                      <div className="share-bar"><span style={{ width: `${Math.min(100, r.share)}%` }} /></div>
                      <span>{r.share.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="num">{r.lastSold ? r.lastSold.slice(0, 10) : <span className="muted">No sales</span>}</td>
                </tr>
              ))}
              {rows && !products.length && (
                <tr><td colSpan={COLUMNS.length} className="muted empty">No products match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="modal-footnote muted small">
          Cost per unit is the average cost at the time of sale, weighted by units sold.
          {products.some((r) => r.costSource === 'current') && ' * No sales this year: current cost from the stock list.'}
        </p>
      </div>
    </div>
  );
}
