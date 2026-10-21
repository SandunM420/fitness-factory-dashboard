import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon, Alert, Badge, Box, Button, Grid, Group, Paper, Progress, SegmentedControl, SimpleGrid, Stack, Text, Title,
  Tooltip as HoverTip, UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { IconChevronLeft, IconChevronRight, IconRefresh } from '@tabler/icons-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getJson } from '../api.js';
import DataGrid from './DataGrid.jsx';
import StatCard from './StatCard.jsx';
import { compact, money, num, shortTime } from '../format.jsx';
import { axisTick, gridStroke, tooltipProps } from '../charts.js';

// Branch codes as stored in the database → names shown to users.
const SHOPS = [
  { code: 'all', name: 'All shops', short: 'All' },
  { code: 'HCM', name: 'Havelock City Mall', short: 'HCM' },
  { code: 'One_Galle_Face', name: 'One Galle Face', short: 'OGF' },
];
const shopName = (code) => SHOPS.find((s) => s.code === code)?.name ?? code;
const SHOP_COLORS = { HCM: '#3b82f6', One_Galle_Face: '#e5e7eb' };
const REFRESH_MS = 60_000;

// Today's date in Sri Lanka (where the shops are), whatever timezone this browser is in.
const sriLankaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());

function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function prettyDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function TodaySales() {
  const [date, setDate] = useState(sriLankaToday);
  const [shop, setShop] = useState('all');
  const [lines, setLines] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  // Full shop names do not fit the switcher on a phone.
  const narrow = useMediaQuery('(max-width: 36em)');
  const today = sriLankaToday();
  const isToday = date === today;

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const d = await getJson(`/metrics/daily-sales-lines?date=${date}&shop=${shop}`);
      if (!signal.cancelled) {
        setLines(d.rows);
        setUpdatedAt(new Date());
      }
    } catch (e) {
      if (!signal.cancelled) setError(e.message);
    } finally {
      if (!signal.cancelled) setLoading(false);
    }
  }, [date, shop]);

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    // Keep today's figures live.
    const timer = isToday ? setInterval(() => load(signal), REFRESH_MS) : null;
    return () => { signal.cancelled = true; if (timer) clearInterval(timer); };
  }, [load, isToday]);

  const view = useMemo(() => summarise(lines ?? []), [lines]);

  // Margin is measured against the revenue that actually has a cost behind it.
  const profitHint = view.costedRevenue
    ? [
        `${Math.round((view.profit / view.costedRevenue) * 100)}% margin`,
        view.uncostedLines && `${view.uncostedLines} line${view.uncostedLines > 1 ? 's' : ''} without a cost`,
      ].filter(Boolean).join(' · ')
    : undefined;

  const invoiceColumns = [
    { key: 'time', label: 'Time', render: (inv) => <b>{inv.time}</b> },
    { key: 'invoiceNo', label: 'Invoice', render: (inv) => <Text span size="sm" c="dimmed">{inv.invoiceNo}</Text> },
    ...(shop === 'all' ? [{
      key: 'shop', label: 'Shop',
      render: (inv) => <Badge variant="outline" color="gray" style={{ borderColor: SHOP_COLORS[inv.shop] }}>{shopName(inv.shop)}</Badge>,
    }] : []),
    { key: 'staff', label: 'Staff' },
    {
      key: 'items', label: 'Items', wrap: true,
      render: (inv) => inv.items.map((it) => (
        <Text key={it.itemCode} size="sm" truncate maw={320} title={it.itemName}>
          {it.itemName} <Text span c="dimmed" inherit>×{num.format(it.qty)}</Text>
        </Text>
      )),
    },
    { key: 'payment', label: 'Payment' },
    { key: 'revenue', label: 'Amount', align: 'num', render: (inv) => <b>{money.format(inv.revenue)}</b> },
  ];

  return (
    <Stack gap="lg">
      <Paper p="sm">
        <Group justify="space-between" gap="sm">
          <Text size="sm" c="dimmed">
            {prettyDate(date)}{isToday && ' · updates every minute'}
            {updatedAt && ` · last updated ${shortTime(updatedAt)}`}
            {loading && ' · loading…'}
          </Text>
          <Group gap="sm">
            <SegmentedControl aria-label="Shop" value={shop} onChange={setShop}
              data={SHOPS.map((s) => ({ value: s.code, label: narrow ? s.short : s.name }))} />
            <Group gap={4} wrap="nowrap">
              <ActionIcon variant="default" size="lg" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
                <IconChevronLeft size={18} />
              </ActionIcon>
              <DatePickerInput w={130} value={date} maxDate={today} valueFormat="YYYY-MM-DD" aria-label="Date"
                onChange={(value) => value && setDate(value)} />
              <ActionIcon variant="default" size="lg" onClick={() => setDate(shiftDate(date, 1))} disabled={date >= today} aria-label="Next day">
                <IconChevronRight size={18} />
              </ActionIcon>
              <Button variant="default" onClick={() => setDate(today)} disabled={isToday}>Today</Button>
            </Group>
            <HoverTip label="Refresh now">
              <ActionIcon variant="default" size="lg" onClick={() => load({ cancelled: false })} loading={loading} aria-label="Refresh">
                <IconRefresh size={18} />
              </ActionIcon>
            </HoverTip>
          </Group>
        </Group>
      </Paper>

      {error && <Alert color="red" variant="light" title="Could not load sales">{error}</Alert>}

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        <StatCard label="Revenue" value={money.format(view.revenue)} />
        <StatCard label="Invoices" value={num.format(view.invoices.length)} />
        <StatCard label="Items sold" value={num.format(view.qty)} />
        <StatCard label="Profit" value={view.costedRevenue ? money.format(view.profit) : '–'} hint={profitHint} />
      </SimpleGrid>

      {shop === 'all' && (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {SHOPS.filter((s) => s.code !== 'all').map((s) => {
            const t = view.byShop[s.code] ?? { revenue: 0, invoices: 0, qty: 0 };
            const share = view.revenue ? Math.round((t.revenue / view.revenue) * 100) : 0;
            return (
              <UnstyledButton key={s.code} onClick={() => setShop(s.code)} title={`Show only ${s.name}`}>
                <Paper className="hover-lift">
                  <Group gap="xs" mb={4}>
                    <Box w={10} h={10} style={{ borderRadius: '50%', background: SHOP_COLORS[s.code] }} />
                    <Text fw={600}>{s.name}</Text>
                    <Text size="xs" c="dimmed" ml="auto">{share}% of revenue</Text>
                  </Group>
                  <Text fz={26} fw={700}>{money.format(t.revenue)}</Text>
                  <Text size="xs" c="dimmed" mb="xs">{num.format(t.invoices)} invoices · {num.format(t.qty)} items</Text>
                  <Progress value={share} size="sm" color={SHOP_COLORS[s.code]} />
                </Paper>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      )}

      <Paper>
        <Title order={3} size="h5" mb="md">Sales by hour</Title>
        {lines && !lines.length ? <Text c="dimmed">No sales recorded {isToday ? 'yet today' : 'on this day'}.</Text> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={view.hours} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey="label" tick={axisTick} />
              <YAxis tickFormatter={(v) => compact.format(v)} tick={axisTick} />
              <Tooltip {...tooltipProps} formatter={(v, name) => [money.format(v), shopName(name)]} />
              {shop === 'all' && <Legend formatter={(v) => shopName(v)} />}
              {(shop === 'all' ? ['HCM', 'One_Galle_Face'] : [shop]).map((code) => (
                <Bar key={code} dataKey={code} stackId="shops" fill={SHOP_COLORS[code]} maxBarSize={48} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Grid gutter="lg" align="flex-start">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Paper>
            <Title order={3} size="h5" mb="md">Invoices <Text span c="dimmed" size="sm">({num.format(view.invoices.length)})</Text></Title>
            <DataGrid storageKey="today-sales" rows={view.invoices} columns={invoiceColumns}
              getRowId={(inv) => inv.invoiceNo} emptyText="No invoices." maxHeight={600} />
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Paper>
            <Title order={3} size="h5" mb="md">Top items</Title>
            {!view.items.length ? <Text c="dimmed">No items sold.</Text> : (
              <Stack gap="sm">
                {view.items.slice(0, 10).map((it, index) => (
                  <Group key={it.itemCode} wrap="nowrap" gap="sm" align="flex-start">
                    <Text size="sm" c="dimmed" w={20} ta="right">{index + 1}.</Text>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate title={it.itemName}>{it.itemName}</Text>
                      <Text size="xs" c="dimmed">{it.category} · {num.format(it.qty)} sold</Text>
                    </Box>
                    <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>{money.format(it.revenue)}</Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

// Turn invoice lines into totals, per-shop totals, hourly buckets, invoices and top items.
function summarise(lines) {
  const invoices = new Map();
  const items = new Map();
  const byShop = {};
  const hourly = new Map();
  let revenue = 0;
  let qty = 0;
  // Profit is summed only over lines whose cost is known, so lines with no recorded
  // cost do not show up as pure margin. costedRevenue is the revenue behind that profit.
  let cost = 0;
  let costedRevenue = 0;
  let uncostedLines = 0;

  for (const l of lines) {
    revenue += l.revenue;
    qty += l.qty;
    if (l.cost === null || l.cost === undefined) uncostedLines += 1;
    else { cost += l.cost; costedRevenue += l.revenue; }

    const s = (byShop[l.shop] ??= { revenue: 0, qty: 0, invoiceSet: new Set() });
    s.revenue += l.revenue;
    s.qty += l.qty;
    s.invoiceSet.add(l.invoiceNo);

    if (!invoices.has(l.invoiceNo)) {
      invoices.set(l.invoiceNo, { invoiceNo: l.invoiceNo, time: l.time, shop: l.shop, staff: l.staff, payment: l.payment, customer: l.customer, revenue: 0, items: [] });
    }
    const inv = invoices.get(l.invoiceNo);
    inv.revenue += l.revenue;
    inv.items.push(l);

    const it = items.get(l.itemCode) ?? { itemCode: l.itemCode, itemName: l.itemName, category: l.category, qty: 0, revenue: 0 };
    it.qty += l.qty;
    it.revenue += l.revenue;
    items.set(l.itemCode, it);

    const hour = Number(l.time?.slice(0, 2));
    if (!Number.isNaN(hour)) {
      const h = hourly.get(hour) ?? {};
      h[l.shop] = (h[l.shop] ?? 0) + l.revenue;
      hourly.set(hour, h);
    }
  }

  for (const s of Object.values(byShop)) s.invoices = s.invoiceSet.size;

  // Show at least normal trading hours (10:00–22:00), widened if sales fall outside them.
  const seen = [...hourly.keys()];
  const from = Math.min(10, ...seen);
  const to = Math.max(21, ...seen);
  const hours = [];
  for (let h = from; h <= to; h++) hours.push({ label: `${String(h).padStart(2, '0')}:00`, ...hourly.get(h) });

  return {
    revenue,
    qty,
    profit: costedRevenue - cost,
    costedRevenue,
    uncostedLines,
    byShop,
    hours,
    invoices: [...invoices.values()].sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '')),
    items: [...items.values()].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty),
  };
}
