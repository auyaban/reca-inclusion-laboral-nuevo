"use client";

import { ArrowLeft } from "lucide-react";
import { SeguimientosCaseTimeline } from "@/components/forms/seguimientos/SeguimientosCaseTimeline";
import { SeguimientosBaseStageSummary } from "@/components/forms/seguimientos/SeguimientosBaseStageSummary";
import type {
  SeguimientosCaseHydration,
  SeguimientosDraftData,
} from "@/lib/seguimientosRuntime";
import type {
  SeguimientosBaseValues,
  SeguimientosEditableStageId,
} from "@/lib/seguimientos";
import type { SeguimientosWorkflow } from "@/lib/seguimientosStages";
import { cn } from "@/lib/utils";

type SeguimientosCaseOverviewProps = {
  hydration: SeguimientosCaseHydration;
  draftData: SeguimientosDraftData;
  workflow: SeguimientosWorkflow;
  activeStageId: string;
  isFirstEntry: boolean;
  isReEntry: boolean;
  isReadonlyDraft: boolean;
  serverError: string | null;
  statusNotice: string | null;
  onBack: () => void;
  onStageSelect: (stageId: string) => void;
  onRequestBaseStageOverride: () => void;
  children: React.ReactNode;
};

export function SeguimientosCaseOverview({
  hydration,
  draftData,
  workflow,
  activeStageId,
  isFirstEntry,
  isReEntry,
  isReadonlyDraft,
  serverError,
  statusNotice,
  onBack,
  onStageSelect,
  onRequestBaseStageOverride,
  children,
}: SeguimientosCaseOverviewProps) {
  const baseStageState = workflow.stageStates.find(
    (state) => state.kind === "base"
  );
  const empresaNombre =
    hydration.caseMeta.empresaNombre?.trim() || "Empresa no asignada";
  const vinculadoNombre =
    hydration.caseMeta.nombreVinculado?.trim() ||
    hydration.caseMeta.cedula?.trim() ||
    "—";
  const companyTypeLabel =
    hydration.caseMeta.companyType === "compensar"
      ? "Compensar"
      : "No Compensar";

  return (
    <div
      data-testid="seguimientos-case-overview"
      className="min-h-screen bg-gray-50"
    >
      {/* Top bar */}
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              data-testid="seguimientos-overview-back"
              onClick={onBack}
              className="rounded-xl p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold leading-tight text-white">
                Seguimientos
              </h1>
              <p className="mt-0.5 text-sm text-reca-100">
                {vinculadoNombre} · {empresaNombre} · {companyTypeLabel}
                {" · "}
                {hydration.caseMeta.maxFollowups} seguimientos
              </p>
            </div>
          </div>

          {/* Timeline — uses ALL stages from rules, visibleStageIds governs clickability */}
          <div className="mt-3">
            <SeguimientosCaseTimeline
              companyType={draftData.caseMeta.companyType}
              workflow={workflow}
              activeStageId={activeStageId}
              onStageSelect={onStageSelect}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {serverError ? (
          <div
            data-testid="seguimientos-overview-server-error"
            className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            {serverError}
          </div>
        ) : null}

        {statusNotice ? (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            {statusNotice}
          </div>
        ) : null}

        {isFirstEntry ? (
          <div
            data-testid="seguimientos-first-entry-banner"
            className="mb-4 rounded-2xl border border-reca-200 bg-reca-50 px-5 py-4"
          >
            <p className="text-sm font-semibold text-reca">
              Termina la ficha inicial para continuar
            </p>
            <p className="mt-1 text-sm text-reca-800">
              La ficha inicial debe estar lista antes de abrir los seguimientos.
            </p>
          </div>
        ) : null}

        {/* Always-visible base stage summary, above the editor */}
        <div className="mb-4">
          <SeguimientosBaseStageSummary
            key={hydration.caseMeta.caseId}
            baseValues={draftData.base}
            stageState={baseStageState}
            isReadonlyDraft={isReadonlyDraft}
            isReEntry={isReEntry}
            onRequestOverride={onRequestBaseStageOverride}
          />
        </div>

        {/* Active stage editor */}
        {children}
      </main>
    </div>
  );
}
