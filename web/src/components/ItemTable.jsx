import { useMemo, useState } from 'react';
import useResizableColumns from '../useResizableColumns.js';

/**
 * Searchable, sortable table for the item master pages.
 * `columns` is [{ key, label, align, format, total, hint }] — `total` marks a column
 * that gets summed in the footer row.
 */
export default function ItemTable({ rows, columns, searchKeys, filterKey, filterLabel, stockKey, initialSort, toolbarExtra, onRefresh, updatedAt, emptyText = 'Nothing to show.' }) {
  const columnsRef = useResizableColumns('item-table-v2-' + columns.map((c) => c.key).join('-'), String(columns.length));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stock, setStock] = useState('all');   // only shown when stockKey is given
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: 'asc' });

  const filterValues = useMemo(() => {
    if (!filterKey) return [];
    return [...new Set(rows.map((r) => r[filterKey]).filter(Boolean))].sort();
  }, [rows, filterKey]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const picked = rows.filter((r) => {
      if (filterKey && filter !== 'all' && r[filterKey] !== filter) return false;
      if (stockKey && stock !== 'all') {
        const held = Number(r[stockKey]) || 0;
        if (stock === 'in' && held <= 0) return false;
        if (stock === 'out' && held > 0) return false;
        if (stock === 'low' && (held <= 0 || held > 5)) return false;
      }
      if (!q) return true;
      return searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q));
    });
    const col = columns.find((c) => c.key === sort.key);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...picked].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x === y) return String(a.itemName).localeCompare(String(b.itemName));
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (col?.align === 'num' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, columns, search, filter, filterKey, stock, stockKey, searchKeys, sort]);

  const totals = useMemo(() => {
    const out = {};
    for (const c of columns) if (c.total) out[c.key] = shown.reduce((a, r) => a + (r[c.key] ?? 0), 0);
    return out;
  }, [shown, columns]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const hasTotals = columns.some((c) => c.total);

  return (
    <div className="card">
      <div className="modal-toolbar item-toolbar">
        {toolbarExtra}
        <input type="search" placeholder="Search name or code…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search items" />
        {filterKey && (
          <label>{filterLabel}
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              {filterValues.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        )}
        {stockKey && (
          <label>Stock
            <select value={stock} onChange={(e) => setStock(e.target.value)}>
              <option value="all">All</option>
              <option value="in">In stock</option>
              <option value="out">Out of stock</option>
              <option value="low">Low (1-5)</option>
            </select>
          </label>
        )}
        <span className="muted small">{shown.length} of {rows.length} items</span>
        {updatedAt && (
          <span className="muted small">updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
        {onRefresh && <button type="button" onClick={onRefresh}>Refresh</button>}
      </div>

      <div className="table-scroll">
        <table ref={columnsRef} className="product-table">
          <thead>
            <tr>
              <th className="rank-cell">#</th>
              {columns.map((c) => (
                <th key={c.key} className={`${c.align === 'num' ? 'num' : ''}${sort.key === c.key ? ' sorted' : ''}`} title={c.hint}>
                  <button className="sort-btn" onClick={() => toggleSort(c.key)}>
                    {c.label}
                    <span className="sort-arrow">{sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td className="empty" colSpan={columns.length + 1}>{emptyText}</td></tr>}
            {shown.map((r, index) => (
              <tr key={r.itemCode}>
                <td className="rank-cell">{index + 1}</td>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'num' ? 'num' : ''}>
                    {c.format ? c.format(r[c.key], r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {hasTotals && shown.length > 0 && (
            <tfoot>
              <tr>
                <td className="rank-cell" />
                {columns.map((c, i) => (
                  <td key={c.key} className={c.align === 'num' ? 'num strong' : 'strong'}>
                    {c.total ? (c.format ? c.format(totals[c.key], null) : totals[c.key]) : i === 0 ? 'Total' : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
