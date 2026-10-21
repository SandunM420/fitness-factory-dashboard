import { useCallback, useEffect, useState } from 'react';
import { Alert, Loader, Text } from '@mantine/core';
import { getJson } from '../api.js';
import ItemTable from '../components/ItemTable.jsx';
import { Dash, money, num } from '../format.jsx';

const dash = (v, fmt) => (v ? fmt(v) : <Dash />);

const COLUMNS = [
  { key: 'itemCode', label: 'Code' },
  { key: 'itemName', label: 'Item', format: (v) => <Text span size="sm" fw={500} title={v}>{v}</Text> },
  { key: 'category', label: 'Category' },
  { key: 'cost', label: 'Cost', align: 'num', hint: 'Current unit cost (Stock.cprice)', format: (v) => dash(v, money.format) },
  { key: 'retail', label: 'Retail', align: 'num', hint: 'Selling price charged at the till', format: (v) => dash(v, money.format) },
  { key: 'wholesale', label: 'Wholesale', align: 'num', format: (v) => dash(v, money.format) },
  {
    key: 'margin',
    label: 'Margin',
    align: 'num',
    hint: '(retail − cost) ÷ retail',
    format: (v) => (v === null || v === undefined ? <Dash /> : `${Math.round(v * 100)}%`),
  },
  { key: 'stock', label: 'In stock', align: 'num', total: true, format: (v) => (v ? num.format(v) : <Text span c="dimmed">0</Text>) },
];

export default function ItemPricesPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(() => {
    getJson('/metrics/item-prices')
      .then((d) => { setRows(d.rows); setUpdatedAt(new Date()); setError(''); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <Alert color="red" variant="light" title="Could not load items">{error}</Alert>;
  if (!rows) return <Loader />;

  return (
    <ItemTable
      rows={rows}
      columns={COLUMNS}
      searchKeys={['itemName', 'itemCode', 'category']}
      filterKey="category"
      filterLabel="Category"
      onRefresh={load}
      updatedAt={updatedAt}
      stockKey="stock"
      initialSort={{ key: 'itemName', dir: 'asc' }}
      emptyText="No items match that search."
    />
  );
}
