"use client";
import * as React from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export function Dialog({ open, onClose, title, children, className, side = false }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; className?: string; side?: boolean }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className={cn("fixed inset-0 z-50 flex", side ? "justify-end" : "items-center justify-center p-4")} role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className={cn("relative flex max-h-full flex-col bg-white shadow-pop", side ? "h-full w-full max-w-md" : "w-full max-w-lg rounded-2xl", className)}
            initial={side ? { x: 40, opacity: 0 } : { y: 16, opacity: 0, scale: 0.98 }}
            animate={side ? { x: 0, opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={side ? { x: 40, opacity: 0 } : { y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-steel-200 px-6 py-4">
                <h2 className="text-lg font-bold">{title}</h2>
                <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-steel-500 hover:bg-steel-100 hover:text-ink">
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto thin-scroll">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
