import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Loader, SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core';
import { getJson } from '../api.js';
import ItemTable from '../components/ItemTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { locationName, locationShort } from '../locations.js';
import { money, num } from '../format.jsx';

const qty = (v) => (v ? num.format(v) : <Text span c="dimmed">0</Text>);

export default function StockByLocationPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [location, setLocation] = useState('all');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(() => {
    getJson('/metrics/stock-by-location')
      .then((d) => { setData(d.rows); setUpdatedAt(new Date()); setError(''); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  // The API returns one row per item per location. Fold it into one row per item, and
  // keep only the locations that actually hold something — both lists come from the data.
  const { items, locations } = useMemo(() => {
    if (!data) return { items: [], locations: [] };
    const byItem = new Map();
    const stocked = new Set();
    for (const r of data) {
      const item = byItem.get(r.itemCode)
        ?? { itemCode: r.itemCode, itemName: r.itemName, category: r.category, cost: r.cost, total: 0, stockValue: 0 };
      item[r.location] = r.qty;
      item.total += r.qty;
      item.stockValue += r.qty * r.cost;
      byItem.set(r.itemCode, item);
      if (r.qty) stocked.add(r.location);
    }
    return {
      items: [...byItem.values()],
      locations: [...stocked].sort((a, b) => locationName(a).localeCompare(locationName(b))),
    };
  }, [data]);

  const picked = locations.includes(location) ? location : null;

  // One location: keep only what is held there, and value it at that location's quantity.
  const shown = useMemo(() => (picked ? items.filter((r) => r[picked] > 0) : items), [items, picked]);

  const columns = useMemo(() => [
    { key: 'itemCode', label: 'Code' },
    { key: 'itemName', label: 'Item', format: (v) => <Text span size="sm" fw={500} title={v}>{v}</Text> },
    { key: 'category', label: 'Category' },
    ...(picked
      ? [
          { key: picked, label: `In stock · ${locationName(picked)}`, align: 'num', total: true, format: (v) => <b>{num.format(v)}</b> },
          { key: 'total', label: 'All locations', align: 'num', total: true, format: qty },
        ]
      : [
          ...locations.map((code) => ({ key: code, label: locationName(code), align: 'num', total: true, format: qty })),
          { key: 'total', label: 'Total', align: 'num', total: true, format: (v) => (v ? <b>{num.format(v)}</b> : <Text span c="dimmed">Out of stock</Text>) },
        ]),
  ], [locations, picked]);

  if (error) return <Alert color="red" variant="light" title="Could not load stock">{error}</Alert>;
  if (!data) return <Loader />;

  const inStock = items.filter((r) => r.total > 0).length;
  const sum = (fn) => items.reduce((a, r) => a + fn(r), 0);

  return (
    <Stack gap="lg">
      {/* The tiles double as the location filter: click one to narrow the table to that shop. */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: Math.min(locations.length + 1, 4) }}>
        {locations.map((code) => (
          <StatCard
            key={code}
            label={locationName(code)}
            value={num.format(sum((r) => r[code] ?? 0))}
            hint={`${num.format(items.filter((r) => r[code] > 0).length)} items · ${money.format(sum((r) => (r[code] ?? 0) * r.cost))} at cost`}
            active={location === code}
            onClick={() => setLocation(code)}
          />
        ))}
        <StatCard
          label="All locations"
          value={num.format(sum((r) => r.total))}
          hint={`${inStock} of ${items.length} items in stock · ${money.format(sum((r) => r.stockValue))} at cost`}
          active={location === 'all'}
          onClick={() => setLocation('all')}
        />
      </SimpleGrid>

      <ItemTable
        rows={shown}
        columns={columns}
        searchKeys={['itemName', 'itemCode', 'category']}
        filterKey="category"
        filterLabel="Category"
        stockKey="total"
        onRefresh={load}
        updatedAt={updatedAt}
        initialSort={{ key: 'total', dir: 'desc' }}
        toolbarExtra={(
          <SegmentedControl aria-label="Location" value={picked ?? 'all'} onChange={setLocation}
            data={[{ value: 'all', label: 'All' }, ...locations.map((code) => ({ value: code, label: locationShort(code) }))]} />
        )}
        emptyText={picked ? `No stock at ${locationName(picked)} matches that search.` : 'No items match that search.'}
      />
    </Stack>
  );
}
