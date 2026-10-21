import { useCallback, useEffect, useMemo, useState } from 'react';
import useResizableColumns from '../useResizableColumns.js';
import { requestJson } from '../api.js';
import FilterBar from '../components/FilterBar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { ToastStack, useToasts } from '../components/Toasts.jsx';

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
  { key: 'name', label: 'Flavour', filter: 'text', primary: true, edit: 'text' },
  // No `edit`: sub-product codes are built from this (PRT060-CHOC), so changing
  // it would rename every sub-product using the flavour. Set once, at creation.
  { key: 'code', label: 'Code', filter: 'text', primary: true, format: (v) => <code>{v}</code> },
  // Dropdown order. Not sortable itself - it IS the ordering.
  { key: 'sort_order', label: 'Sort', align: 'num', filter: 'number', edit: 'number', sortable: false },
  {
    key: 'status', label: 'Active', filter: 'select', primary: true, edit: 'boolean',
    format: (v) => <input type="checkbox" checked={v === 'Yes'} readOnly aria-label={v === 'Yes' ? 'Active' : 'Inactive'} />,
  },
];

const blankLine = { name: '', code: '', sort_order: 0, active: true };

export default function FlavoursPage() {
  const columnsRef = useResizableColumns('flavours');
  const [flavours, setFlavours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: 'sort_order', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());
  const [edits, setEdits] = useState({});      // id -> { name, code, sort_order, active }
  const [newLine, setNewLine] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const { toasts, push, dismiss } = useToasts();

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
    for (const row of baseRows) if (selected.has(row.id) && !next[row.id]) next[row.id] = draftFor(row);
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
      push('success', 'Changes saved.');
      reset();
    } catch (caught) { push('error', caught.message); }
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
    if (removed) push('success', removed === 1 ? 'Record deleted.' : `${removed} records deleted.`);
    for (const failure of failed) push('error', failure.message);

    await load();
    setSelected(new Set());
    setBusy(''); setPendingDelete(null);
  };
  if (loading) return <div className="card">Loading…</div>;
  if (error && flavours.length === 0) return <div className="card error">Could not load flavours: {error}</div>;

  const cell = (row, column) => {
    const draft = edits[row.id];
    if (!draft) return column.format ? column.format(row[column.key], row) : row[column.key];
    switch (column.edit) {
      case 'text': return <input value={draft[column.key]} style={{ width: column.key === 'code' ? '7rem' : '12rem' }}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => editField(row.id, column.key, column.key === 'code' ? e.target.value.toUpperCase() : e.target.value)} />;
      case 'number': return <input type="number" value={draft.sort_order} style={{ width: '5rem' }}
        onClick={(e) => e.stopPropagation()} onChange={(e) => editField(row.id, 'sort_order', e.target.value)} />;
      case 'boolean': return <input type="checkbox" checked={draft.active}
        onClick={(e) => e.stopPropagation()} onChange={(e) => editField(row.id, 'active', e.target.checked)} />;
      default: return column.format ? column.format(row[column.key], row) : row[column.key];
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
        <button type="button" className="icon-btn" title="New line" aria-label="New line"
          disabled={Boolean(busy) || newLine !== null} onClick={() => setNewLine(blankLine)}>+</button>
        <button type="button" className="icon-btn" title="Edit selected" aria-label="Edit selected"
          disabled={Boolean(busy) || selected.size === 0} onClick={editSelected}>✎</button>
        <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete"
          disabled={Boolean(busy) || selected.size === 0}
          onClick={() => setPendingDelete(baseRows.filter((r) => selected.has(r.id)))}>🗑</button>

        {dirty && (
          <>
            <button type="button" className="save-btn"
              disabled={Boolean(busy) || (newLine && (!newLine.name.trim() || !newLine.code.trim()))} onClick={save}>
              {busy === 'saving' ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="cancel-btn" disabled={Boolean(busy)} onClick={reset}>
              {newLine ? 'Cancel New' : 'Cancel'}
            </button>
          </>
        )}

        <span className="muted small toolbar-count">{rows.length} of {baseRows.length}</span>
        {updatedAt && (
          <span className="muted small">updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
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
            {rows.length === 0 && !newLine && (
              <tr><td className="empty" colSpan={COLUMNS.length + 1}>(No data)</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td onClick={(event) => event.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)}
                    aria-label={`Select ${row.name}`} />
                </td>
                {COLUMNS.map((column) => (
                  <td key={column.key} className={column.align === 'num' ? 'num' : ''}>{cell(row, column)}</td>
                ))}
              </tr>
            ))}

            {newLine && (
              <tr className="is-new">
                <td><input type="checkbox" checked readOnly aria-label="New line" /></td>
                <td>
                  <input autoFocus placeholder="Flavour name" value={newLine.name} style={{ width: '12rem' }}
                    onChange={(event) => setNewLine({ ...newLine, name: event.target.value })} />
                </td>
                <td>
                  <input placeholder="CODE" value={newLine.code} maxLength={10} style={{ width: '7rem' }}
                    onChange={(event) => setNewLine({ ...newLine, code: event.target.value.toUpperCase() })} />
                </td>
                <td className="num">
                  <input type="number" value={newLine.sort_order} style={{ width: '5rem' }}
                    onChange={(event) => setNewLine({ ...newLine, sort_order: event.target.value })} />
                </td>
                <td><input type="checkbox" checked readOnly aria-label="Active" /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
