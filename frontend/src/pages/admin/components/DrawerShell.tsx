import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { btnBase } from "../utils/ui";

export function DrawerShell({
  open,
  title,
  onClose,
  children,
  width = 980,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex justify-end">
        <div className="h-full w-full bg-white shadow-2xl flex flex-col" style={{ maxWidth: width }}>
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-extrabold text-slate-900 truncate">{title}</div>
            </div>
            <button type="button" className={btnBase} onClick={onClose}>
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
