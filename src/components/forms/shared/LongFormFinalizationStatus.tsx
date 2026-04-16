"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Circle,
} from "lucide-react";
import {
  buildLongFormFinalizationSteps,
  formatLongFormElapsedTime,
  type LongFormFinalizationProgress,
} from "@/lib/longFormFinalization";
import { cn } from "@/lib/utils";

type Props = {
  progress: LongFormFinalizationProgress;
  variant?: "inline" | "dialog";
  className?: string;
};

export function LongFormFinalizationStatus({
  progress,
  variant = "inline",
  className,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const elapsedLabel = formatLongFormElapsedTime(progress.startedAt, now);
  const steps = useMemo(
    () => buildLongFormFinalizationSteps(progress),
    [progress]
  );
  const isProcessing = progress.phase === "processing";
  const isError = progress.phase === "error";

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isProcessing]);

  if (progress.phase === "idle") {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        isError
          ? "border-red-200 bg-red-50"
          : "border-reca-200 bg-reca-50",
        variant === "dialog" && "bg-white",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {isError ? "La publicación no se completó" : "Publicando acta"}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {isError
              ? "El formulario sigue disponible. Revisa el mensaje y vuelve a intentar cuando estés listo."
              : "Estamos cerrando el acta y preparando los enlaces finales."}
          </p>
        </div>

        {elapsedLabel ? (
          <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
            <Clock3 className="h-3.5 w-3.5" />
            <span data-testid="long-form-finalization-elapsed">
              {elapsedLabel}
            </span>
          </div>
        ) : null}
      </div>

      {progress.errorMessage ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-white/80 px-3 py-2 text-sm text-red-700">
          {progress.errorMessage}
        </div>
      ) : null}

      <ol className="mt-4 space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            data-testid={`long-form-finalization-step-${step.id}`}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full",
                step.status === "completed" && "bg-green-100 text-green-600",
                step.status === "active" && "bg-reca-100 text-reca",
                step.status === "error" && "bg-red-100 text-red-600",
                step.status === "pending" && "bg-gray-100 text-gray-400"
              )}
            >
              {step.status === "completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : step.status === "active" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : step.status === "error" ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
            </span>
            <span
              className={cn(
                step.status === "pending" ? "text-gray-500" : "text-gray-800"
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
