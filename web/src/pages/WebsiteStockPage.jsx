import { useCallback, useEffect, useMemo, useState } from 'react';
import useResizableColumns from '../useResizableColumns.js';
import { requestJson } from '../api.js';
import FilterBar from '../components/FilterBar.jsx';
import SubProductGrid from '../components/SubProductGrid.jsx';
import { ToastStack, useToasts } from '../components/Toasts.jsx';
import { applyVariant, removeVariants } from '../catalogState.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
const label = (location) => location.replace(/_/g, ' ');
const dash = <span className="muted">–</span>;

// A sub-product has no surrogate id - its primary key is the three parts together.
const keyQuery = (variant) => new URLSearchParams({
  item_code: variant.itemCode,
  flavour_id: String(variant.flavourId),
  location: variant.location,
}).toString();

// One filter per column: text is a substring match, select is exact, number
// carries its own operator. Same shape as a WHERE clause on the list.
const matches = (row, column, held) => {
  if (held === undefined || held === '') return true;
  const cell = row[column.key];
  if (column.filter === 'number') {
    if (held.value === '' || held.value === undefined) return true;
    const a = Number(cell) || 0;
    const b = Number(held.value);
    switch (held.op) {
      case '!=': return a !== b;
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
      default: return a === b;
    }
  }
  if (column.filter === 'select') return String(cell) === String(held);
  return String(cell ?? '').toLowerCase().includes(String(held).toLowerCase());
};

const COLUMNS = [
  { key: 'itemCode', label: 'Code', filter: 'text', primary: true },
  { key: 'itemName', label: 'Item', filter: 'text', primary: true, format: (v) => <span className="product-name" title={v}>{v}</span> },
  { key: 'category', label: 'Category', filter: 'select', primary: true },
  { key: 'locationLabel', label: 'Location', filter: 'select', primary: true },
  { key: 'cost', label: 'Cost', align: 'num', filter: 'number', format: (v) => (v ? money.format(v) : dash) },
  { key: 'price', label: 'Retail', align: 'num', filter: 'number', format: (v) => (v ? money.format(v) : dash) },
  { key: 'posTotal', label: 'In POS', align: 'num', filter: 'number' },
  { key: 'assignedTotal', label: 'Assigned', align: 'num', filter: 'number' },
  {
    key: 'unassignedTotal',
    label: 'Unassigned',
    align: 'num',
    filter: 'number',
    format: (v) => (v === 0 ? dash : <span className={v > 0 ? 'gap-under' : 'gap-over'}>{v > 0 ? v : `+${Math.abs(v)}`}</span>),
  },
  { key: 'flavourCount', label: 'Flavours', align: 'num', filter: 'number', format: (v) => (v || dash) },
];

