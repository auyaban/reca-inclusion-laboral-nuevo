"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, RefreshCcw } from "lucide-react";
import { FormCompletionActions } from "@/components/forms/shared/FormCompletionActions";
import type { SeguimientosFinalSummary } from "@/lib/seguimientos";
import type { SeguimientosPdfOption } from "@/lib/seguimientosStages";
import { cn } from "@/lib/utils";

function DetailItem({
  label,
  value,
  emptyValueLabel = "—",
}: {
  label: string;
  value: string;
  emptyValueLabel?: string;
}) {
  const displayValue = value.trim() ? value : emptyValueLabel;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-900">{displayValue}</p>
    </div>
  );
}

type SeguimientosFinalStageEditorProps = {
  summary: SeguimientosFinalSummary;
  pdfOptions: SeguimientosPdfOption[];
  completionLinks: {
    sheetLink?: string;
    pdfLink?: string;
  } | null;
  isReadonly: boolean;
  refreshing: boolean;
  exporting: boolean;
  pdfBlockedReason: string | null;
  onRefresh: () => Promise<boolean>;
  onExport: (optionId: SeguimientosPdfOption["id"]) => Promise<boolean>;
};

function resolveInitialSelectedOptionId(pdfOptions: SeguimientosPdfOption[]) {
  return pdfOptions.find((option) => option.enabled)?.id ?? pdfOptions[0]?.id ?? "";
}

export function SeguimientosFinalStageEditor({
  summary,
  pdfOptions,
  completionLinks,
  isReadonly,
  refreshing,
  exporting,
  pdfBlockedReason,
  onRefresh,
  onExport,
}: SeguimientosFinalStageEditorProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<
    SeguimientosPdfOption["id"] | ""
  >(resolveInitialSelectedOptionId(pdfOptions));

  useEffect(() => {
    if (!pdfOptions.some((option) => option.id === selectedOptionId)) {
      setSelectedOptionId(resolveInitialSelectedOptionId(pdfOptions));
    }
  }, [pdfOptions, selectedOptionId]);

  const selectedOption = useMemo(
    () => pdfOptions.find((option) => option.id === selectedOptionId) ?? null,
    [pdfOptions, selectedOptionId]
  );
  const selectedOptionBlockingReason =
    pdfBlockedReason ?? selectedOption?.disabledReason ?? null;
  const integrityLabel =
    summary.formulaIntegrity === "healthy"
      ? "Válido"
      : summary.formulaIntegrity === "stale"
        ? "Parcial"
        : summary.formulaIntegrity === "broken"
          ? "Con errores"
          : "Pendiente de verificación";
  const integrityToneClasses =
    summary.formulaIntegrity === "healthy"
      ? "border-green-200 bg-green-50 text-green-900"
      : summary.formulaIntegrity === "broken"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div data-testid="seguimientos-final-editor" className="space-y-5">
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 text-sm",
          integrityToneClasses
        )}
      >
        <p className="font-semibold">
          Estado del consolidado: {integrityLabel}
        </p>
        <p className="mt-1">
          {summary.formulaValidationMode === "direct_write_only"
            ? "Algunos campos se validan automáticamente en esta fase."
            : summary.exportReady
              ? "El consolidado está listo para lectura y exportación."
              : "El consolidado necesita verificación antes de usarse en PDF."}
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900">
              Resultado final y consolidado
            </h3>
            <p className="text-sm text-gray-500">
              Verifica el estado de lectura del consolidado actual y genera el
              PDF con la variante exacta que necesitas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="seguimientos-final-refresh-button"
              disabled={isReadonly || refreshing || exporting}
              onClick={() => void onRefresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Actualizar consolidado
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem
            label="Estado del consolidado"
            value={integrityLabel}
          />
          <DetailItem
            label="Última verificación"
            value={summary.lastVerifiedAt ?? "Pendiente"}
          />
          <DetailItem
            label="Último ajuste"
            value={summary.lastRepairedAt ?? "Sin reparaciones"}
          />
          <DetailItem
            label="Último cálculo"
            value={summary.lastComputedAt ?? "Pendiente"}
          />
        </div>

        {summary.issues.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Hallazgos del consolidado
            </p>
            <ul className="mt-2 space-y-2 text-sm text-amber-900">
              {summary.issues.map((issue) => (
                <li key={issue} className="rounded-xl bg-white/70 px-3 py-2">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Object.entries(summary.fields).map(([fieldKey, value]) => (
            <DetailItem
              key={fieldKey}
              label={fieldKey.replace(/_/g, " ")}
              value={value}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-gray-900">Generar PDF</h3>
          <p className="text-sm text-gray-500">
            El PDF solo se genera desde esta etapa. Guardar borrador o guardar en Google Sheets no generan el PDF automaticamente.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Antes de exportar</p>
          <p className="mt-1">
            Selecciona la variante exacta que necesitas. Si hay cambios locales
            pendientes, primero debes guardarlos en Google Sheets.
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">
              Variante de PDF
            </p>
            <div
              data-testid="seguimientos-final-pdf-options"
              className="space-y-3"
            >
              {pdfOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`seguimientos-final-pdf-option-${option.id}`}
                  aria-pressed={selectedOptionId === option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                    selectedOptionId === option.id
                      ? "border-reca bg-reca-50"
                      : "border-gray-200 bg-white hover:bg-gray-50",
                    !option.enabled && "border-gray-200 bg-gray-50"
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {option.label}
                      </p>
                      {option.fechaSeguimiento ? (
                        <p className="text-xs font-medium text-gray-500">
                          Fecha operativa del seguimiento: {option.fechaSeguimiento}
                        </p>
                      ) : null}
                      {!option.enabled && option.disabledReason ? (
                        <p className="text-xs text-gray-600">
                          {option.disabledReason}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                        option.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-700"
                      )}
                    >
                      {option.enabled ? "Disponible" : "Bloqueada"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {selectedOptionBlockingReason ? (
              <p
                data-testid="seguimientos-final-pdf-notice"
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  pdfBlockedReason
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                )}
              >
                {selectedOptionBlockingReason}
              </p>
            ) : null}
          </div>

          <div className="flex items-end">
            <button
              type="button"
              data-testid="seguimientos-final-export-button"
              disabled={
                isReadonly ||
                exporting ||
                refreshing ||
                Boolean(pdfBlockedReason) ||
                !selectedOptionId ||
                !selectedOption?.enabled
              }
              onClick={() =>
                selectedOption?.enabled
                  ? void onExport(selectedOption.id)
                  : undefined
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-reca px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generar PDF
                </>
              )}
            </button>
          </div>
        </div>

        <FormCompletionActions links={completionLinks} className="mt-5" />
      </section>
    </div>
  );
}
