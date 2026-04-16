"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";
import type { LongFormFinalizationProgress } from "@/lib/longFormFinalization";
import { cn } from "@/lib/utils";

type FormSubmitConfirmDialogProps = {
  open: boolean;
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  phase?: "confirm" | "processing";
  progress?: LongFormFinalizationProgress | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function FormSubmitConfirmDialog({
  open,
  title = "Confirmar envío",
  description,
  confirmLabel = "Confirmar envío",
  cancelLabel = "Cancelar",
  loading = false,
  phase = "confirm",
  progress = null,
  onCancel,
  onConfirm,
}: FormSubmitConfirmDialogProps) {
  const isProcessing = phase === "processing";

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading && !isProcessing) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProcessing, loading, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      data-testid="form-submit-confirm-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Cerrar confirmación"
        disabled={loading || isProcessing}
        onClick={onCancel}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-submit-confirm-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
      >
        {isProcessing && progress ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2
                id="form-submit-confirm-title"
                className="text-lg font-bold text-gray-900"
              >
                Publicando acta
              </h2>
              <p className="text-sm leading-relaxed text-gray-600">
                No cierres esta pestaña mientras completamos la publicación.
              </p>
            </div>
            <LongFormFinalizationStatus progress={progress} variant="dialog" />
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2
                  id="form-submit-confirm-title"
                  className="text-lg font-bold text-gray-900"
                >
                  {title}
                </h2>
                <p className="text-sm leading-relaxed text-gray-600">
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                data-testid="form-submit-confirm-cancel"
                onClick={onCancel}
                disabled={loading}
                className={cn(
                  "rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                data-testid="form-submit-confirm-accept"
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
