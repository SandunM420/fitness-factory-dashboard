import { useEffect, useState } from 'react';
import { Alert, Box, Group, SimpleGrid, Stack } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
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
    <Stack gap="lg">
      {error && <Alert color="red" variant="light" title="Could not load dashboard">{error}</Alert>}
      {hasDateMetrics && (
        <Group>
          <DatePickerInput type="range" label="Date range" placeholder="All dates" clearable w={300}
            value={[range.from || null, range.to || null]}
            onChange={([from, to]) => setRange({ from: from ?? '', to: to ?? '' })} />
        </Group>
      )}
      {kpis.length > 0 && (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
          {kpis.map((m) => <MetricWidget key={m.id} metric={m} range={range} />)}
        </SimpleGrid>
      )}
      {/* Two columns on wide screens; `wide` panels span both. */}
      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(560px, 100%), 1fr))', gap: 'var(--mantine-spacing-lg)' }}>
        {panels.map((m) => (m.type === 'category-leaders'
          ? <CategoryLeaders key={m.id} metric={m} />
          : <MetricWidget key={m.id} metric={m} range={range} />))}
      </Box>
    </Stack>
  );
}
