import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from 'recharts';
import { getJson } from '../api.js';
import DataTable from './DataTable.jsx';

// Blue first (brand accent), then white and cool greys/blues that stay distinct on black.
const COLORS = ['#3b82f6', '#e5e7eb', '#93c5fd', '#6b7280', '#1d4ed8'];
const fmt = new Intl.NumberFormat();
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

const tooltipProps = {
  formatter: (v) => fmt.format(v),
  contentStyle: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', boxShadow: '0 4px 12px rgb(0 0 0 / 0.5)',
  },
  labelStyle: { color: 'var(--text)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: 'var(--text)' },
  cursor: { fill: 'var(--border)', opacity: 0.4 },
};

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

  const body = error ? <p className="error">{error}</p>
    : rows === null ? <p className="muted">Loading…</p>
    : renderBody(metric, rows);

  return (
    <div className={`card ${metric.type}${metric.wide ? ' wide' : ''}`}>
      <h3>{metric.title}</h3>
      {body}
    </div>
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
  if (metric.type === 'kpi') {
    const raw = rows[0]?.value;
    const v = typeof raw === 'string' && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
    return <div className="kpi-value">{typeof v === 'number' ? fmt.format(v) : v ?? '—'}</div>;
  }
  if (!rows.length) return <p className="muted">No data</p>;
  if (metric.type === 'table') return <DataTable rows={rows} />;

  const ys = Array.isArray(metric.y) ? metric.y : [metric.y];
  const data = toNumbers(rows, ys);

  if (metric.type === 'bar' && metric.layout === 'horizontal') {
    const longest = Math.max(...data.map((r) => String(r[metric.x] ?? '').length));
    const labelWidth = Math.min(260, Math.max(80, longest * 7.5));
    return (
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }} barCategoryGap={6}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => compact.format(v)} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey={metric.x} width={labelWidth} tick={{ fontSize: 13 }} interval={0} />
          <Tooltip {...tooltipProps} />
          {ys.length > 1 && <Legend />}
          {ys.map((y, i) => (
            <Bar key={y} dataKey={y} name={metric.yLabel ?? y} fill={COLORS[i % COLORS.length]} radius={[0, 4, 4, 0]}>
              {ys.length === 1 && <LabelList dataKey={y} position="right" formatter={(v) => fmt.format(v)} className="bar-label" />}
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
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={metric.x} tick={{ fontSize: 12 }} minTickGap={16} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => compact.format(v)} />
        <Tooltip {...tooltipProps} />
        {ys.length > 1 && <Legend />}
        {ys.map((y, i) => metric.type === 'line'
          ? <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          : <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}
      </Chart>
    </ResponsiveContainer>
  );
}
