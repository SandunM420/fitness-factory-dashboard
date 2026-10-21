import { useCallback, useEffect, useState } from 'react';
import { getJson } from '../api.js';
import ItemTable from '../components/ItemTable.jsx';

const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat();
const dash = (v, fmt) => (v ? fmt(v) : <span className="muted">–</span>);

const COLUMNS = [
  { key: 'itemCode', label: 'Code' },
  { key: 'itemName', label: 'Item', format: (v) => <span className="product-name" title={v}>{v}</span> },
  { key: 'category', label: 'Category' },
  { key: 'cost', label: 'Cost', align: 'num', hint: 'Current unit cost (Stock.cprice)', format: (v) => dash(v, money.format) },
  { key: 'retail', label: 'Retail', align: 'num', hint: 'Selling price charged at the till', format: (v) => dash(v, money.format) },
  { key: 'wholesale', label: 'Wholesale', align: 'num', format: (v) => dash(v, money.format) },
  {
    key: 'margin',
    label: 'Margin',
    align: 'num',
    hint: '(retail − cost) ÷ retail',
    format: (v) => (v === null || v === undefined ? <span className="muted">–</span> : `${Math.round(v * 100)}%`),
  },
  { key: 'stock', label: 'In stock', align: 'num', total: true, format: (v) => (v ? num.format(v) : <span className="muted">0</span>) },
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

  if (error) return <div className="card error">Could not load items: {error}</div>;
  if (!rows) return <div className="card">Loading…</div>;

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
