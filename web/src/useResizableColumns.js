import { useCallback, useRef } from 'react';

const PREFIX = 'ff.cols.';
const MIN_WIDTH = 48;

/**
 * Drag-to-resize column widths for any table, remembered per table.
 *
 * Put the returned ref on a <table>. A grab handle is added to the right edge
 * of every header cell; double-clicking a handle resets that column.
 *
 * It is a CALLBACK ref, not a useEffect: most of these tables sit behind a
 * `if (loading) return ...`, so the element does not exist on first render. A
 * callback ref fires whenever the table actually enters or leaves the DOM, and
 * again whenever `signature` changes (i.e. the columns themselves changed).
 *
 * The table switches to `table-layout: fixed` the first time a column is
 * resized, after snapshotting every current width - so nothing jumps, and from
 * then on a column can be made narrower than its content rather than only wider.
 *
 * @param storageKey unique per table, e.g. 'website-stock'
 * @param signature  change this when the set of columns changes
 */
export default function useResizableColumns(storageKey, signature = '') {
  const teardown = useRef(null);

  return useCallback((table) => {
    if (teardown.current) { teardown.current(); teardown.current = null; }
    if (!table) return;

    const headers = [...table.querySelectorAll(':scope > thead > tr > th')];
    if (headers.length === 0) return;

    const key = PREFIX + storageKey;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* private mode */ }

    const persist = () => {
      const widths = {};
      headers.forEach((th, index) => {
        if (th.style.width) widths[index] = Math.round(parseFloat(th.style.width));
      });
      try {
        if (Object.keys(widths).length) localStorage.setItem(key, JSON.stringify(widths));
        else localStorage.removeItem(key);
      } catch { /* private mode */ }
    };

    // Keep the table exactly as wide as its columns. The table is normally
    // width:100%, so with a fixed layout widening one column would steal space
    // from its neighbours. Giving the table an explicit width lets it grow and
    // the wrapper scroll instead, so every other column stays put.
    const resizeTable = () => {
      const total = headers.reduce((sum, th) => sum + th.getBoundingClientRect().width, 0);
      table.style.width = `${Math.round(total)}px`;
    };

    // Freeze every column at its current rendered width, then switch to a fixed
    // layout. Without this the browser keeps sizing columns to their content and
    // a column can never be dragged narrower.
    const freeze = () => {
      if (table.classList.contains('cols-fixed')) return;
      const widths = headers.map((th) => th.getBoundingClientRect().width);
      headers.forEach((th, index) => { th.style.width = `${widths[index]}px`; });
      table.classList.add('cols-fixed');
      resizeTable();
    };

    if (Object.keys(saved).length) {
      headers.forEach((th, index) => { if (saved[index]) th.style.width = `${saved[index]}px`; });
      table.classList.add('cols-fixed');
      resizeTable();
    }

    const cleanups = [];
    headers.forEach((th, index) => {
      // The last column absorbs the leftover space, so it gets no handle.
      if (index === headers.length - 1) return;

      const handle = document.createElement('span');
      handle.className = 'col-resizer';
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.setAttribute('aria-label', 'Resize column');
      handle.title = 'Drag to resize, double-click to reset';
      th.appendChild(handle);
      th.classList.add('is-resizable');

      const onPointerDown = (event) => {
        event.preventDefault();
        event.stopPropagation();          // never triggers the header's sort button
        freeze();
        const startX = event.clientX;
        const startWidth = th.getBoundingClientRect().width;

        const startTableWidth = table.getBoundingClientRect().width;

        const onMove = (move) => {
          const width = Math.max(MIN_WIDTH, startWidth + move.clientX - startX);
          th.style.width = `${width}px`;
          // Grow the table by the same amount so neighbours keep their widths.
          table.style.width = `${Math.round(startTableWidth + width - startWidth)}px`;
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          document.body.classList.remove('is-col-resizing');
          persist();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        document.body.classList.add('is-col-resizing');
      };

      const onDoubleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        th.style.width = '';
        if (headers.every((header) => !header.style.width)) {
          table.classList.remove('cols-fixed');
          table.style.width = '';
        } else {
          resizeTable();
        }
        persist();
      };

      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('dblclick', onDoubleClick);
      cleanups.push(() => {
        handle.removeEventListener('pointerdown', onPointerDown);
        handle.removeEventListener('dblclick', onDoubleClick);
        handle.remove();
        th.classList.remove('is-resizable');
      });
    });

    teardown.current = () => cleanups.forEach((fn) => fn());
  }, [storageKey, signature]);
}
