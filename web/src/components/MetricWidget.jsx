import { useEffect, useState } from 'react';
import { Alert, Loader, Paper, Text, Title } from '@mantine/core';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from 'recharts';
import { getJson } from '../api.js';
import DataTable from './DataTable.jsx';
import StatCard from './StatCard.jsx';
import { compact, num } from '../format.jsx';
import { CHART_COLORS, axisTick, gridStroke, tooltipProps } from '../charts.js';

export default function MetricWidget({ metric, range }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const qs = new URLSearchParams();
  for (const p of metric.params ?? []) if (range[p]) qs.set(p, range[p]);
  const query = qs.toString();

  useEffect(() => {
    let cancelled = false;
    setError('');
    getJson(`/metrics/${metric.id}${query ? `?${query}` : ''}`)
      .then((d) => !cancelled && setRows(d.rows))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [metric.id, query]);

  if (metric.type === 'kpi') {
    const raw = rows?.[0]?.value;
    const v = typeof raw === 'string' && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
    const value = error ? '!' : rows === null ? <Loader size="sm" /> : typeof v === 'number' ? num.format(v) : v ?? '—';
    return <StatCard label={metric.title} value={value} hint={error || undefined} />;
  }

  const body = error ? <Alert color="red" variant="light">{error}</Alert>
    : rows === null ? <Loader size="sm" />
    : renderBody(metric, rows);

  return (
    <Paper style={metric.wide ? { gridColumn: '1 / -1' } : undefined}>
      <Title order={3} size="h5" mb="md">{metric.title}</Title>
      {body}
    </Paper>
  );
}

// SQL Server bigint/decimal values arrive as strings; charts need real numbers.
function toNumbers(rows, keys) {
  return rows.map((r) => {
    const out = { ...r };
    for (const k of keys) if (typeof out[k] === 'string' && out[k] !== '' && !Number.isNaN(Number(out[k]))) out[k] = Number(out[k]);
    return out;
  });
}

function renderBody(metric, rows) {
  if (!rows.length) return <Text c="dimmed">No data</Text>;
  if (metric.type === 'table') return <DataTable rows={rows} maxHeight={400} />;

  const ys = Array.isArray(metric.y) ? metric.y : [metric.y];
  const data = toNumbers(rows, ys);
  const tooltip = { ...tooltipProps, formatter: (v) => num.format(v) };

  if (metric.type === 'bar' && metric.layout === 'horizontal') {
    const longest = Math.max(...data.map((r) => String(r[metric.x] ?? '').length));
    const labelWidth = Math.min(260, Math.max(80, longest * 7.5));
    return (
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }} barCategoryGap={6}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
          <XAxis type="number" tickFormatter={(v) => compact.format(v)} tick={axisTick} />
          <YAxis type="category" dataKey={metric.x} width={labelWidth} tick={{ ...axisTick, fontSize: 13 }} interval={0} />
          <Tooltip {...tooltip} />
          {ys.length > 1 && <Legend />}
          {ys.map((y, i) => (
            <Bar key={y} dataKey={y} name={metric.yLabel ?? y} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[0, 4, 4, 0]}>
              {ys.length === 1 && <LabelList dataKey={y} position="right" formatter={(v) => num.format(v)} fill="var(--mantine-color-dark-1)" fontSize={12} />}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const Chart = metric.type === 'line' ? LineChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={340}>
      <Chart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
        <XAxis dataKey={metric.x} tick={axisTick} minTickGap={16} />
        <YAxis tick={axisTick} tickFormatter={(v) => compact.format(v)} />
        <Tooltip {...tooltip} />
        {ys.length > 1 && <Legend />}
        {ys.map((y, i) => metric.type === 'line'
          ? <Line key={y} type="monotone" dataKey={y} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
          : <Bar key={y} dataKey={y} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />)}
      </Chart>
    </ResponsiveContainer>
  );
}
