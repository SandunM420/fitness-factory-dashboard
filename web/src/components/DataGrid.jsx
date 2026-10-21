import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Box, Checkbox, Group, Table, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronRight, IconChevronUp, IconSelector } from '@tabler/icons-react';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import classes from './DataGrid.module.css';

const MIN_WIDTH = 48;
const PREFIX = 'ff.grid.';
const CONTROL_WIDTH = 40;   // the expand and select columns

const readWidths = (key) => {
  try { return JSON.parse(localStorage.getItem(PREFIX + key) || '{}'); } catch { return {}; }
};

/**
 * The table used by every list in the app, built on TanStack Table.
 *
 * Sorting and filtering stay with the page (each page has its own tie-break
 * rules), so the grid is told the current `sort` and reports clicks through
 * `onSort(key)`. Everything else - headers, resizable columns remembered per
 * table, row selection, expandable rows, a totals footer - lives here.
 *
 * columns: [{ key, label, align: 'num', hint, sortable, wrap, render(row), footer }]
 * `wrap` lets a column's cells run onto several lines; the rest stay on one.
 */
export default function DataGrid({
  rows, columns, getRowId, storageKey,
  sort, onSort,
  selected, onToggleSelect,
  expanded, onToggleExpand, renderExpanded,
  showFooter, extraRow, rowProps,
  emptyText = 'Nothing to show.',
  maxHeight = 'calc(100vh - 17rem)',
  background = 'var(--mantine-color-dark-6)',
}) {
  const widthsKey = `${storageKey}:${columns.map((c) => c.key).join('|')}`;
  const [widths, setWidths] = useState(() => readWidths(widthsKey));
  const headerCells = useRef({});

  useEffect(() => { setWidths(readWidths(widthsKey)); }, [widthsKey]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (Object.keys(widths).length) localStorage.setItem(PREFIX + widthsKey, JSON.stringify(widths));
        else localStorage.removeItem(PREFIX + widthsKey);
      } catch { /* private mode */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [widths, widthsKey]);

  const defs = useMemo(() => columns.map((column) => ({ id: column.key, accessorFn: (row) => row[column.key] })), [columns]);
  const table = useReactTable({
    data: rows,
    columns: defs,
    getRowId: getRowId ? (row) => String(getRowId(row)) : undefined,
    getCoreRowModel: getCoreRowModel(),
  });

  // Columns size to their content until one is dragged. The first drag freezes
  // every column at its rendered width and switches to a fixed layout, so a
  // column can then be made narrower than its content too.
  const fixed = Object.keys(widths).length > 0;
  const controls = (onToggleExpand ? 1 : 0) + (selected ? 1 : 0);
  const tableWidth = fixed
    ? columns.reduce((sum, c) => sum + (widths[c.key] ?? 150), controls * CONTROL_WIDTH)
    : undefined;

  const startResize = (event, key) => {
    event.preventDefault();
    event.stopPropagation();
    const base = fixed ? widths : Object.fromEntries(columns.map((c) =>
      [c.key, Math.round(headerCells.current[c.key]?.getBoundingClientRect().width ?? 150)]));
    const startX = event.clientX;
    const startWidth = base[key] ?? 150;
    setWidths(base);
    const move = (e) => setWidths((current) => ({ ...current, [key]: Math.max(MIN_WIDTH, Math.round(startWidth + e.clientX - startX)) }));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove(classes.resizing);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.classList.add(classes.resizing);
  };

  const cellProps = (column) => ({
    ...(column.align === 'num' ? { ta: 'right', className: classes.num } : {}),
    ...(column.wrap ? { className: classes.wrap } : {}),
  });
  const span = columns.length + controls;

  const sortIcon = (key) => {
    if (sort?.key !== key) return <IconSelector size={14} className={classes.idle} />;
    return sort.dir === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />;
  };

  return (
    <Box className={classes.scroll} style={{ maxHeight, '--grid-bg': background }}>
      <Table highlightOnHover verticalSpacing={8} horizontalSpacing="sm" fz="sm" stickyHeader className={fixed ? classes.fixed : undefined}
        style={fixed ? { tableLayout: 'fixed', width: tableWidth } : undefined}>
        <Table.Thead className={classes.head}>
          <Table.Tr>
            {onToggleExpand && <Table.Th w={CONTROL_WIDTH} />}
            {selected && <Table.Th w={CONTROL_WIDTH} />}
            {columns.map((column, index) => {
              const sortable = onSort && column.sortable !== false;
              const last = index === columns.length - 1;
              return (
                <Table.Th key={column.key} {...cellProps(column)} title={column.hint}
                  ref={(el) => { headerCells.current[column.key] = el; }}
                  style={{ width: fixed ? widths[column.key] ?? 150 : undefined }}
                  aria-sort={sort?.key === column.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {sortable ? (
                    <UnstyledButton className={classes.sort} onClick={() => onSort(column.key)}>
                      <Group gap={4} wrap="nowrap" justify={column.align === 'num' ? 'flex-end' : 'flex-start'}>
                        <span className={classes.label}>{column.label}</span>{sortIcon(column.key)}
                      </Group>
                    </UnstyledButton>
                  ) : <span className={classes.label}>{column.label}</span>}
                  {!last && (
                    <span className={classes.resizer} role="separator" aria-orientation="vertical" aria-label="Resize column"
                      title="Drag to resize, double-click to reset all widths"
                      onPointerDown={(event) => startResize(event, column.key)}
                      onDoubleClick={() => setWidths({})} />
                  )}
                </Table.Th>
              );
            })}
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {rows.length === 0 && !extraRow && (
            <Table.Tr><Table.Td colSpan={span} ta="center" c="dimmed" py="lg">{emptyText}</Table.Td></Table.Tr>
          )}
          {table.getRowModel().rows.map(({ id, original: row }) => {
            const open = expanded?.has(id);
            const isSelected = selected?.has(id);
            return (
              <Fragment key={id}>
                <Table.Tr {...rowProps?.(row)} bg={isSelected ? 'var(--mantine-color-blue-light)' : undefined}>
                  {onToggleExpand && (
                    <Table.Td>
                      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => onToggleExpand(id)}
                        aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'}>
                        {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                      </ActionIcon>
                    </Table.Td>
                  )}
                  {selected && (
                    <Table.Td>
                      <Checkbox size="xs" checked={isSelected} onChange={() => onToggleSelect(id)} aria-label="Select row" />
                    </Table.Td>
                  )}
                  {columns.map((column) => (
                    <Table.Td key={column.key} {...cellProps(column)}>
                      {column.render ? column.render(row) : row[column.key]}
                    </Table.Td>
                  ))}
                </Table.Tr>
                {open && (
                  <Table.Tr className={classes.expanded}>
                    <Table.Td />
                    <Table.Td colSpan={span - 1} pt={0} pb="md">{renderExpanded(row)}</Table.Td>
                  </Table.Tr>
                )}
              </Fragment>
            );
          })}
          {extraRow && (
            <Table.Tr bg="var(--mantine-color-blue-light)">
              {onToggleExpand && <Table.Td />}
              {selected && <Table.Td>{extraRow.control}</Table.Td>}
              {columns.map((column) => (
                <Table.Td key={column.key} {...cellProps(column)}>{extraRow.cells[column.key]}</Table.Td>
              ))}
            </Table.Tr>
          )}
        </Table.Tbody>

        {showFooter && rows.length > 0 && (
          <Table.Tfoot className={classes.foot}>
            <Table.Tr>
              {onToggleExpand && <Table.Td />}
              {selected && <Table.Td />}
              {columns.map((column) => (
                <Table.Td key={column.key} {...cellProps(column)} fw={700}>{column.footer}</Table.Td>
              ))}
            </Table.Tr>
          </Table.Tfoot>
        )}
      </Table>
    </Box>
  );
}
