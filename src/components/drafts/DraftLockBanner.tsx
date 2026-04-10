"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type DraftLockBannerProps = {
  onTakeOver: () => void;
  onBackToDrafts: () => void;
  className?: string;
};

export function DraftLockBanner({
  onTakeOver,
  onBackToDrafts,
  className,
}: DraftLockBannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Esta acta está abierta en otra pestaña. Aquí está en solo lectura.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Si necesitas continuar desde aquí, toma el control. La otra pestaña
            pasará a solo lectura automáticamente.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTakeOver}
              className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Tomar control
            </button>
            <button
              type="button"
              onClick={onBackToDrafts}
              className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
            >
              Volver a borradores
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
