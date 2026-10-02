"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Toast = {
  tone: "success" | "error" | "info";
  title: string;
  description?: string;
  action?: { label: string; href: string; external?: boolean };
};
type Entry = Toast & { id: number };

const Context = createContext<(toast: Toast) => void>(() => undefined);

/** Errors linger longer than confirmations so they can be read before they leave. */
const DURATION = { success: 6000, info: 5000, error: 9000 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Entry[]>([]);
  const next = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const push = useCallback((toast: Toast) => {
    const id = ++next.current;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
  }, []);
  return (
    <Context.Provider value={push}>
      {children}
      <ol className="toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />)}
      </ol>
    </Context.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Entry; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), DURATION[toast.tone]);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.tone, onDismiss]);
  return (
    <li
      className={`toast toast-${toast.tone}`}
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast-mark" aria-hidden="true">{toast.tone === "success" ? "✓" : toast.tone === "error" ? "!" : "i"}</span>
      <div className="toast-body">
        <strong>{toast.title}</strong>
        {toast.description ? <p>{toast.description}</p> : null}
        {toast.action ? (
          <a href={toast.action.href} {...(toast.action.external ? { target: "_blank", rel: "noreferrer" } : {})}>
            {toast.action.label} <span aria-hidden="true">{toast.action.external ? "↗" : "→"}</span>
          </a>
        ) : null}
      </div>
      <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>×</button>
    </li>
  );
}

export function useToast() {
  return useContext(Context);
}
