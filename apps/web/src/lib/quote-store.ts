"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QuoteLine = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variant?: string;
  quantity: number;
  note?: string;
};

type State = {
  lines: QuoteLine[];
  open: boolean;
  add: (line: Omit<QuoteLine, "quantity"> & { quantity?: number }) => void;
  update: (productId: string, variant: string | undefined, patch: Partial<QuoteLine>) => void;
  remove: (productId: string, variant?: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

const key = (l: { productId: string; variant?: string }) => `${l.productId}::${l.variant ?? ""}`;

export const useQuote = create<State>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (line) =>
        set((s) => {
          const k = key(line);
          const existing = s.lines.find((l) => key(l) === k);
          if (existing) {
            return { lines: s.lines.map((l) => (key(l) === k ? { ...l, quantity: l.quantity + (line.quantity ?? 1) } : l)), open: true };
          }
          return { lines: [...s.lines, { ...line, quantity: line.quantity ?? 1 }], open: true };
        }),
      update: (productId, variant, patch) =>
        set((s) => ({ lines: s.lines.map((l) => (key(l) === key({ productId, variant }) ? { ...l, ...patch } : l)) })),
      remove: (productId, variant) => set((s) => ({ lines: s.lines.filter((l) => key(l) !== key({ productId, variant })) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: "kol-quote", partialize: (s) => ({ lines: s.lines }) },
  ),
);
