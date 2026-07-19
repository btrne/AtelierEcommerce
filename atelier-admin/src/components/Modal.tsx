"use client";

import { type ReactNode, useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  showSubmit?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = "Lưu",
  submitting = false,
  showSubmit = true,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface border border-outline-variant w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto shadow-xl`}>
        <div className="p-6 border-b border-outline-variant/30">
          <h2 className="font-headline-md text-headline-md">{title}</h2>
        </div>
        <div className="p-6 space-y-5">{children}</div>
        {showSubmit && (
          <div className="flex gap-4 p-6 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-outline-variant text-on-surface-variant py-4 font-button-text text-button-text uppercase tracking-widest hover:bg-surface-container transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="flex-1 bg-primary text-white py-4 font-button-text text-button-text uppercase tracking-widest hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {submitting ? "..." : submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
