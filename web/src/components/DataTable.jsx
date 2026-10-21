import { useEffect, useMemo, useRef, useState } from 'react';

const MIN_WIDTH = 50;
const STORAGE = 'ff.cols.explorer.';

const readSaved = (colsKey) => {
  try { return JSON.parse(localStorage.getItem(STORAGE + colsKey) || '{}'); } catch { return {}; }
};
const ISO_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d+)?Z?$/;

export default function DataTable({ rows }) {
  const cols = useMemo(() => (rows.length ? Object.keys(rows[0]) : []), [rows]);
  const numeric = useMemo(() => new Set(cols.filter((c) => isNumericColumn(rows, c))), [rows, cols]);
  const [widths, setWidths] = useState({});
  const drag = useRef(null);

  // Size columns to their content whenever the column set changes, then lay any
  // widths the user saved for THIS table over the top.
  const colsKey = cols.join('|');
  useEffect(() => {
    setWidths({ ...initialWidths(rows, cols), ...readSaved(colsKey) });
  }, [colsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remember the widths. Debounced because a drag fires pointermove constantly.
  useEffect(() => {
    if (!colsKey || !Object.keys(widths).length) return undefined;
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE + colsKey, JSON.stringify(widths)); } catch { /* private mode */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [widths, colsKey]);

  useEffect(() => {
    const onMove = (e) => {
      if (!drag.current) return;
      const { col, startX, startW } = drag.current;
      setWidths((w) => ({ ...w, [col]: Math.max(MIN_WIDTH, startW + e.clientX - startX) }));
    };
    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      document.body.classList.remove('col-resizing');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  if (!rows.length) return <p className="muted">No rows</p>;

  const startResize = (e, col) => {
    e.preventDefault();
    drag.current = { col, startX: e.clientX, startW: widths[col] ?? 120 };
    document.body.classList.add('col-resizing');
  };
  const autoFit = (col) => setWidths((w) => ({ ...w, [col]: fitWidth(rows, col, 800) }));

  const total = cols.reduce((sum, c) => sum + (widths[c] ?? 120), 0);

  return (
    <div className="table-wrap">
      <table className="data-table" style={{ width: total }}>
        <colgroup>{cols.map((c) => <col key={c} style={{ width: widths[c] ?? 120 }} />)}</colgroup>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} className={numeric.has(c) ? 'num' : ''} title={c}>
                <span className="th-label">{c}</span>
                <span
                  className="resizer"
                  onPointerDown={(e) => startResize(e, c)}
                  onDoubleClick={() => autoFit(c)}
                  title="Drag to resize, double-click to fit"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const text = formatCell(r[c]);
                return (
                  <td key={c} className={numeric.has(c) ? 'num' : ''} title={text ?? 'NULL'}>
                    {text === null ? <span className="muted">NULL</span> : text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  const m = ISO_RE.exec(v);
  if (m) return m[2] === '00:00:00' ? m[1] : `${m[1]} ${m[2]}`;
  return String(v);
}

function isNumericColumn(rows, col) {
  let seen = false;
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined) continue;
    if (typeof v !== 'number') return false;
    seen = true;
  }
  return seen;
}

// Estimate a width from the header and a sample of values (~7px per character).
function fitWidth(rows, col, max) {
  let chars = col.length + 2;
  for (const r of rows.slice(0, 100)) {
    const text = formatCell(r[col]);
    if (text && text.length > chars) chars = text.length;
  }
  return Math.min(max, Math.max(MIN_WIDTH + 20, chars * 7 + 24));
}

function initialWidths(rows, cols) {
  return Object.fromEntries(cols.map((c) => [c, fitWidth(rows, c, 320)]));
}
