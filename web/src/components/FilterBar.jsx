import { useEffect, useRef, useState } from 'react';

const OPERATORS = ['=', '!=', '>', '>=', '<', '<='];

/**
 * Attribute filter bar. One field per column of the list it filters, so a
 * filter is always "this column, this comparison, this value" - the same shape
 * as a WHERE clause.
 *
 * `fields` is [{ id, label, type: 'text' | 'select' | 'number', options, primary }].
 * A text value is a substring match, a select is an exact match, and a number
 * carries its own operator: { op: '>=', value: '10' }.
 * Filters stage in a draft until Apply, so several can be set in one go.
 */
export default function FilterBar({ fields, applied, onApply }) {
  const [draft, setDraft] = useState(applied);
  const [openField, setOpenField] = useState(null);
  // Fields promoted from "More": shown in the bar before they have a value yet.
  const [pinned, setPinned] = useState(() => new Set());
  const [moreOpen, setMoreOpen] = useState(false);
  const bar = useRef(null);

  useEffect(() => { setDraft(applied); }, [applied]);

  useEffect(() => {
    const away = (event) => {
      if (bar.current && !bar.current.contains(event.target)) { setOpenField(null); setMoreOpen(false); }
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const value = (id) => draft[id];
  const active = (id) => {
    const held = draft[id];
    if (held === undefined || held === '') return false;
    if (typeof held === 'object') return held.value !== '' && held.value !== undefined;
    return true;
  };

  const set = (id, next) => setDraft((current) => {
    const copy = { ...current };
    const empty = next === '' || next === undefined
      || (typeof next === 'object' && (next.value === '' || next.value === undefined));
    if (empty) delete copy[id];
    else copy[id] = next;
    return copy;
  });

  const shownFields = fields.filter((field) => field.primary || active(field.id) || pinned.has(field.id));
  const hiddenFields = fields.filter((field) => !field.primary && !active(field.id) && !pinned.has(field.id));

  // Removing a chip also unpins it, so it goes back under "More".
  const drop = (field) => {
    set(field.id, '');
    if (!field.primary) setPinned((current) => { const next = new Set(current); next.delete(field.id); return next; });
  };

  const display = (field) => {
    const held = value(field.id);
    if (field.type === 'number') return `${held.op} ${held.value}`;
    if (field.type === 'select') {
      return field.options.find((option) => String(option.value) === String(held))?.label ?? held;
    }
    return held;
  };

  const editor = (field) => {
    if (field.type === 'select') {
      return (
        <div className="filter-pop">
          <select autoFocus value={value(field.id) ?? ''}
            onChange={(event) => { set(field.id, event.target.value); setOpenField(null); }}>
            <option value="">Any</option>
            {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      );
    }

    if (field.type === 'number') {
      const held = value(field.id) ?? { op: '=', value: '' };
      return (
        <div className="filter-pop filter-number">
          <select value={held.op} onChange={(event) => set(field.id, { ...held, op: event.target.value })}>
            {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
          </select>
          <input autoFocus type="number" placeholder="Value" defaultValue={held.value}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { set(field.id, { op: held.op, value: event.target.value }); setOpenField(null); }
              if (event.key === 'Escape') setOpenField(null);
            }}
            onBlur={(event) => set(field.id, { op: held.op, value: event.target.value })} />
        </div>
      );
    }

    return (
      <div className="filter-pop">
        <input autoFocus type="search" placeholder={field.label} defaultValue={value(field.id) ?? ''}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { set(field.id, event.target.value.trim()); setOpenField(null); }
            if (event.key === 'Escape') setOpenField(null);
          }}
          onBlur={(event) => set(field.id, event.target.value.trim())} />
      </div>
    );
  };

  return (
    <div className="filter-bar" ref={bar}>
      <span className="filter-icon" aria-hidden="true">▼</span>

      {shownFields.map((field) => (
        <div className="filter-field" key={field.id}>
          <button type="button" className={`filter-chip${active(field.id) ? ' is-active' : ''}`}
            onClick={() => { setOpenField(openField === field.id ? null : field.id); setMoreOpen(false); }}>
            {active(field.id) ? `${field.label}: ${display(field)}` : field.label}
            <span className="caret">▾</span>
          </button>
          {(active(field.id) || pinned.has(field.id)) && !field.primary && (
            <button type="button" className="chip-clear" aria-label={`Clear ${field.label}`}
              onClick={() => drop(field)}>✕</button>
          )}
          {openField === field.id && editor(field)}
        </div>
      ))}

      {hiddenFields.length > 0 && (
        <div className="filter-field">
          <button type="button" className="filter-chip"
            onClick={() => { setMoreOpen((v) => !v); setOpenField(null); }}>
            More<span className="caret">▾</span>
          </button>
          {moreOpen && (
            <div className="filter-pop filter-more">
              {hiddenFields.map((field) => (
                <button type="button" key={field.id}
                  onClick={() => {
                    setPinned((current) => new Set(current).add(field.id));
                    setMoreOpen(false);
                    setOpenField(field.id);
                  }}>
                  {field.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button type="button" className="primary-btn" disabled={!dirty} onClick={() => onApply(draft)}>Apply</button>
      {Object.keys(applied).length > 0 && (
        <button type="button" onClick={() => { setDraft({}); setPinned(new Set()); onApply({}); }}>Clear</button>
      )}
    </div>
  );
}
