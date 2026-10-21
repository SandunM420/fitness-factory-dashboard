import { useState } from 'react';
import useResizableColumns from '../useResizableColumns.js';

const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });

/**
 * Line-level editor for one product at one location.
 *
 * `+` opens a blank line, clicking a row puts it in edit mode, and nothing is
 * written until Save. Flavour and location are part of the primary key, so an
 * existing line shows them as text - change one by deleting and re-adding.
 */
export default function SubProductGrid({ row, flavours, busy, onCreate, onUpdate, onDelete }) {
  const columnsRef = useResizableColumns('sub-product-grid');
  const [selected, setSelected] = useState(() => new Set());
  const [edits, setEdits] = useState({});          // key -> { qty, price, visible_on_web }
  const [newLine, setNewLine] = useState(null);    // blank draft, or null

  const dirty = newLine !== null || Object.keys(edits).length > 0;
  const working = busy === row.rowKey;

  const reset = () => { setEdits({}); setNewLine(null); setSelected(new Set()); };

  const toggleSelect = (key) => setSelected((current) => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const editSelected = () => {
    const next = { ...edits };
    for (const variant of row.shown) {
      if (selected.has(variant.key) && !next[variant.key]) {
        next[variant.key] = { qty: variant.qty, price: variant.price ?? '', visible_on_web: variant.visibleOnWeb };
      }
    }
    setEdits(next);
  };

  const editField = (key, field, value) =>
    setEdits((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));

  const addLine = () => setNewLine({ flavour_id: '', qty: 0, price: '', visible_on_web: true });

  // One at a time, not Promise.all: every line here belongs to the SAME product
  // and location, and the API checks each change against the POS stock still
  // unassigned. Sent together they would all read the old figure and could
  // between them assign more than the shop actually holds.
  const save = async () => {
    for (const [key, draft] of Object.entries(edits)) {
      const variant = row.shown.find((v) => v.key === key);
      if (!variant) continue;
      await onUpdate(variant, {
        qty: Number(draft.qty) || 0,
        price: draft.price === '' ? null : Number(draft.price),
        visible_on_web: draft.visible_on_web,
      });
    }
    if (newLine) {
      await onCreate(row, {
        flavour_id: Number(newLine.flavour_id),
        qty: Number(newLine.qty) || 0,
        price: newLine.price === '' ? null : Number(newLine.price),
        visible_on_web: newLine.visible_on_web,
      });
    }
    reset();
  };
  // Flavours not yet used at this location - the rest would collide with the key.
  const available = flavours.filter((flavour) => !row.shown.some((v) => v.flavourId === flavour.id));

  return (
    <div className="line-grid">
      <div className="line-toolbar">
        <button type="button" className="icon-btn" title="New line" aria-label="New line"
          disabled={working || newLine !== null || available.length === 0} onClick={addLine}>+</button>
        <button type="button" className="icon-btn" title="Edit selected" aria-label="Edit selected"
          disabled={working || selected.size === 0} onClick={editSelected}>✎</button>
        <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete"
          disabled={working || selected.size === 0}
          onClick={() => onDelete(row.shown.filter((v) => selected.has(v.key)), () => setSelected(new Set()))}>🗑</button>

        {dirty && (
          <>
            <button type="button" className="save-btn" disabled={working || (newLine && !newLine.flavour_id)} onClick={save}>
              Save
            </button>
            <button type="button" className="cancel-btn" disabled={working} onClick={reset}>
              {newLine ? 'Cancel New' : 'Cancel'}
            </button>
          </>
        )}
      </div>

      <table ref={columnsRef} className="product-table sub-table stock-table">
        <thead>
          <tr>
            <th style={{ width: '2rem' }} />
            <th>Sub-product</th><th>Flavour</th>
            <th className="num">Qty</th><th className="num">Price</th><th>Website</th>
          </tr>
        </thead>
        <tbody>
          {row.shown.map((variant) => {
            const draft = edits[variant.key];
            return (
              <tr key={variant.key}>
                <td onClick={(event) => event.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(variant.key)} onChange={() => toggleSelect(variant.key)}
                    aria-label={`Select ${variant.variantCode}`} />
                </td>
                <td><code>{variant.variantCode}</code></td>
                <td>{variant.flavour}</td>
                <td className="num">
                  {draft
                    ? <input type="number" min="0" value={draft.qty} style={{ width: '5rem' }}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => editField(variant.key, 'qty', event.target.value)} />
                    : variant.qty}
                </td>
                <td className="num">
                  {draft
                    ? <input type="number" min="0" step="0.01" value={draft.price} style={{ width: '7rem' }}
                        placeholder={row.price} onClick={(event) => event.stopPropagation()}
                        onChange={(event) => editField(variant.key, 'price', event.target.value)} />
                    : variant.effectivePrice ? money.format(variant.effectivePrice) : <span className="muted">–</span>}
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  {/* Read-only until the row is put into edit mode with the pencil. */}
                  <input type="checkbox" disabled={working || !draft}
                    aria-label={`Show ${variant.variantCode} on the website`}
                    checked={draft ? draft.visible_on_web : variant.visibleOnWeb}
                    onChange={(event) => editField(variant.key, 'visible_on_web', event.target.checked)} />
                </td>
              </tr>
            );
          })}

          {newLine && (
            <tr className="is-new">
              <td><input type="checkbox" checked readOnly aria-label="New line" /></td>
              <td><span className="muted">auto</span></td>
              <td>
                <select autoFocus required value={newLine.flavour_id}
                  onChange={(event) => setNewLine({ ...newLine, flavour_id: event.target.value })}>
                  <option value="">Flavour…</option>
                  {available.map((flavour) => <option key={flavour.id} value={flavour.id}>{flavour.name}</option>)}
                </select>
              </td>
              <td className="num">
                <input type="number" min="0" value={newLine.qty} style={{ width: '5rem' }}
                  onChange={(event) => setNewLine({ ...newLine, qty: event.target.value })} />
              </td>
              <td className="num">
                <input type="number" min="0" step="0.01" value={newLine.price} style={{ width: '7rem' }}
                  placeholder={row.price}
                  onChange={(event) => setNewLine({ ...newLine, price: event.target.value })} />
              </td>
              <td>
                <input type="checkbox" checked={newLine.visible_on_web}
                  onChange={(event) => setNewLine({ ...newLine, visible_on_web: event.target.checked })} />
              </td>
            </tr>
          )}

          {row.shown.length === 0 && !newLine && (
            <tr><td className="empty" colSpan={6}>(No data)</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
