import { useEffect, useRef } from 'react';

/**
 * Modal confirmation. Escape or the backdrop cancels, and the confirm button
 * takes focus so Enter completes the action without reaching for the mouse.
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Tab') event.preventDefault(); // keep focus inside the dialog
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button type="button" ref={confirmRef} className="dialog-confirm" disabled={busy} onClick={onConfirm}>
            {busy ? 'Working…' : confirmLabel}
          </button>
          <button type="button" className="dialog-cancel" disabled={busy} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
