import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Checkbox, Code, Loader, NumberInput, Paper, TextInput } from '@mantine/core';
import { requestJson } from '../api.js';
import FilterBar, { filterFields, matches } from '../components/FilterBar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataGrid from '../components/DataGrid.jsx';
import LineToolbar from '../components/LineToolbar.jsx';
import { notify } from '../notify.js';

const COLUMNS = [
  { key: 'name', label: 'Flavour', filter: 'text', primary: true, edit: 'text' },
  // No `edit`: sub-product codes are built from this (PRT060-CHOC), so changing
  // it would rename every sub-product using the flavour. Set once, at creation.
  { key: 'code', label: 'Code', filter: 'text', primary: true, format: (v) => <Code>{v}</Code> },
  // Dropdown order. Not sortable itself - it IS the ordering.
  { key: 'sort_order', label: 'Sort', align: 'num', filter: 'number', edit: 'number', sortable: false },
  {
    key: 'status', label: 'Active', filter: 'select', primary: true, edit: 'boolean',
    format: (v) => <Checkbox size="xs" checked={v === 'Yes'} readOnly aria-label={v === 'Yes' ? 'Active' : 'Inactive'} />,
  },
];

const blankLine = { name: '', code: '', sort_order: 0, active: true };

export default function FlavoursPage() {
  const [flavours, setFlavours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: 'sort_order', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());   // row ids as strings
  const [edits, setEdits] = useState({});      // id -> { name, sort_order, active }
  const [newLine, setNewLine] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await requestJson('/catalog/flavours');
      setFlavours(data.flavours);
      setUpdatedAt(new Date());
      setError('');
    } catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const baseRows = useMemo(() => flavours.map((flavour) => ({
    ...flavour,
    status: flavour.active ? 'Yes' : 'No',
  })), [flavours]);

  const fields = useMemo(() => filterFields(COLUMNS, baseRows), [baseRows]);

  const rows = useMemo(() => {
    const picked = baseRows.filter((row) =>
      COLUMNS.every((column) => !column.filter || matches(row, column, filters[column.key])));
    const column = COLUMNS.find((c) => c.key === sort.key);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...picked].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x === y) return String(a.name).localeCompare(String(b.name));
      if (x == null) return 1;
      if (y == null) return -1;
      return (column?.align === 'num' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [baseRows, filters, sort]);

  const dirty = newLine !== null || Object.keys(edits).length > 0;
  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const reset = () => { setEdits({}); setNewLine(null); setSelected(new Set()); };

  const toggleSelect = (id) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const draftFor = (row) => ({ name: row.name, sort_order: row.sort_order, active: row.active });
  const editSelected = () => setEdits((current) => {
    const next = { ...current };
    for (const row of baseRows) if (selected.has(String(row.id)) && !next[row.id]) next[row.id] = draftFor(row);
    return next;
  });
  const editField = (id, field, value) =>
    setEdits((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));

  const save = async () => {
    setBusy('saving');
    try {
      for (const [id, draft] of Object.entries(edits)) {
        await requestJson(`/catalog/flavours/${id}`, {
          method: 'PATCH',
          body: { name: draft.name, sort_order: Number(draft.sort_order) || 0, active: draft.active },
        });
      }
      if (newLine) {
        await requestJson('/catalog/flavours', {
          method: 'POST',
          body: { name: newLine.name, code: newLine.code, sort_order: Number(newLine.sort_order) || 0 },
        });
      }
      await load();
      notify.success('Changes saved.');
      reset();
    } catch (caught) { notify.error(caught.message); }
    finally { setBusy(''); }
  };

  // Deletes run together - unlike saves they have no ordering constraint. Each
  // result is reported separately so one refusal does not hide the successes.
  const confirmDelete = async () => {
    setBusy('deleting');
    const results = await Promise.all(pendingDelete.map((row) =>
      requestJson(`/catalog/flavours/${row.id}`, { method: 'DELETE' })
        .then(() => ({ ok: true }))
        .catch((caught) => ({ ok: false, message: caught.message }))));

    const failed = results.filter((r) => !r.ok);
    const removed = results.length - failed.length;
    if (removed) notify.success(removed === 1 ? 'Record deleted.' : `${removed} records deleted.`);
    for (const failure of failed) notify.error(failure.message);

    await load();
    setSelected(new Set());
    setBusy(''); setPendingDelete(null);
  };

  const columns = useMemo(() => COLUMNS.map((column) => ({
    ...column,
    render: (row) => {
      const draft = edits[row.id];
      const plain = () => (column.format ? column.format(row[column.key], row) : row[column.key]);
      if (!draft) return plain();
      switch (column.edit) {
        case 'text': return <TextInput size="xs" w={200} value={draft.name} aria-label="Flavour name"
          onChange={(e) => editField(row.id, 'name', e.currentTarget.value)} />;
        case 'number': return <NumberInput size="xs" w={90} ml="auto" value={draft.sort_order} aria-label="Sort order"
          onChange={(v) => editField(row.id, 'sort_order', v)} />;
        case 'boolean': return <Checkbox size="xs" checked={draft.active} aria-label="Active"
          onChange={(e) => editField(row.id, 'active', e.currentTarget.checked)} />;
        default: return plain();
      }
    },
  })), [edits]);

  if (loading) return <Loader />;
  if (error && flavours.length === 0) return <Alert color="red" variant="light" title="Could not load flavours">{error}</Alert>;

  const extraRow = newLine && {
    control: <Checkbox size="xs" checked readOnly aria-label="New line" />,
    cells: {
      name: <TextInput size="xs" w={200} autoFocus placeholder="Flavour name" value={newLine.name} aria-label="Flavour name"
        onChange={(e) => setNewLine({ ...newLine, name: e.currentTarget.value })} />,
      code: <TextInput size="xs" w={110} placeholder="CODE" maxLength={10} value={newLine.code} aria-label="Code"
        onChange={(e) => setNewLine({ ...newLine, code: e.currentTarget.value.toUpperCase() })} />,
      sort_order: <NumberInput size="xs" w={90} ml="auto" value={newLine.sort_order} aria-label="Sort order"
        onChange={(v) => setNewLine({ ...newLine, sort_order: v })} />,
      status: <Checkbox size="xs" checked readOnly aria-label="Active" />,
    },
  };

  return (
    <Paper>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete record"
        message={pendingDelete?.length > 1
          ? `Please confirm that you wish to delete these ${pendingDelete.length} records.`
          : 'Please confirm that you wish to delete this record.'}
        busy={busy === 'deleting'}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <FilterBar fields={fields} applied={filters} onApply={setFilters} />

      <LineToolbar
        onNew={() => setNewLine(blankLine)} newDisabled={Boolean(busy) || newLine !== null}
        onEdit={editSelected} editDisabled={Boolean(busy) || selected.size === 0}
        onDelete={() => setPendingDelete(baseRows.filter((r) => selected.has(String(r.id))))}
        deleteDisabled={Boolean(busy) || selected.size === 0}
        dirty={dirty} saving={busy === 'saving'}
        saveDisabled={Boolean(busy && busy !== 'saving') || (newLine && (!newLine.name.trim() || !newLine.code.trim()))}
        onSave={save} onCancel={reset} cancelLabel={newLine ? 'Cancel new' : 'Cancel'}
        info={`${rows.length} of ${baseRows.length}`} updatedAt={updatedAt} onRefresh={load}
      />

      <DataGrid
        storageKey="flavours"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        sort={sort}
        onSort={toggleSort}
        selected={selected}
        onToggleSelect={toggleSelect}
        extraRow={extraRow}
        emptyText="(No data)"
      />
    </Paper>
  );
}
