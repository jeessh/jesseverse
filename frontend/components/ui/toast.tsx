"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
  id: string;
  message: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((message: string, variant: ToastVariant = "default") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-fade-in pointer-events-auto min-w-64 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg",
              t.variant === "destructive" &&
                "border-destructive/50 bg-destructive text-destructive-foreground",
              t.variant === "success" &&
                "border-green-800 bg-green-950 text-green-200",
              (!t.variant || t.variant === "default") &&
                "border-border bg-card text-card-foreground"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
