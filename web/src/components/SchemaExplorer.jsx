import { useEffect, useState } from 'react';
import { getJson } from '../api.js';
import DataTable from './DataTable.jsx';

const PAGE_SIZES = [100, 250, 500, 1000];
const fmt = new Intl.NumberFormat();

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
    <div className="explorer">
      <aside className="card">
        <input placeholder="Search tables…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <ul>
          {visible.map((t) => (
            <li key={`${t.schema}.${t.table}`}>
              <button className={selected === t ? 'active' : ''} onClick={() => selectTable(t)}>
                <span className="muted">{t.schema}.</span>{t.table}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="card explorer-main">
        {error && <p className="error">{error}</p>}
        {!selected ? <p className="muted">Select a table to see its records.</p> : (
          <>
            <div className="pager">
              <h3>{selected.schema}.{selected.table}</h3>
              <span className="muted">
                {data ? `Rows ${fmt.format(firstRow)}–${fmt.format(lastRow)} of ${fmt.format(data.total)}` : 'Loading…'}
                {loading && data ? ' · loading…' : ''}
              </span>
              <div className="pager-controls">
                <label className="muted">
                  Rows per page{' '}
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <button disabled={loading || page <= 1} onClick={() => setPage(1)} title="First page">«</button>
                <button disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
                <span>Page {fmt.format(page)} of {fmt.format(totalPages)}</span>
                <button disabled={loading || page >= totalPages} onClick={() => setPage(page + 1)}>Next ›</button>
                <button disabled={loading || page >= totalPages} onClick={() => setPage(totalPages)} title="Last page">»</button>
              </div>
            </div>
            {data?.hiddenColumns?.length > 0 && (
              <p className="muted small">Not shown (binary data): {data.hiddenColumns.join(', ')}</p>
            )}
            {data && <DataTable rows={data.rows} />}
          </>
        )}
      </section>
    </div>
  );
}
