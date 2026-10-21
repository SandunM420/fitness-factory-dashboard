import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Badge, Box, Group, Paper, Progress, SegmentedControl, Select, SimpleGrid, Stack, Text, Title, UnstyledButton,
} from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { getJson } from '../api.js';
import CategoryProductsModal from './CategoryProductsModal.jsx';
import { MONTHS, money, num } from '../format.jsx';

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const TOP_OPTIONS = [{ value: '1', label: 'Top 1' }, { value: '3', label: 'Top 3' }, { value: '5', label: 'Top 5' }];

// Best-selling item(s) in every category for a chosen year.
export default function CategoryLeaders({ metric }) {
  const [years, setYears] = useState([]);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('0');
  const [rankBy, setRankBy] = useState('qty');
  const [top, setTop] = useState(1);
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openCategory, setOpenCategory] = useState(null);

  useEffect(() => {
    getJson('/metrics/invoice-years')
      .then((d) => {
        const list = d.rows.map((r) => r.year);
        setYears(list);
        setYear(String(list[0] ?? new Date().getFullYear()));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!year) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getJson(`/metrics/${metric.id}?year=${year}&month=${month}&rankBy=${rankBy}&top=${top}`)
      .then((d) => !cancelled && setRows(d.rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [metric.id, year, month, rankBy, top]);

  // Group ranked rows by category, keeping the server's order (highest-revenue category first).
  const categories = useMemo(() => {
    const map = new Map();
    for (const r of rows ?? []) {
      if (!map.has(r.category)) map.set(r.category, { ...r, items: [] });
      map.get(r.category).items.push(r);
    }
    return [...map.values()];
  }, [rows]);

  const isCurrentYear = Number(year) === new Date().getFullYear();
  const monthLabel = MONTHS.find((m) => m.value === month)?.label;
  const periodLabel = month === '0' ? year : `${monthLabel} ${year}`;
  const byRevenue = rankBy === 'revenue';

  return (
    <Paper style={{ gridColumn: '1 / -1' }}>
      <Group justify="space-between" align="flex-end" mb="md" gap="sm">
        <div>
          <Title order={3} size="h5">{metric.title}</Title>
          <Text size="sm" c="dimmed">
            Top {top === 1 ? 'item' : `${top} items`} in each category by {byRevenue ? 'revenue' : 'units sold'}
            {year && ` · ${periodLabel}`}{month === '0' && isCurrentYear && ' (year to date)'}
            {loading && ' · loading…'}
          </Text>
        </div>
        <Group gap="sm" align="flex-end">
          <Select label="Year" size="xs" w={100} allowDeselect={false} disabled={!years.length}
            data={years.map(String)} value={year || null} onChange={(v) => v && setYear(v)} />
          <Select label="Month" size="xs" w={140} allowDeselect={false} data={MONTHS} value={month} onChange={(v) => v && setMonth(v)} />
          <SegmentedControl size="xs" aria-label="Rank by" value={rankBy} onChange={setRankBy}
            data={[{ value: 'qty', label: 'Units sold' }, { value: 'revenue', label: 'Revenue' }]} />
          <Select label="Show" size="xs" w={100} allowDeselect={false} data={TOP_OPTIONS}
            value={String(top)} onChange={(v) => v && setTop(Number(v))} />
        </Group>
      </Group>

      {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
      {rows && !categories.length && <Text c="dimmed">No sales recorded in {periodLabel}.</Text>}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        {categories.map((c) => {
          const [best, ...rest] = c.items;
          const share = byRevenue ? pct(best.revenue, c.categoryRevenue) : pct(best.qty, c.categoryQty);
          return (
            <UnstyledButton key={c.category} onClick={() => setOpenCategory(c.category)} title={`View all ${c.category} products`}>
              <Paper p="md" h="100%" bg="var(--mantine-color-dark-7)" className="hover-lift">
                <Stack gap="sm">
                  <div>
                    <Text size="xs" tt="uppercase" fw={700} c="blue.4" lts={0.5}>{c.category}</Text>
                    <Text size="xs" c="dimmed">{num.format(c.categoryQty)} units · {money.format(c.categoryRevenue)}</Text>
                  </div>

                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <Badge size="lg" variant="filled" radius="sm" style={{ flexShrink: 0 }}>#1</Badge>
                    <Box style={{ minWidth: 0 }}>
                      <Text fw={600} size="sm" lineClamp={2} title={best.itemName}>{best.itemName}</Text>
                      <Text size="xs" c="dimmed">{best.itemCode}</Text>
                    </Box>
                  </Group>

                  <Group gap="lg" wrap="wrap">
                    {[
                      ['Units sold', num.format(best.qty), !byRevenue],
                      ['Revenue', money.format(best.revenue), byRevenue],
                      ['Invoices', num.format(best.invoices), false],
                    ].map(([label, value, primary]) => (
                      <div key={label}>
                        <Text size="xs" c="dimmed">{label}</Text>
                        <Text size="sm" fw={primary ? 700 : 500} c={primary ? 'blue.4' : undefined} style={{ whiteSpace: 'nowrap' }}>{value}</Text>
                      </div>
                    ))}
                  </Group>

                  <div title={`${share}% of category ${byRevenue ? 'revenue' : 'units'}`}>
                    <Progress value={share} size="sm" />
                    <Text size="xs" c="dimmed" mt={4}>{share}% of category {byRevenue ? 'revenue' : 'units'}</Text>
                  </div>

                  {rest.length > 0 && (
                    <Stack gap={2}>
                      {rest.map((r, index) => (
                        <Group key={r.itemCode} justify="space-between" wrap="nowrap" gap="xs">
                          <Text size="xs" truncate title={r.itemName}>{index + 2}. {r.itemName}</Text>
                          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                            {byRevenue ? money.format(r.revenue) : `${num.format(r.qty)} units`}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  )}

                  <Group gap={4} c="blue.4">
                    <Text size="xs" c="blue.4">View all {num.format(c.categoryItems)} products sold</Text>
                    <IconArrowRight size={14} />
                  </Group>
                </Stack>
              </Paper>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>

      {openCategory && (
        <CategoryProductsModal
          category={openCategory}
          years={years}
          initialYear={year}
          initialMonth={month}
          initialSort={rankBy}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </Paper>
  );
}
