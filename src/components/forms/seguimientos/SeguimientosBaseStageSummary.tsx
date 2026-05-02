"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, ShieldAlert } from "lucide-react";
import type { SeguimientosBaseValues } from "@/lib/seguimientos";
import type { SeguimientosStageState } from "@/lib/seguimientosStages";

type SeguimientosBaseStageSummaryProps = {
  baseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>;
  stageState: SeguimientosStageState | undefined;
  isReadonlyDraft: boolean;
  isReEntry: boolean;
  onRequestOverride: () => void;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const display = value.trim() || "—";
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-gray-900">{display}</p>
    </div>
  );
}

function getField(baseValues: Record<string, unknown>, key: string) {
  const value = baseValues[key];
  return typeof value === "string" ? value : "";
}

export function SeguimientosBaseStageSummary({
  baseValues,
  stageState,
  isReadonlyDraft,
  isReEntry,
  onRequestOverride,
}: SeguimientosBaseStageSummaryProps) {
  const isComplete = stageState?.progress.isCompleted ?? false;
  const startCollapsed = isReEntry && isComplete;
  const [expanded, setExpanded] = useState(!startCollapsed);
  const isProtected = stageState?.isProtectedByDefault ?? false;
  const overrideActive = stageState?.overrideActive ?? false;

  const baseRecord = baseValues as Record<string, unknown>;

  return (
    <div
      data-testid="seguimientos-base-stage-summary"
      className="rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left">
        <button
          type="button"
          data-testid="seguimientos-base-stage-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="seguimientos-base-stage-summary-panel"
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reca/40"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="text-sm font-semibold text-gray-900">Ficha inicial</span>
            {isComplete && !overrideActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                <Lock className="h-3 w-3" />
                Protegida
              </span>
            )}
            {overrideActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-reca-100 px-2 py-0.5 text-[10px] font-semibold text-reca">
                <ShieldAlert className="h-3 w-3" />
                Desbloqueada
              </span>
            )}
          </span>
          {expanded ? (
            <ChevronUp aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
          )}
        </button>
        <div className="flex items-center gap-2">
          {isProtected && !overrideActive && !isReadonlyDraft ? (
            <button
              type="button"
              data-testid="seguimientos-base-stage-reopen-button"
              onClick={() => {
                onRequestOverride();
              }}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-50"
            >
              Reabrir ficha inicial
            </button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div
          id="seguimientos-base-stage-summary-panel"
          data-testid="seguimientos-base-stage-summary-content"
          className="border-t border-gray-100 px-5 pb-5 pt-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailRow
              label="Vinculado"
              value={getField(baseRecord, "nombre_vinculado")}
            />
            <DetailRow
              label="Cédula"
              value={getField(baseRecord, "cedula")}
            />
            <DetailRow
              label="Empresa"
              value={getField(baseRecord, "nombre_empresa")}
            />
            <DetailRow
              label="NIT Empresa"
              value={getField(baseRecord, "nit_empresa")}
            />
            <DetailRow
              label="Tipo de contrato"
              value={getField(baseRecord, "tipo_contrato")}
            />
            <DetailRow
              label="Cargo"
              value={getField(baseRecord, "cargo_vinculado")}
            />
            <DetailRow
              label="Modalidad"
              value={getField(baseRecord, "modalidad")}
            />
            <DetailRow
              label="Fecha visita"
              value={getField(baseRecord, "fecha_visita")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
