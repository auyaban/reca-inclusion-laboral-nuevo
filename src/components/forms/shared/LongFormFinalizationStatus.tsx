"use client";

// cspell:words estes

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
} from "lucide-react";
import {
  buildLongFormFinalizationSteps,
  formatLongFormElapsedTime,
  type LongFormFinalizationStageId,
  type LongFormFinalizationProgress,
} from "@/lib/longFormFinalization";
import { useElapsedNow } from "@/hooks/useElapsedNow";
import { cn } from "@/lib/utils";

type Props = {
  progress: LongFormFinalizationProgress;
  variant?: "inline" | "dialog";
  className?: string;
};

function getProcessingDescription(stageId: LongFormFinalizationStageId | null) {
  switch (stageId) {
    case "validando":
    case "preparando_envio":
      return "Estamos preparando la publicación del acta.";
    case "enviando_al_servidor":
    case "esperando_respuesta":
      return "Estamos enviando la informacion para crear el acta.";
    case "verificando_publicacion":
      return "Estamos confirmando si el acta ya quedo publicada.";
    case "cerrando_borrador_local":
      return "Ya confirmamos la publicación y estamos cerrando el borrador.";
    default:
      return "Estamos cerrando el acta y preparando los enlaces finales.";
  }
}

export function LongFormFinalizationStatus({
  progress,
  variant = "inline",
  className,
}: Props) {
  const liveNow = useElapsedNow(progress.phase === "processing");
  const [settledNow, setSettledNow] = useState(() => Date.now());

  useEffect(() => {
    if (progress.phase !== "processing") {
      return;
    }

    setSettledNow(liveNow);
  }, [liveNow, progress.phase]);

  const elapsedLabel = formatLongFormElapsedTime(
    progress.startedAt,
    progress.phase === "processing" ? liveNow : settledNow
  );
  const steps = useMemo(
    () => buildLongFormFinalizationSteps(progress),
    [progress]
  );
  const isError = progress.phase === "error";
  const isCheckStatusRetry = progress.retryAction === "check_status";
  const fallbackErrorDescription = isCheckStatusRetry
    ? "No pudimos confirmar la publicación. Puede que el acta ya esté guardada."
    : "La publicación no se completó. Revisa el mensaje y vuelve a intentar cuando estés listo.";
  const statusDescription = progress.displayMessage
    ? progress.displayMessage
    : isError
      ? fallbackErrorDescription
      : getProcessingDescription(progress.currentStageId);

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
            {isError ? "Publicación interrumpida" : "Publicando acta"}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {statusDescription}
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

      {progress.errorMessage && progress.errorMessage !== statusDescription ? (
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
