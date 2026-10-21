import { useMemo, useState } from 'react';
import { Button, Group, Paper, Select, Text, TextInput } from '@mantine/core';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import DataGrid from './DataGrid.jsx';
import { shortTime } from '../format.jsx';

const STOCK_OPTIONS = [
  { value: 'all', label: 'Any stock' },
  { value: 'in', label: 'In stock' },
  { value: 'out', label: 'Out of stock' },
  { value: 'low', label: 'Low (1-5)' },
];

/**
 * Searchable, sortable table for the item master pages.
 * `columns` is [{ key, label, align, format, total, hint }] — `total` marks a column
 * that gets summed in the footer row.
 */
export default function ItemTable({ rows, columns, searchKeys, filterKey, filterLabel, stockKey, initialSort, toolbarExtra, onRefresh, updatedAt, emptyText = 'Nothing to show.' }) {
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

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  // The rank column numbers rows in their CURRENT order, so it is looked up, not stored.
  const position = useMemo(() => new Map(shown.map((r, index) => [r.itemCode, index + 1])), [shown]);
  const gridColumns = useMemo(() => [
    { key: '#rank', label: '#', sortable: false, render: (r) => <Text span size="sm" c="dimmed">{position.get(r.itemCode)}</Text> },
    ...columns.map((c, index) => {
      const total = c.total ? shown.reduce((a, r) => a + (r[c.key] ?? 0), 0) : undefined;
      return {
        key: c.key,
        label: c.label,
        align: c.align,
        hint: c.hint,
        render: (r) => (c.format ? c.format(r[c.key], r) : r[c.key]),
        footer: c.total ? (c.format ? c.format(total, null) : total) : index === 0 ? 'Total' : null,
      };
    }),
  ], [columns, shown, position]);

  return (
    <Paper>
      <Group gap="sm" mb="md" wrap="wrap">
        {toolbarExtra}
        <TextInput placeholder="Search name or code…" leftSection={<IconSearch size={16} />} value={search}
          onChange={(e) => setSearch(e.currentTarget.value)} aria-label="Search items" style={{ flex: '1 1 220px' }} maw={360} />
        {filterKey && (
          <Select aria-label={filterLabel} placeholder={filterLabel} searchable allowDeselect={false} w={200}
            data={[{ value: 'all', label: `Any ${filterLabel.toLowerCase()}` }, ...filterValues.map((v) => ({ value: v, label: v }))]}
            value={filter} onChange={(v) => setFilter(v ?? 'all')} />
        )}
        {stockKey && (
          <Select aria-label="Stock" allowDeselect={false} w={150} data={STOCK_OPTIONS}
            value={stock} onChange={(v) => setStock(v ?? 'all')} />
        )}
        <Text size="sm" c="dimmed" ml="auto">
          {shown.length} of {rows.length} items{updatedAt && ` · updated ${shortTime(updatedAt)}`}
        </Text>
        {onRefresh && <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={onRefresh}>Refresh</Button>}
      </Group>

      <DataGrid
        storageKey={`items-${columns.map((c) => c.key).join('-')}`}
        rows={shown}
        columns={gridColumns}
        getRowId={(r) => r.itemCode}
        sort={sort}
        onSort={toggleSort}
        showFooter={columns.some((c) => c.total)}
        emptyText={emptyText}
      />
    </Paper>
  );
}
