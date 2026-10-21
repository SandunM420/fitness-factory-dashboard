import { useEffect, useMemo, useState } from 'react';
import { getJson } from '../api.js';
import CategoryProductsModal from './CategoryProductsModal.jsx';

const num = new Intl.NumberFormat();
const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
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

// Best-selling item(s) in every category for a chosen year.
export default function CategoryLeaders({ metric }) {
  const [years, setYears] = useState([]);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('0');
  const [rankBy, setRankBy] = useState('qty');
  const [top, setTop] = useState(1);
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openCategory, setOpenCategory] = useState(null);

  useEffect(() => {
    getJson('/metrics/invoice-years')
      .then((d) => {
        const list = d.rows.map((r) => r.year);
        setYears(list);
        setYear(String(list[0] ?? new Date().getFullYear()));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!year) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getJson(`/metrics/${metric.id}?year=${year}&month=${month}&rankBy=${rankBy}&top=${top}`)
      .then((d) => !cancelled && setRows(d.rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [metric.id, year, month, rankBy, top]);

  // Group ranked rows by category, keeping the server's order (highest-revenue category first).
  const categories = useMemo(() => {
    const map = new Map();
    for (const r of rows ?? []) {
      if (!map.has(r.category)) map.set(r.category, { ...r, items: [] });
      map.get(r.category).items.push(r);
    }
    return [...map.values()];
  }, [rows]);

  const isCurrentYear = Number(year) === new Date().getFullYear();
  const monthLabel = MONTHS.find((m) => m.value === month)?.label;
  const periodLabel = month === '0' ? year : `${monthLabel} ${year}`;
  const byRevenue = rankBy === 'revenue';

  return (
    <div className="card wide">
      <div className="card-header">
        <div>
          <h3>{metric.title}</h3>
          <p className="muted small">
            Top {top === 1 ? 'item' : `${top} items`} in each category by {byRevenue ? 'revenue' : 'units sold'}
            {year && ` · ${periodLabel}`}{month === '0' && isCurrentYear && ' (year to date)'}
            {loading && ' · loading…'}
          </p>
        </div>
        <div className="controls">
          <label>
            <span>Year</span>
            <select value={year} onChange={(e) => setYear(e.target.value)} disabled={!years.length}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label>
            <span>Month</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <div className="segmented" role="group" aria-label="Rank by">
            <button className={!byRevenue ? 'active' : ''} onClick={() => setRankBy('qty')}>Units sold</button>
            <button className={byRevenue ? 'active' : ''} onClick={() => setRankBy('revenue')}>Revenue</button>
          </div>
          <label>
            <span>Show</span>
            <select value={top} onChange={(e) => setTop(Number(e.target.value))}>
              <option value={1}>Top 1</option>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
            </select>
          </label>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {rows && !categories.length && <p className="muted">No sales recorded in {periodLabel}.</p>}

      <div className={`leader-grid${loading ? ' is-loading' : ''}`}>
        {categories.map((c) => {
          const [best, ...rest] = c.items;
          const share = byRevenue ? pct(best.revenue, c.categoryRevenue) : pct(best.qty, c.categoryQty);
          return (
            <article
              key={c.category}
              className="leader-card clickable"
              role="button"
              tabIndex={0}
              title={`View all ${c.category} products`}
              onClick={() => setOpenCategory(c.category)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenCategory(c.category))}
            >
              <header>
                <span className="leader-category">{c.category}</span>
                <span className="muted small">
                  {num.format(c.categoryQty)} units · {money.format(c.categoryRevenue)}
                </span>
              </header>

              <div className="leader-best">
                <span className="leader-badge">#1</span>
                <div>
                  <div className="leader-name" title={best.itemName}>{best.itemName}</div>
                  <div className="muted small">{best.itemCode}</div>
                </div>
              </div>

              <dl className="leader-stats">
                <div className={!byRevenue ? 'primary' : ''}><dt>Units sold</dt><dd>{num.format(best.qty)}</dd></div>
                <div className={byRevenue ? 'primary' : ''}><dt>Revenue</dt><dd>{money.format(best.revenue)}</dd></div>
                <div><dt>Invoices</dt><dd>{num.format(best.invoices)}</dd></div>
              </dl>

              <div className="share" title={`${share}% of category ${byRevenue ? 'revenue' : 'units'}`}>
                <div className="share-bar"><span style={{ width: `${share}%` }} /></div>
                <span className="muted small">{share}% of category {byRevenue ? 'revenue' : 'units'}</span>
              </div>

              {rest.length > 0 && (
                <ol className="leader-rest" start={2}>
                  {rest.map((r) => (
                    <li key={r.itemCode}>
                      <span className="leader-rest-name" title={r.itemName}>{r.itemName}</span>
                      <span className="muted">{byRevenue ? money.format(r.revenue) : `${num.format(r.qty)} units`}</span>
                    </li>
                  ))}
                </ol>
              )}

              <span className="leader-more">View all {num.format(c.categoryItems)} products sold →</span>
            </article>
          );
        })}
      </div>

      {openCategory && (
        <CategoryProductsModal
          category={openCategory}
          years={years}
          initialYear={year}
          initialMonth={month}
          initialSort={rankBy}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </div>
  );
}
