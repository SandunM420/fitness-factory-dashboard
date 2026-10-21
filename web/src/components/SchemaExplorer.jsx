import { useEffect, useState } from 'react';
import {
  Alert, Grid, Group, Loader, NavLink, Pagination, Paper, ScrollArea, Select, Text, TextInput, Title,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { getJson } from '../api.js';
import DataTable from './DataTable.jsx';
import { num } from '../format.jsx';

const PAGE_SIZES = ['100', '250', '500', '1000'];

export default function SchemaExplorer() {
  const [tables, setTables] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson('/schema').then(setTables).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const path = `/tables/${encodeURIComponent(selected.schema)}/${encodeURIComponent(selected.table)}/rows?page=${page}&pageSize=${pageSize}`;
    getJson(path)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [selected, page, pageSize]);

  const selectTable = (t) => {
    setSelected(t);
    setPage(1);
    setData(null);
  };

  const visible = tables.filter((t) => `${t.schema}.${t.table}`.toLowerCase().includes(filter.toLowerCase()));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const firstRow = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastRow = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Paper p="sm">
          <TextInput placeholder="Search tables…" leftSection={<IconSearch size={16} />} mb="xs"
            value={filter} onChange={(e) => setFilter(e.currentTarget.value)} />
          <ScrollArea.Autosize mah="70vh" type="auto">
            {tables.length === 0 && !error && <Group gap="xs" p="xs"><Loader size="xs" /><Text size="sm" c="dimmed">Loading tables…</Text></Group>}
            {visible.map((t) => (
              <NavLink key={`${t.schema}.${t.table}`} active={selected === t} onClick={() => selectTable(t)}
                style={{ borderRadius: 'var(--mantine-radius-sm)' }} py={6}
                label={<Text size="sm" truncate><Text span c="dimmed" inherit>{t.schema}.</Text>{t.table}</Text>} />
            ))}
          </ScrollArea.Autosize>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 9 }}>
        <Paper style={{ minWidth: 0 }}>
          {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
          {!selected ? <Text c="dimmed">Select a table to see its records.</Text> : (
            <>
              <Group justify="space-between" mb="sm" gap="sm">
                <div>
                  <Title order={3} size="h4">{selected.schema}.{selected.table}</Title>
                  <Text size="sm" c="dimmed">
                    {data ? `Rows ${num.format(firstRow)}–${num.format(lastRow)} of ${num.format(data.total)}` : 'Loading…'}
                    {loading && data ? ' · loading…' : ''}
                  </Text>
                </div>
                <Group gap="sm">
                  <Select size="xs" w={110} aria-label="Rows per page" data={PAGE_SIZES} value={String(pageSize)} allowDeselect={false}
                    onChange={(v) => { setPageSize(Number(v)); setPage(1); }} />
                  <Pagination size="sm" total={totalPages} value={page} onChange={setPage} disabled={loading} withEdges siblings={1} />
                </Group>
              </Group>
              {data?.hiddenColumns?.length > 0 && (
                <Text size="xs" c="dimmed" mb="xs">Not shown (binary data): {data.hiddenColumns.join(', ')}</Text>
              )}
              {data && <DataTable rows={data.rows} />}
            </>
          )}
        </Paper>
      </Grid.Col>
    </Grid>
  );
}
