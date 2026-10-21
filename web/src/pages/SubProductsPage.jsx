import { useCallback, useEffect, useMemo, useState } from 'react';
import useResizableColumns from '../useResizableColumns.js';
import { requestJson } from '../api.js';
import FilterBar from '../components/FilterBar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { ToastStack, useToasts } from '../components/Toasts.jsx';
import { applyVariant, removeVariants, saveInGroups } from '../catalogState.js';

const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
const label = (location) => location.replace(/_/g, ' ');
const dash = <span className="muted">–</span>;

// A sub-product has no surrogate id - its primary key is the three parts together.
const keyQuery = (row) => new URLSearchParams({
  item_code: row.itemCode,
  flavour_id: String(row.flavourId),
  location: row.location,
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
  { key: 'itemCode', label: 'Product code', filter: 'text', primary: true },
  { key: 'itemName', label: 'Product', filter: 'text', primary: true, format: (v) => <span className="product-name" title={v}>{v}</span> },
  // The code is built from the product and flavour, so it is a label, not a sort key.
  { key: 'variantCode', label: 'Sub-product', filter: 'text', sortable: false, format: (v) => <code>{v}</code> },
  { key: 'category', label: 'Category', filter: 'select', primary: true },
  { key: 'flavour', label: 'Flavour', filter: 'select', primary: true },
  { key: 'locationLabel', label: 'Location', filter: 'select', primary: true },
  { key: 'qty', label: 'Qty', align: 'num', filter: 'number', edit: 'number' },
  { key: 'posQty', label: 'In POS', align: 'num', filter: 'number' },
  {
    key: 'priceValue', label: 'Price', align: 'num', filter: 'number', edit: 'price',
    format: (v, row) => v ? (
      <>{money.format(v)}{row.ownPrice === null && <span className="muted small"> (POS)</span>}</>
    ) : dash,
  },
  {
    key: 'website', label: 'Website', filter: 'select', edit: 'boolean',
    format: (v) => <input type="checkbox" checked={v === 'Visible'} readOnly aria-label={v} />,
  },
];

/** Every sub-product across all products and locations, in one editable list. */
export default function SubProductsPage() {
  const columnsRef = useResizableColumns('sub-products');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: 'itemName', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());
  const [edits, setEdits] = useState({});        // key -> { qty, price, visible_on_web }
  const [pendingDelete, setPendingDelete] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const { toasts, push, dismiss } = useToasts();

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

  // The products endpoint already carries the variants, so this page needs no
  // extra round trip - it just flattens them into one row per sub-product.
  const baseRows = useMemo(() => {
    if (!data) return [];
    return data.products.flatMap((product) => product.variants.map((variant) => ({
      key: variant.key,
      variantCode: variant.variantCode,
      itemCode: product.itemCode,
      itemName: product.itemName,
      category: product.category,
      flavourId: variant.flavourId,
      flavour: variant.flavour,
      location: variant.location,
      locationLabel: label(variant.location),
      qty: variant.qty,
      posQty: product.pos[variant.location] ?? 0,
      productPrice: product.price,
      ownPrice: variant.price,               // null when it inherits the POS price
      priceValue: variant.effectivePrice,
      website: variant.visibleOnWeb ? 'Visible' : 'Hidden',
    })));
  }, [data]);

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
      if (x === y) return String(a.variantCode).localeCompare(String(b.variantCode));
      if (x == null) return 1;
      if (y == null) return -1;
      return (column?.align === 'num' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [baseRows, filters, sort]);

  const totalQty = useMemo(() => rows.reduce((sum, row) => sum + row.qty, 0), [rows]);
  const dirty = Object.keys(edits).length > 0;
  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const reset = () => { setEdits({}); setSelected(new Set()); };

  const toggleSelect = (key) => setSelected((current) => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const draftFor = (row) => ({ qty: row.qty, price: row.ownPrice ?? '', visible_on_web: row.website === 'Visible' });
  const editSelected = () => setEdits((current) => {
    const next = { ...current };
    for (const row of baseRows) if (selected.has(row.key) && !next[row.key]) next[row.key] = draftFor(row);
    return next;
  });
  const editField = (key, field, value) =>
    setEdits((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));

  // Edits to the same product and location must go one at a time - the API
  // checks each against the POS stock still unassigned, and two at once would
  // both read the old figure. Different products save in parallel.
  const save = async () => {
    setBusy('saving');
    try {
      const items = Object.entries(edits)
        .map(([key, draft]) => ({ ...baseRows.find((r) => r.key === key), draft }))
        .filter((item) => item.key);

      const saved = await saveInGroups(items, (item) =>
        requestJson(`/catalog/variants?${keyQuery(item)}`, {
          method: 'PATCH',
          body: {
            qty: Number(item.draft.qty) || 0,
            price: item.draft.price === '' ? null : Number(item.draft.price),
            visible_on_web: item.draft.visible_on_web,
          },
        }).then((body) => body.variant));

      setData((current) => saved.reduce((data, raw) => applyVariant(data, raw), current));
      push('success', 'Changes saved.');
      reset();
    } catch (caught) { push('error', caught.message); }
    finally { setBusy(''); }
  };
  const confirmDelete = async () => {
    setBusy('deleting');
    try {
      // Together, not one by one: deleting only frees assigned stock, so unlike
      // saves there is nothing for concurrent deletes to race.
      const results = await Promise.all(pendingDelete.map((row) =>
        requestJson(`/catalog/variants?${keyQuery(row)}`, { method: 'DELETE' })
          .then(() => ({ ok: true, key: row.key }))
          .catch((caught) => ({ ok: false, message: caught.message }))));

      const gone = results.filter((r) => r.ok).map((r) => r.key);
      if (gone.length) setData((current) => removeVariants(current, gone));
      if (gone.length) push('success', gone.length === 1 ? 'Record deleted.' : `${gone.length} records deleted.`);
      for (const failure of results.filter((r) => !r.ok)) push('error', failure.message);
      setSelected(new Set());
    } catch (caught) { push('error', caught.message); }
    finally { setBusy(''); setPendingDelete(null); }
  };

  if (loading) return <div className="card">Loading…</div>;
  if (error && !data) return <div className="card error">Could not load sub-products: {error}</div>;

  const cell = (row, column) => {
    const draft = edits[row.key];
    const plain = () => column.format ? column.format(row[column.key], row) : row[column.key];
    if (!draft) return plain();
    switch (column.edit) {
      case 'number': return <input type="number" min="0" value={draft.qty} style={{ width: '5rem' }}
        onClick={(e) => e.stopPropagation()} onChange={(e) => editField(row.key, 'qty', e.target.value)} />;
      case 'price': return <input type="number" min="0" step="0.01" value={draft.price} style={{ width: '7rem' }}
        placeholder={row.productPrice ?? ''} onClick={(e) => e.stopPropagation()}
        onChange={(e) => editField(row.key, 'price', e.target.value)} />;
      case 'boolean': return <input type="checkbox" checked={draft.visible_on_web}
        onClick={(e) => e.stopPropagation()} onChange={(e) => editField(row.key, 'visible_on_web', e.target.checked)} />;
      default: return plain();
    }
  };

  return (
    <div className="card">
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Record"
        message={pendingDelete?.length > 1
          ? `Please confirm that you wish to delete these ${pendingDelete.length} records.`
          : 'Please confirm that you wish to delete this record.'}
        busy={busy === 'deleting'}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <FilterBar fields={fields} applied={filters} onApply={setFilters} />

      <div className="line-toolbar">
        <button type="button" className="icon-btn" title="Edit selected" aria-label="Edit selected"
          disabled={Boolean(busy) || selected.size === 0} onClick={editSelected}>✎</button>
        <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete"
          disabled={Boolean(busy) || selected.size === 0}
          onClick={() => setPendingDelete(baseRows.filter((r) => selected.has(r.key)))}>🗑</button>

        {dirty && (
          <>
            <button type="button" className="save-btn" disabled={Boolean(busy)} onClick={save}>
              {busy === 'saving' ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="cancel-btn" disabled={Boolean(busy)} onClick={reset}>Cancel</button>
          </>
        )}

        <span className="muted small toolbar-count">
          {rows.length} of {baseRows.length} sub-products · {totalQty} units
        </span>
        {updatedAt && <span className="muted small">updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        <button type="button" onClick={load}>Refresh</button>
      </div>

      <div className="table-scroll">
        <table ref={columnsRef} className="product-table stock-table">
          <thead>
            <tr>
              <th style={{ width: '2.5rem' }} />
              {COLUMNS.map((column) => (
                <th key={column.key} className={`${column.align === 'num' ? 'num' : ''}${sort.key === column.key ? ' sorted' : ''}`}>
                  {column.sortable === false ? column.label : (
                    <button className="sort-btn" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <span className="sort-arrow">{sort.key === column.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="empty" colSpan={COLUMNS.length + 1}>
                {baseRows.length === 0 ? '(No data)' : 'No sub-products match that filter.'}
              </td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.key}>
                <td onClick={(event) => event.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggleSelect(row.key)}
                    aria-label={`Select ${row.variantCode}`} />
                </td>
                {COLUMNS.map((column) => (
                  <td key={column.key} className={column.align === 'num' ? 'num' : ''}>{cell(row, column)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
