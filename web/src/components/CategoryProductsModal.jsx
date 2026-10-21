import { useEffect, useMemo, useState } from 'react';
import { Alert, Group, Loader, Modal, Paper, Progress, Select, SimpleGrid, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { getJson } from '../api.js';
import DataGrid from './DataGrid.jsx';
import { Dash, MONTHS, money, num } from '../format.jsx';

// Pop-up window listing every product in a category for a year/month, sortable by any column.
export default function CategoryProductsModal({ category, years, initialYear, initialMonth, initialSort, onClose }) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth ?? '0');
  const [sort, setSort] = useState({ key: initialSort, dir: 'desc' });
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getJson(`/metrics/category-products?year=${year}&month=${month}&category=${encodeURIComponent(category)}`)
      .then((d) => !cancelled && setRows(d.rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [category, year, month]);

  const totals = useMemo(() => {
    const list = rows ?? [];
    return {
      qty: list.reduce((s, r) => s + r.qty, 0),
      revenue: list.reduce((s, r) => s + r.revenue, 0),
      sold: list.filter((r) => r.qty > 0).length,
      all: list.length,
    };
  }, [rows]);

  const shareKey = sort.key === 'revenue' ? 'revenue' : 'qty';

  const products = useMemo(() => {
    const list = (rows ?? []).map((r) => ({
      ...r,
      avgPrice: r.qty ? r.revenue / r.qty : 0,
      share: totals[shareKey] ? (r[shareKey] / totals[shareKey]) * 100 : 0,
    }));
    // Rank by units sold (highest first) regardless of how the table is sorted.
    [...list].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).forEach((r, i) => { r.rank = r.qty > 0 ? i + 1 : null; });

    const dir = sort.dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return cmp * dir || b.qty - a.qty;
    });

    const q = search.trim().toLowerCase();
    return q ? list.filter((r) => `${r.itemName} ${r.itemCode}`.toLowerCase().includes(q)) : list;
  }, [rows, sort, search, totals, shareKey]);

  const toggleSort = (key) => setSort((s) => (s.key === key
    ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
    : { key, dir: key === 'itemName' ? 'asc' : 'desc' }));

  const isCurrentYear = Number(year) === new Date().getFullYear();
  const monthLabel = MONTHS.find((m) => m.value === month)?.label;
  const periodLabel = month === '0' ? year : `${monthLabel} ${year}`;

  const columns = [
    { key: 'rank', label: '#', align: 'num', sortable: false, render: (r) => <Text span size="sm" c="dimmed">{r.rank ?? '–'}</Text> },
    {
      key: 'itemName', label: 'Product',
      render: (r) => (<><Text size="sm" fw={500} truncate title={r.itemName}>{r.itemName}</Text><Text size="xs" c="dimmed">{r.itemCode}</Text></>),
    },
    { key: 'qty', label: 'Units sold', align: 'num', render: (r) => <b>{num.format(r.qty)}</b> },
    { key: 'revenue', label: 'Revenue', align: 'num', render: (r) => money.format(r.revenue) },
    { key: 'avgPrice', label: 'Avg. price', align: 'num', render: (r) => (r.qty ? money.format(r.avgPrice) : <Dash />) },
    {
      key: 'costPerUnit', label: 'Cost per unit', align: 'num',
      render: (r) => (
        <span title={r.costSource === 'current'
          ? 'No sales this year: current cost from the stock list'
          : 'Average cost at time of sale, weighted by units sold'}>
          {r.costPerUnit == null ? <Dash /> : money.format(r.costPerUnit)}
          {r.costSource === 'current' && <Text span c="dimmed"> *</Text>}
        </span>
      ),
    },
    { key: 'invoices', label: 'Invoices', align: 'num', render: (r) => num.format(r.invoices) },
    {
      key: 'share', label: `Share of ${shareKey === 'revenue' ? 'revenue' : 'units'}`, align: 'num',
      render: (r) => (
        <Group gap="xs" wrap="nowrap" justify="flex-end">
          <Progress value={Math.min(100, r.share)} size="sm" w={60} />
          <span>{r.share.toFixed(1)}%</span>
        </Group>
      ),
    },
    { key: 'lastSold', label: 'Last sold', align: 'num', render: (r) => (r.lastSold ? r.lastSold.slice(0, 10) : <Text span size="sm" c="dimmed">No sales</Text>) },
  ];

  return (
    <Modal opened onClose={onClose} size="min(1200px, 100%)" centered
      title={<><Text size="xs" tt="uppercase" fw={700} c="blue.4" lts={0.5}>Category</Text><Text fw={700} fz="lg">{category}</Text></>}>
      <Group gap="sm" mb="md" align="flex-end">
        <Select label="Year" size="xs" w={100} allowDeselect={false} data={years.map(String)} value={year} onChange={(v) => v && setYear(v)} />
        <Select label="Month" size="xs" w={140} allowDeselect={false} data={MONTHS} value={month} onChange={(v) => v && setMonth(v)} />
        <TextInput size="xs" placeholder="Search products…" leftSection={<IconSearch size={14} />} w={240}
          value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
        {loading && <Loader size="xs" />}
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="md">
        {[
          ['Units sold', num.format(totals.qty)],
          ['Revenue', money.format(totals.revenue)],
          ['Products sold', <>{num.format(totals.sold)} <Text span size="xs" c="dimmed">of {num.format(totals.all)}</Text></>],
          ['Period', <>{periodLabel}{month === '0' && isCurrentYear && <Text span size="xs" c="dimmed"> year to date</Text>}</>],
        ].map(([label, value]) => (
          <Paper key={label} p="sm" bg="var(--mantine-color-dark-7)">
            <Text size="xs" c="dimmed">{label}</Text>
            <Text fw={700}>{value}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}

      <DataGrid
        storageKey="category-products"
        rows={products}
        columns={columns}
        getRowId={(r) => r.itemCode}
        sort={sort}
        onSort={toggleSort}
        rowProps={(r) => (r.qty === 0 ? { c: 'dimmed' } : {})}
        emptyText="No products match."
        maxHeight="calc(100vh - 380px)"
      />
      <Text size="xs" c="dimmed" mt="sm">
        Cost per unit is the average cost at the time of sale, weighted by units sold.
        {products.some((r) => r.costSource === 'current') && ' * No sales this year: current cost from the stock list.'}
      </Text>
    </Modal>
  );
}
