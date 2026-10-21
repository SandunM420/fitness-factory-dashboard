import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Loader, Paper, Text } from '@mantine/core';
import { requestJson } from '../api.js';
import FilterBar, { filterFields, matches } from '../components/FilterBar.jsx';
import SubProductGrid from '../components/SubProductGrid.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataGrid from '../components/DataGrid.jsx';
import LineToolbar from '../components/LineToolbar.jsx';
import { applyVariant, removeVariants } from '../catalogState.js';
import { Dash, money } from '../format.jsx';
import { notify } from '../notify.js';

const label = (location) => location.replace(/_/g, ' ');

// A sub-product has no surrogate id - its primary key is the three parts together.
const keyQuery = (variant) => new URLSearchParams({
  item_code: variant.itemCode,
  flavour_id: String(variant.flavourId),
  location: variant.location,
}).toString();

const COLUMNS = [
  { key: 'itemCode', label: 'Code', filter: 'text', primary: true },
  { key: 'itemName', label: 'Item', filter: 'text', primary: true, format: (v) => <Text span size="sm" fw={500} title={v}>{v}</Text> },
  { key: 'category', label: 'Category', filter: 'select', primary: true },
  { key: 'locationLabel', label: 'Location', filter: 'select', primary: true },
  { key: 'cost', label: 'Cost', align: 'num', filter: 'number', format: (v) => (v ? money.format(v) : <Dash />) },
  { key: 'price', label: 'Retail', align: 'num', filter: 'number', format: (v) => (v ? money.format(v) : <Dash />) },
  { key: 'posTotal', label: 'In POS', align: 'num', filter: 'number' },
  { key: 'assignedTotal', label: 'Assigned', align: 'num', filter: 'number' },
  {
    key: 'unassignedTotal',
    label: 'Unassigned',
    align: 'num',
    filter: 'number',
    // Orange: stock not yet split into flavours. Red: more assigned than the POS holds.
    format: (v) => (v === 0 ? <Dash /> : <Text span size="sm" fw={600} c={v > 0 ? 'orange.4' : 'red.4'}>{v > 0 ? v : `+${Math.abs(v)}`}</Text>),
  },
  { key: 'flavourCount', label: 'Flavours', align: 'num', filter: 'number', format: (v) => (v || <Dash />) },
];

export default function WebsiteStockPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const fields = useMemo(() => filterFields(COLUMNS, baseRows), [baseRows]);

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
        notify.success('Sub-product saved.');
      })
      .catch((caught) => notify.error(caught.message))
      .finally(() => setBusy(''));
  };

  const patchVariant = (variant, body) => {
    setBusy(variant.key);
    return requestJson(`/catalog/variants?${keyQuery(variant)}`, { method: 'PATCH', body })
      .then((result) => {
        setData((current) => applyVariant(current, result.variant));
        notify.success('Sub-product saved.');
      })
      .catch((caught) => notify.error(caught.message))
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
      if (gone.length) notify.success(gone.length === 1 ? 'Record deleted.' : `${gone.length} records deleted.`);
      for (const failure of results.filter((r) => !r.ok)) notify.error(failure.message);
      done?.();
    } catch (caught) { notify.error(caught.message); }
    finally { setBusy(''); setPendingDelete(null); }
  };
  const columns = useMemo(() => COLUMNS.map((column) => ({
    ...column,
    render: (row) => (column.format ? column.format(row[column.key], row) : row[column.key]),
  })), []);

  if (loading) return <Loader />;
  if (error && !data) return <Alert color="red" variant="light" title="Could not load products">{error}</Alert>;

  return (
    <Paper>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete record"
        message={pendingDelete?.variants.length > 1
          ? `Please confirm that you wish to delete these ${pendingDelete.variants.length} records.`
          : 'Please confirm that you wish to delete this record.'}
        busy={busy === 'deleting'}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <FilterBar fields={fields} applied={filters} onApply={setFilters} />

      <LineToolbar info={`${rows.length} of ${baseRows.length} rows`} updatedAt={updatedAt} onRefresh={load} />

      <DataGrid
        storageKey="website-stock"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.rowKey}
        sort={sort}
        onSort={toggleSort}
        expanded={open}
        onToggleExpand={toggleRow}
        renderExpanded={(row) => (
          <SubProductGrid
            row={row}
            flavours={data.flavours}
            busy={busy}
            onCreate={addVariant}
            onUpdate={patchVariant}
            onDelete={remove}
          />
        )}
        emptyText="No rows match that filter."
      />
    </Paper>
  );
}
