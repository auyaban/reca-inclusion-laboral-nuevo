"use client";

import { BackofficePageHeader } from "@/components/backoffice";
import { SeguimientosCaseTimeline } from "@/components/forms/seguimientos/SeguimientosCaseTimeline";
import { SeguimientosBaseStageSummary } from "@/components/forms/seguimientos/SeguimientosBaseStageSummary";
import type {
  SeguimientosCaseHydration,
  SeguimientosDraftData,
} from "@/lib/seguimientosRuntime";
import type { SeguimientosWorkflow } from "@/lib/seguimientosStages";

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
    "-";
  const companyTypeLabel =
    hydration.caseMeta.companyType === "compensar"
      ? "Compensar"
      : "No Compensar";

  return (
    <div
      data-testid="seguimientos-case-overview"
      className="min-h-screen bg-gray-50"
    >
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
        <BackofficePageHeader
          title="Seguimientos"
          description={`${vinculadoNombre} - ${empresaNombre} - ${companyTypeLabel} - ${hydration.caseMeta.maxFollowups} seguimientos`}
          onBack={onBack}
          backLabel="Volver"
          backTestId="seguimientos-overview-back"
        />

        {/* Timeline uses ALL stages from rules, visibleStageIds governs clickability. */}
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <SeguimientosCaseTimeline
            companyType={draftData.caseMeta.companyType}
            workflow={workflow}
            activeStageId={activeStageId}
            onStageSelect={onStageSelect}
          />
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

        {children}
      </main>
    </div>
  );
}