export default function WebsiteStockPage() {
  const columnsRef = useResizableColumns('website-stock');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toasts, push, dismiss } = useToasts();
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState(() => new Set());
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: 'itemName', dir: 'asc' });
  // { variants, done } while the delete dialog is open.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const body = await requestJson('/catalog/products');
      setData(body);
      setUpdatedAt(new Date());
      setError('');
    } catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Shops that hold stock for at least one product. Hill Street and Gym Store
  // are empty across the whole catalogue, so they never become rows.
  const locations = useMemo(() => {
    if (!data) return [];
    return data.locations.filter((location) => data.products.some((product) =>
      (product.pos[location] ?? 0) > 0 || (product.assigned[location] ?? 0) > 0));
  }, [data]);

  // One row per (product x location): a product held in two shops is two rows,
  // so the Location column and its per-shop quantities both mean something.
  const baseRows = useMemo(() => {
    if (!data) return [];
    const out = [];
    for (const product of data.products) {
      for (const location of locations) {
        const variants = product.variants.filter((v) => v.location === location);
        out.push({
          ...product,
          rowKey: product.itemCode + '|' + location,
          location,
          locationLabel: label(location),
          posTotal: product.pos[location] ?? 0,
          assignedTotal: product.assigned[location] ?? 0,
          unassignedTotal: product.unassigned[location] ?? 0,
          flavourCount: variants.length,
          shown: variants,
        });
      }
    }
    return out;
  }, [data, locations]);

  // Filter fields ARE the columns, so the two can never drift apart.
  const fields = useMemo(() => COLUMNS.filter((c) => c.filter).map((column) => ({
    id: column.key,
    label: column.label,
    type: column.filter,
    primary: Boolean(column.primary),
    options: column.filter !== 'select' ? undefined
      : [...new Set(baseRows.map((row) => row[column.key]))].filter((v) => v !== '' && v != null).sort()
          .map((value) => ({ value, label: value })),
  })), [baseRows]);

  const rows = useMemo(() => {
    const picked = baseRows.filter((row) =>
      COLUMNS.every((column) => !column.filter || matches(row, column, filters[column.key])));

    const column = COLUMNS.find((c) => c.key === sort.key);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...picked].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x === y) return String(a.itemName).localeCompare(String(b.itemName)) || a.location.localeCompare(b.location);
      if (x == null) return 1;
      if (y == null) return -1;
      return (column?.align === 'num' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [baseRows, filters, sort]);
  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const toggleRow = (rowKey) => setOpen((current) => {
    const next = new Set(current);
    next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
    return next;
  });

  // Saving never changes a POS figure - we only ever write to the local store - so the
  // response is folded into local state instead of refetching all 96 products.
  // Refresh is what picks up sales rung up in the shops.

  // The row already says which shop, so the location comes from it, not a dropdown.
  const addVariant = (row, values) => {
    setBusy(row.rowKey);
    return requestJson('/catalog/variants', {
      method: 'POST',
      body: { item_code: row.itemCode, location: row.location, ...values },
    })
      .then((body) => {
        setData((current) => applyVariant(current, body.variant));
        push('success', 'Sub-product saved.');
      })
      .catch((caught) => push('error', caught.message))
      .finally(() => setBusy(''));
  };

  const patchVariant = (variant, body) => {
    setBusy(variant.key);
    return requestJson(`/catalog/variants?${keyQuery(variant)}`, { method: 'PATCH', body })
      .then((result) => {
        setData((current) => applyVariant(current, result.variant));
        push('success', 'Sub-product saved.');
      })
      .catch((caught) => push('error', caught.message))
      .finally(() => setBusy(''));
  };

  const remove = (variants, done) => {
    if (variants.length) setPendingDelete({ variants, done });
  };

  const confirmDelete = async () => {
    const { variants, done } = pendingDelete;
    setBusy('deleting');
    try {
      // Together, not one by one: deleting only frees assigned stock, so unlike
      // saves there is nothing for concurrent deletes to race.
      const results = await Promise.all(variants.map((variant) =>
        requestJson(`/catalog/variants?${keyQuery(variant)}`, { method: 'DELETE' })
          .then(() => ({ ok: true, key: variant.key }))
          .catch((caught) => ({ ok: false, message: caught.message }))));

      const gone = results.filter((r) => r.ok).map((r) => r.key);
      if (gone.length) setData((current) => removeVariants(current, gone));
      if (gone.length) push('success', gone.length === 1 ? 'Record deleted.' : `${gone.length} records deleted.`);
      for (const failure of results.filter((r) => !r.ok)) push('error', failure.message);
      done?.();
    } catch (caught) { push('error', caught.message); }
    finally { setBusy(''); setPendingDelete(null); }
  };
  if (loading) return <div className="card">Loading…</div>;
  if (error && !data) return <div className="card error">Could not load products: {error}</div>;

  return (
    <div className="card">
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Record"
        message={pendingDelete?.variants.length > 1
          ? `Please confirm that you wish to delete these ${pendingDelete.variants.length} records.`
          : 'Please confirm that you wish to delete this record.'}
        busy={busy === 'deleting'}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <FilterBar fields={fields} applied={filters} onApply={setFilters} />

      <div className="modal-toolbar item-toolbar">
        <span className="muted small">
          {rows.length} of {baseRows.length} rows
        </span>
        {updatedAt && <span className="muted small">updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        <button type="button" onClick={load}>Refresh</button>
      </div>

      <div className="table-scroll">
        <table ref={columnsRef} className="product-table stock-table">
          <thead>
            <tr>
              <th style={{ width: '2rem' }} />
              {COLUMNS.map((column) => (
                <th key={column.key} className={`${column.align === 'num' ? 'num' : ''}${sort.key === column.key ? ' sorted' : ''}`}>
                  <button className="sort-btn" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    <span className="sort-arrow">{sort.key === column.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="empty" colSpan={COLUMNS.length + 1}>No rows match that filter.</td></tr>}
            {rows.flatMap((row) => {
              const expanded = open.has(row.rowKey);
              const out = [(
                <tr key={row.rowKey} className={expanded ? 'is-open' : ''}>
                  <td>
                    <button className="expand-btn" onClick={() => toggleRow(row.rowKey)}
                      aria-expanded={expanded} aria-label={expanded ? 'Collapse' : 'Expand'}>
                      {expanded ? '⌄' : '›'}
                    </button>
                  </td>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className={column.align === 'num' ? 'num' : ''}>
                      {column.format ? column.format(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              )];

              if (expanded) out.push(
                <tr key={`${row.rowKey}-sub`} className="sub-row">
                  <td />
                  <td colSpan={COLUMNS.length}>
                    <SubProductGrid
                      row={row}
                      flavours={data.flavours}
                      busy={busy}
                      onCreate={addVariant}
                      onUpdate={patchVariant}
                      onDelete={remove}
                    />
                  </td>
                </tr>
              );
              return out;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
