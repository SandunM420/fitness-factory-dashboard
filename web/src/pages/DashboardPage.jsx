import { useEffect, useState } from 'react';
import { getJson } from '../api.js';
import MetricWidget from '../components/MetricWidget.jsx';
import CategoryLeaders from '../components/CategoryLeaders.jsx';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState([]);
  const [error, setError] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });

  useEffect(() => {
    getJson('/metrics').then(setMetrics).catch((e) => setError(e.message));
  }, []);

  const kpis = metrics.filter((m) => m.type === 'kpi');
  const panels = metrics.filter((m) => m.type !== 'kpi');
  const hasDateMetrics = metrics.some((m) => m.params?.includes('from'));

  return (
    <>
      {error && <div className="error">Could not load dashboard: {error}</div>}
      {hasDateMetrics && (
        <div className="filters">
          <label>From <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label>To <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        </div>
      )}
      <section className="kpis">
        {kpis.map((m) => <MetricWidget key={m.id} metric={m} range={range} />)}
      </section>
      <section className="panels">
        {panels.map((m) => (m.type === 'category-leaders'
          ? <CategoryLeaders key={m.id} metric={m} />
          : <MetricWidget key={m.id} metric={m} range={range} />))}
      </section>
    </>
  );
}
