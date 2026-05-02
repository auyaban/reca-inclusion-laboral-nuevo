"use client";

import { useMemo } from "react";
import { FileSpreadsheet, Loader2, X } from "lucide-react";
import type { SeguimientosDraftData } from "@/lib/seguimientosRuntime";
import type { SeguimientosFollowupIndex } from "@/lib/seguimientos";
import { listSeguimientosPdfOptions } from "@/lib/seguimientosStages";
import { cn } from "@/lib/utils";

type SeguimientosPdfExportModalProps = {
  draftData: SeguimientosDraftData;
  followupIndex: SeguimientosFollowupIndex;
  nextStageLabel: string | null;
  canGoToFinal: boolean;
  exporting: boolean;
  onExportPdf: (optionId: string) => Promise<boolean>;
  onGoToNextStage: () => void;
  onGoToFinal: () => void;
  onCompleteMissingFields: (fieldPath: string | null) => void;
  onClose: () => void;
};

export function SeguimientosPdfExportModal({
  draftData,
  followupIndex,
  nextStageLabel,
  canGoToFinal,
  exporting,
  onExportPdf,
  onGoToNextStage,
  onGoToFinal,
  onCompleteMissingFields,
  onClose,
}: SeguimientosPdfExportModalProps) {
  // A1: use persistedFollowups for PDF options, not local draft
  const options = useMemo(
    () =>
      listSeguimientosPdfOptions({
        companyType: draftData.caseMeta.companyType,
        baseValues: draftData.persistedBase,
        followups: draftData.persistedFollowups,
        summary: draftData.summary,
      }),
    [
      draftData.caseMeta.companyType,
      draftData.persistedBase,
      draftData.persistedFollowups,
      draftData.summary,
    ]
  );

  const targetOption = options.find(
    (o) => o.id === `base_plus_followup_${followupIndex}`
  );

  return (
    <div
      data-testid="seguimientos-pdf-export-modal"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Cerrar modal de exportacion"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Seguimiento {followupIndex} finalizado
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              El seguimiento se guardo en Google Sheets. Podes exportar el PDF
              con la ficha inicial y este seguimiento, o continuar.
            </p>
          </div>
          <button
            type="button"
            data-testid="seguimientos-pdf-modal-close"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {targetOption ? (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-reca-100 p-2 text-reca">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {targetOption.label}
                </p>
                {targetOption.disabledReason ? (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {targetOption.disabledReason}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          {targetOption && !targetOption.disabledReason ? (
            <button
              type="button"
              data-testid="seguimientos-pdf-export-button"
              disabled={exporting}
              onClick={() => {
                void onExportPdf(targetOption.id);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                exporting
                  ? "cursor-not-allowed bg-gray-200 text-gray-500"
                  : "bg-reca text-white hover:bg-reca-dark"
              )}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar PDF
                </>
              )}
            </button>
          ) : null}

          {targetOption?.missingFieldPaths?.length ? (
            <button
              type="button"
              data-testid="seguimientos-pdf-complete-missing-button"
              onClick={() =>
                onCompleteMissingFields(
                  targetOption.missingFieldPaths?.[0] ?? null
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
            >
              Completar campos faltantes
            </button>
          ) : null}

          {nextStageLabel ? (
            <button
              type="button"
              data-testid="seguimientos-pdf-next-button"
              onClick={onGoToNextStage}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Ir a {nextStageLabel}
            </button>
          ) : null}

          {canGoToFinal ? (
            <button
              type="button"
              data-testid="seguimientos-pdf-final-button"
              onClick={onGoToFinal}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Ir a Resultado final
            </button>
          ) : null}

          <button
            type="button"
            data-testid="seguimientos-pdf-close-button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
