import { useEffect, useState } from 'react';
import { ActionIcon, Button, Group, Menu, NativeSelect, Paper, Popover, TextInput } from '@mantine/core';
import { IconChevronDown, IconFilter, IconX } from '@tabler/icons-react';

const OPERATORS = ['=', '!=', '>', '>=', '<', '<='];

/**
 * Whether a row passes one column's filter. A text value is a substring match,
 * a select is an exact match, and a number carries its own operator - the same
 * shape as a WHERE clause on the list.
 */
export function matches(row, column, held) {
  if (held === undefined || held === '') return true;
  const cell = row[column.key];
  if (column.filter === 'number') {
    if (held.value === '' || held.value === undefined) return true;
    const a = Number(cell) || 0;
    const b = Number(held.value);
    switch (held.op) {
      case '!=': return a !== b;
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
      default: return a === b;
    }
  }
  if (column.filter === 'select') return String(cell) === String(held);
  return String(cell ?? '').toLowerCase().includes(String(held).toLowerCase());
}

/** Filter fields built from the columns, so the two can never drift apart. Select options come from the rows. */
export function filterFields(columns, rows) {
  return columns.filter((c) => c.filter).map((column) => ({
    id: column.key,
    label: column.label,
    type: column.filter,
    primary: Boolean(column.primary),
    options: column.filter !== 'select' ? undefined
      : [...new Set(rows.map((row) => row[column.key]))].filter((v) => v !== '' && v != null).sort()
          .map((value) => ({ value: String(value), label: String(value) })),
  }));
}

/**
 * Attribute filter bar. One field per column of the list it filters.
 * `fields` is [{ id, label, type: 'text' | 'select' | 'number', options, primary }].
 * Filters stage in a draft until Apply, so several can be set in one go.
 */
export default function FilterBar({ fields, applied, onApply }) {
  const [draft, setDraft] = useState(applied);
  const [openField, setOpenField] = useState(null);
  // Fields promoted from "More": shown in the bar before they have a value yet.
  const [pinned, setPinned] = useState(() => new Set());

  useEffect(() => { setDraft(applied); }, [applied]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
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
    setPinned((current) => { const next = new Set(current); next.delete(field.id); return next; });
  };

  const display = (field) => {
    const held = draft[field.id];
    if (field.type === 'number') return `${held.op} ${held.value}`;
    if (field.type === 'select') return field.options.find((option) => option.value === String(held))?.label ?? held;
    return held;
  };

  const chip = (field) => (
    <Button size="xs" variant={active(field.id) ? 'light' : 'default'} rightSection={<IconChevronDown size={14} />}
      onClick={() => setOpenField(openField === field.id ? null : field.id)}>
      {active(field.id) ? `${field.label}: ${display(field)}` : field.label}
    </Button>
  );

  const clear = (field) => (active(field.id) || pinned.has(field.id)) && !field.primary && (
    <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Clear ${field.label}`} onClick={() => drop(field)}>
      <IconX size={14} />
    </ActionIcon>
  );

  const close = () => setOpenField(null);

  const field = (f) => {
    if (f.type === 'select') {
      return (
        <Menu key={f.id} opened={openField === f.id} onChange={(o) => setOpenField(o ? f.id : null)} position="bottom-start">
          <Menu.Target>{chip(f)}</Menu.Target>
          <Menu.Dropdown mah={320} style={{ overflowY: 'auto' }}>
            <Menu.Item onClick={() => set(f.id, '')}>Any</Menu.Item>
            {f.options.map((option) => (
              <Menu.Item key={option.value} onClick={() => set(f.id, option.value)}
                fw={String(draft[f.id]) === option.value ? 700 : undefined}>{option.label}</Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      );
    }

    const held = f.type === 'number' ? draft[f.id] ?? { op: '=', value: '' } : draft[f.id] ?? '';
    const commit = (raw) => set(f.id, f.type === 'number' ? { op: held.op, value: raw } : raw.trim());
    return (
      <Popover key={f.id} opened={openField === f.id} onChange={(o) => setOpenField(o ? f.id : null)}
        position="bottom-start" trapFocus>
        <Popover.Target>{chip(f)}</Popover.Target>
        <Popover.Dropdown>
          <Group gap="xs" wrap="nowrap">
            {f.type === 'number' && (
              <NativeSelect size="xs" w={70} data={OPERATORS} value={held.op}
                onChange={(event) => set(f.id, { ...held, op: event.currentTarget.value })} />
            )}
            <TextInput size="xs" autoFocus type={f.type === 'number' ? 'number' : 'search'}
              placeholder={f.type === 'number' ? 'Value' : f.label}
              defaultValue={f.type === 'number' ? held.value : held}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { commit(event.currentTarget.value); close(); }
                if (event.key === 'Escape') close();
              }}
              onBlur={(event) => commit(event.currentTarget.value)} />
          </Group>
        </Popover.Dropdown>
      </Popover>
    );
  };

  return (
    <Paper p="xs" mb="sm" bg="var(--mantine-color-dark-7)">
      <Group gap="xs">
        <IconFilter size={16} color="var(--mantine-color-blue-4)" aria-hidden />
        {shownFields.map((f) => <Group key={f.id} gap={2} wrap="nowrap">{field(f)}{clear(f)}</Group>)}

        {hiddenFields.length > 0 && (
          <Menu position="bottom-start">
            <Menu.Target>
              <Button size="xs" variant="default" rightSection={<IconChevronDown size={14} />}>More</Button>
            </Menu.Target>
            <Menu.Dropdown mah={260} style={{ overflowY: 'auto' }}>
              {hiddenFields.map((f) => (
                <Menu.Item key={f.id} onClick={() => {
                  setPinned((current) => new Set(current).add(f.id));
                  // Open after the menu has closed, or its outside-click would close the new popover.
                  setTimeout(() => setOpenField(f.id), 0);
                }}>{f.label}</Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}

        <Button size="xs" disabled={!dirty} onClick={() => onApply(draft)}>Apply</Button>
        {Object.keys(applied).length > 0 && (
          <Button size="xs" variant="subtle" color="gray" onClick={() => { setDraft({}); setPinned(new Set()); onApply({}); }}>Clear</Button>
        )}
      </Group>
    </Paper>
  );
}
