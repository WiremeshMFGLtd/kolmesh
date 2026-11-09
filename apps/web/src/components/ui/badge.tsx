import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-steel-100 text-steel-700",
  brand: "bg-brand-50 text-brand-700",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  danger: "bg-danger/10 text-danger",
  dark: "bg-ink text-white",
};

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: keyof typeof tones; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold leading-5", tones[tone], className)}>{children}</span>;
}

export const statusTone: Record<string, keyof typeof tones> = {
  new: "brand",
  in_progress: "warn",
  quoted: "neutral",
  won: "ok",
  lost: "neutral",
  spam: "danger",
};
