import { useCallback, useEffect, useRef, useState } from 'react';

const LIFETIME = 3000;
let sequence = 0;

/** Queue of transient messages. `push('error', 'text')` shows one. */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((current) => current.filter((t) => t.id !== id)), []);
  const push = useCallback((type, message) => {
    if (!message) return;
    sequence += 1;
    setToasts((current) => [...current, { id: sequence, type, message }]);
  }, []);
  return { toasts, push, dismiss };
}

export function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="region" aria-live="polite">
      {toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />)}
    </div>
  );
}

/** Clears itself after 3s. Hovering pauses that, so a message can be read. */
function Toast({ toast, onDismiss }) {
  const timer = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    timer.current = setTimeout(() => onDismiss(toast.id), LIFETIME);
    return () => clearTimeout(timer.current);
  }, [paused, toast.id, onDismiss]);

  return (
    <div className={`toast toast-${toast.type}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role={toast.type === 'error' ? 'alert' : 'status'}>
      <span className="toast-icon" aria-hidden="true">{toast.type === 'error' ? '✕' : '✓'}</span>
      <span className="toast-text">{toast.message}</span>
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>×</button>
    </div>
  );
}
