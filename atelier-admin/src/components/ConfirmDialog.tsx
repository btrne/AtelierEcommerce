"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ConfirmContextType {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    if (state) {
      state.resolve(result);
      setState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => handleClose(false)} />
          <div className="relative bg-surface border border-surface-dim w-full max-w-sm shadow-xl p-8">
            <p className="font-body-md text-body-md text-on-surface mb-8">{state.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleClose(false)}
                className="flex-1 border border-outline-variant text-on-surface-variant py-4 font-button-text text-button-text uppercase tracking-widest hover:bg-surface-container transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleClose(true)}
                className="flex-1 bg-primary text-white py-4 font-button-text text-button-text uppercase tracking-widest hover:bg-secondary transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
