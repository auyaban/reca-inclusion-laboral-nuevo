"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import {
  FormCompletionActions,
  type FormCompletionLinks,
} from "@/components/forms/shared/FormCompletionActions";

// SeguimientosPdfFinalizationDialog
// Diverge del patron canonico de finalizacion (LongFormFinalizationStatus embebido en LongFormShell)
// porque el export de PDF post-followup es un sub-flow del case overview, no un cierre de form.
// Se mantiene como overlay modal sobre el editor para preservar contexto del caso y activeStageId.

type SeguimientosPdfFinalizationDialogProps = {
  status: "processing" | "success" | "error";
  links: FormCompletionLinks | null;
  errorMessage: string | null;
  onRetry: () => void;
  onClose: () => void;
};

export function SeguimientosPdfFinalizationDialog({
  status,
  links,
  errorMessage,
  onRetry,
  onClose,
}: SeguimientosPdfFinalizationDialogProps) {
  const canClose = status !== "processing";
  const resolvedErrorMessage = errorMessage?.trim()
    ? errorMessage
    : "No se pudo generar el PDF de Seguimientos.";
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<Element | null>(null);
  const descriptionId = `seguimientos-pdf-finalization-description-${status}`;

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement;

    return () => {
      const previousElement = previousActiveElementRef.current;
      if (previousElement instanceof HTMLElement && document.contains(previousElement)) {
        previousElement.focus();
      }
    };
  }, []);

  useEffect(() => {
    const target =
      status === "processing" ? dialogRef.current : primaryActionRef.current;
    target?.focus();
  }, [status]);

  function getFocusableElements() {
    const dialog = dialogRef.current;
    if (!dialog) {
      return [];
    }

    return Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute("aria-hidden"));
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements();
    if (!focusableElements.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <div
      data-testid="seguimientos-pdf-finalization-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role={status === "error" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby="seguimientos-pdf-finalization-title"
      aria-describedby={descriptionId}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" />

      <div
        ref={dialogRef}
        data-testid="seguimientos-pdf-finalization-panel"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-reca focus-visible:ring-offset-2"
      >
        {canClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {status === "processing" ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="rounded-full bg-reca-50 p-3 text-reca">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h2
                id="seguimientos-pdf-finalization-title"
                className="text-lg font-bold text-gray-900"
              >
                Generando PDF
              </h2>
              <p
                id={descriptionId}
                className="text-sm text-gray-600"
              >
                Generando PDF, esto puede tardar unos segundos...
              </p>
            </div>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pr-8">
              <div className="rounded-full bg-green-50 p-2 text-green-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2
                  id="seguimientos-pdf-finalization-title"
                  className="text-lg font-bold text-gray-900"
                >
                  PDF generado correctamente.
                </h2>
                <p
                  id={descriptionId}
                  className="text-sm text-gray-600"
                >
                  El archivo quedo disponible en Drive y puedes abrirlo desde
                  estos accesos.
                </p>
              </div>
            </div>

            <FormCompletionActions links={links} />

            <button
              type="button"
              data-testid="seguimientos-pdf-finalization-close"
              ref={primaryActionRef}
              onClick={onClose}
              className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 pr-8">
              <div className="rounded-full bg-red-50 p-2 text-red-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2
                  id="seguimientos-pdf-finalization-title"
                  className="text-lg font-bold text-gray-900"
                >
                  No se pudo generar el PDF.
                </h2>
                <p
                  id={descriptionId}
                  className="text-sm text-gray-600"
                >
                  {resolvedErrorMessage}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-testid="seguimientos-pdf-finalization-retry"
                ref={primaryActionRef}
                onClick={onRetry}
                className="inline-flex w-full items-center justify-center rounded-xl bg-reca px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
              >
                Reintentar
              </button>
              <button
                type="button"
                data-testid="seguimientos-pdf-finalization-close"
                onClick={onClose}
                className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
