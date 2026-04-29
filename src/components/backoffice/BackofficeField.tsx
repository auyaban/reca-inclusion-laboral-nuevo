import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const backofficeInputClassName =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-reca focus:ring-2 focus:ring-reca/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700";

export function BackofficeField({
  label,
  error,
  helperText,
  children,
  labelClassName,
  className,
}: {
  label: string;
  error?: string | null;
  helperText?: string | null;
  children: ReactNode;
  labelClassName?: string;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm font-semibold text-gray-700", className)}>
      <span className={cn("block", labelClassName)}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {helperText && !error ? (
        <p className="mt-1.5 text-xs font-medium text-gray-600">{helperText}</p>
      ) : null}
      {error ? <p className="mt-1.5 text-xs font-semibold text-red-700">{error}</p> : null}
    </label>
  );
}
