import { useMemo } from 'react';
import { Text } from '@mantine/core';
import DataGrid from './DataGrid.jsx';

const ISO_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d+)?Z?$/;

/** Any rows from the database, columns taken from the first row. Used by the explorer and table metrics. */
export default function DataTable({ rows, maxHeight }) {
  const keys = useMemo(() => (rows.length ? Object.keys(rows[0]) : []), [rows]);
  const columns = useMemo(() => keys.map((key) => ({
    key,
    label: key,
    hint: key,
    sortable: false,
    align: isNumericColumn(rows, key) ? 'num' : undefined,
    render: (row) => {
      const text = formatCell(row[key]);
      return text === null
        ? <Text span size="sm" c="dimmed">NULL</Text>
        : <Text span size="sm" title={text} style={{ whiteSpace: 'nowrap' }}>{text}</Text>;
    },
  })), [rows, keys]);

  if (!rows.length) return <Text c="dimmed">No rows</Text>;

  // Rows have no id of their own, so they are keyed by position.
  const indexed = rows.map((row, index) => ({ ...row, '#row': index }));
  return (
    <DataGrid storageKey={`explorer.${keys.join('|')}`} rows={indexed} columns={columns}
      getRowId={(row) => row['#row']} maxHeight={maxHeight ?? 'calc(100vh - 220px)'} />
  );
}

function formatCell(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  const m = ISO_RE.exec(v);
  if (m) return m[2] === '00:00:00' ? m[1] : `${m[1]} ${m[2]}`;
  return String(v);
}

function isNumericColumn(rows, col) {
  let seen = false;
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined) continue;
    if (typeof v !== 'number') return false;
    seen = true;
  }
  return seen;
}
