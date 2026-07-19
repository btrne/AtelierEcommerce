"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const typeConfig: Record<ToastType, { icon: string; border: string; iconColor: string }> = {
  success: { icon: "check_circle", border: "border-l-green-600", iconColor: "text-green-600" },
  error: { icon: "error", border: "border-l-error", iconColor: "text-error" },
  warning: { icon: "warning", border: "border-l-yellow-600", iconColor: "text-yellow-600" },
  info: { icon: "info", border: "border-l-primary", iconColor: "text-primary" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const cfg = typeConfig[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 border-l-4 ${cfg.border} bg-surface-container text-on-surface shadow-lg animate-slide-in`}
            >
              <span className={`material-symbols-outlined text-lg shrink-0 ${cfg.iconColor}`}>
                {cfg.icon}
              </span>
              <p className="font-body-md text-body-md flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </ToastContext.Provider>
  );
}
