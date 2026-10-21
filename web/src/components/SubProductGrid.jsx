import { useState } from 'react';
import { Checkbox, Code, NumberInput, Paper, Select, Text } from '@mantine/core';
import DataGrid from './DataGrid.jsx';
import LineToolbar from './LineToolbar.jsx';
import { Dash, money } from '../format.jsx';

/**
 * Line-level editor for one product at one location.
 *
 * `+` opens a blank line, the pencil puts selected rows in edit mode, and
 * nothing is written until Save. Flavour and location are part of the primary
 * key, so an existing line shows them as text - change one by deleting and re-adding.
 */
export default function SubProductGrid({ row, flavours, busy, onCreate, onUpdate, onDelete }) {
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

  const columns = [
    { key: 'variantCode', label: 'Sub-product', render: (v) => <Code>{v.variantCode}</Code> },
    { key: 'flavour', label: 'Flavour' },
    {
      key: 'qty', label: 'Qty', align: 'num',
      render: (v) => edits[v.key]
        ? <NumberInput size="xs" w={90} ml="auto" min={0} allowDecimal={false} value={edits[v.key].qty} aria-label="Quantity"
            onChange={(value) => editField(v.key, 'qty', value)} />
        : v.qty,
    },
    {
      key: 'price', label: 'Price', align: 'num',
      render: (v) => edits[v.key]
        ? <NumberInput size="xs" w={120} ml="auto" min={0} decimalScale={2} value={edits[v.key].price} aria-label="Price"
            placeholder={String(row.price ?? '')} onChange={(value) => editField(v.key, 'price', value)} />
        : v.effectivePrice ? money.format(v.effectivePrice) : <Dash />,
    },
    {
      key: 'website', label: 'Website',
      // Read-only until the row is put into edit mode with the pencil.
      render: (v) => (
        <Checkbox size="xs" disabled={working || !edits[v.key]} aria-label={`Show ${v.variantCode} on the website`}
          checked={edits[v.key] ? edits[v.key].visible_on_web : v.visibleOnWeb}
          onChange={(event) => editField(v.key, 'visible_on_web', event.currentTarget.checked)} />
      ),
    },
  ];

  const extraRow = newLine && {
    control: <Checkbox size="xs" checked readOnly aria-label="New line" />,
    cells: {
      variantCode: <Text span size="sm" c="dimmed">auto</Text>,
      flavour: <Select size="xs" w={180} autoFocus placeholder="Flavour…" aria-label="Flavour" searchable
        data={available.map((flavour) => ({ value: String(flavour.id), label: flavour.name }))}
        value={newLine.flavour_id || null} onChange={(value) => setNewLine({ ...newLine, flavour_id: value ?? '' })} />,
      qty: <NumberInput size="xs" w={90} ml="auto" min={0} allowDecimal={false} value={newLine.qty} aria-label="Quantity"
        onChange={(value) => setNewLine({ ...newLine, qty: value })} />,
      price: <NumberInput size="xs" w={120} ml="auto" min={0} decimalScale={2} value={newLine.price} aria-label="Price"
        placeholder={String(row.price ?? '')} onChange={(value) => setNewLine({ ...newLine, price: value })} />,
      website: <Checkbox size="xs" checked={newLine.visible_on_web} aria-label="Show on website"
        onChange={(event) => setNewLine({ ...newLine, visible_on_web: event.currentTarget.checked })} />,
    },
  };

  return (
    <Paper p="sm" bg="var(--mantine-color-dark-7)">
      <LineToolbar
        onNew={addLine} newDisabled={working || newLine !== null || available.length === 0}
        onEdit={editSelected} editDisabled={working || selected.size === 0}
        onDelete={() => onDelete(row.shown.filter((v) => selected.has(v.key)), () => setSelected(new Set()))}
        deleteDisabled={working || selected.size === 0}
        dirty={dirty} saving={working} saveDisabled={Boolean(newLine && !newLine.flavour_id)}
        onSave={save} onCancel={reset} cancelLabel={newLine ? 'Cancel new' : 'Cancel'}
      />
      <DataGrid
        storageKey="sub-product-grid"
        rows={row.shown}
        columns={columns}
        getRowId={(v) => v.key}
        selected={selected}
        onToggleSelect={toggleSelect}
        extraRow={extraRow}
        emptyText="(No data)"
        maxHeight="none"
        background="var(--mantine-color-dark-7)"
      />
    </Paper>
  );
}
