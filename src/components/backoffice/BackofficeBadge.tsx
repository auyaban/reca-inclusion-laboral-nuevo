import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BackofficeBadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "reca";

const toneClasses: Record<BackofficeBadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800",
  reca: "border-reca-200 bg-reca-50 text-reca-800",
};

export function BackofficeBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BackofficeBadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

