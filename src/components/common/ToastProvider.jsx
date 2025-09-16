import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext({ notify: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const notify = useCallback((message, opts = {}) => {
    const id = ++idRef.current;
    const toast = {
      id,
      message,
      type: opts.type || 'success',
      timeout: opts.timeout ?? 2500,
      actionLabel: opts.actionLabel,
      onAction: opts.onAction,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.timeout > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.timeout);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto px-4 py-2 rounded shadow-md text-white ${t.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
            <span>{t.message}</span>
            {t.actionLabel && t.onAction ? (
              <button
                className="ml-3 underline decoration-2 underline-offset-4"
                onClick={(e) => { e.preventDefault(); t.onAction(); setToasts((prev) => prev.filter((x) => x.id !== t.id)); }}
              >
                {t.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
