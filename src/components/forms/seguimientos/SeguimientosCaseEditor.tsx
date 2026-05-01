"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  RefreshCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import { SeguimientosBaseStageEditor } from "@/components/forms/seguimientos/SeguimientosBaseStageEditor";
import { SeguimientosFinalStageEditor } from "@/components/forms/seguimientos/SeguimientosFinalStageEditor";
import { SeguimientosFollowupStageEditor } from "@/components/forms/seguimientos/SeguimientosFollowupStageEditor";
import { SeguimientosPdfExportModal } from "@/components/forms/seguimientos/SeguimientosPdfExportModal";
import { SeguimientosCaseOverview } from "@/components/forms/seguimientos/SeguimientosCaseOverview";
import type {
  SeguimientosCaseHydration,
  SeguimientosDraftData,
} from "@/lib/seguimientosRuntime";
import type {
  SeguimientosBaseValues,
  SeguimientosEditableStageId,
  SeguimientosFollowupIndex,
  SeguimientosFollowupValues,
} from "@/lib/seguimientos";
import { SEGUIMIENTOS_BASE_STAGE_ID, SEGUIMIENTOS_FINAL_STAGE_ID } from "@/lib/seguimientos";
import {
  listSeguimientosPdfOptions,
  type SeguimientosWorkflow,
} from "@/lib/seguimientosStages";
import { cn } from "@/lib/utils";

type SeguimientosCaseEditorProps = {
  hydration: SeguimientosCaseHydration;
  draftData: SeguimientosDraftData;
  workflow: SeguimientosWorkflow;
  activeStageId: string;
  modifiedFieldIdsByStageId: Partial<Record<SeguimientosEditableStageId, string[]>>;
  dirtyStageIds: SeguimientosEditableStageId[];
  savableDirtyStageIds: SeguimientosEditableStageId[];
  isFirstEntry: boolean;
  isReEntry: boolean;
  onBack: () => void;
  onStageSelect: (stageId: string) => void;
  onStageOverride: (stageIds: SeguimientosEditableStageId[]) => Promise<boolean>;
  onStageLock?: (
    stageId: SeguimientosEditableStageId,
    options?: {
      discardChanges?: boolean;
    }
  ) => void | Promise<void>;
  serverError: string | null;
  statusNotice: string | null;
  saveSuccessState?: {
    key: number;
    savedStageId: SeguimientosEditableStageId;
    message: string;
    nextStageId: string | null;
  } | null;
  pendingOverrideRequest?: {
    reason: "required" | "expired";
    stageIds: SeguimientosEditableStageId[];
  } | null;
  caseConflictState?: {
    currentCaseUpdatedAt: string | null;
  } | null;
  isReadonlyDraft: boolean;
  isSyncRecoveryBlocked: boolean;
  syncRecoveryMessage: string | null;
  syncRecoveryKind: "post_save_checkpoint_failed" | null;
  reloadingConflictCase: boolean;
  draftStatus: ComponentProps<typeof DraftPersistenceStatus> | null;
  draftLockBannerProps: ComponentProps<typeof DraftLockBanner>;
  completionLinks: {
    sheetLink?: string;
    pdfLink?: string;
  } | null;
  baseEditorRevision: number;
  savingBaseStage: boolean;
  savingFollowupStages: boolean;
  refreshingResultSummary: boolean;
  exportingPdf: boolean;
  onRetrySync: () => Promise<boolean>;
  onReloadCase: (preserveLocalStageIds?: readonly SeguimientosEditableStageId[]) => Promise<boolean>;
  onBaseValuesChange: (values: SeguimientosBaseValues) => void;
  onFollowupValuesChange: (
    followupIndex: SeguimientosFollowupIndex,
    values: SeguimientosFollowupValues
  ) => void;
  onFailedVisitApplied: (
    followupIndex: SeguimientosFollowupIndex,
    values: SeguimientosFollowupValues
  ) => void;
  onAutoSeedFirstAsistente: (
    followupIndex: SeguimientosFollowupIndex,
    values: {
      nombre: string;
      cargo: string;
    }
  ) => void;
  onFirstAsistenteManualEdit: (followupIndex: SeguimientosFollowupIndex) => void;
  onSaveBaseStage: (values: SeguimientosBaseValues) => Promise<boolean>;
  onSaveDirtyStages: (values: SeguimientosFollowupValues) => Promise<boolean>;
  onRefreshResultSummary: () => Promise<boolean>;
  onExportPdf: (optionId: string) => Promise<boolean>;
  onDismissSaveSuccess: () => void;
};

function DetailItem({
  label,
  value,
  emptyValueLabel = "No registrado",
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

function OperationGuideItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
  );
}

function NavigationButton({
  label,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: "left" | "right";
}) {
  const Icon = icon === "left" ? ArrowLeft : ArrowRight;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      {icon === "left" ? <Icon className="h-4 w-4" /> : null}
      {label}
      {icon === "right" ? <Icon className="h-4 w-4" /> : null}
    </button>
  );
}

function SeguimientosSaveSuccessToast({
  message,
  nextStageLabel,
  onGoToFinal,
  onGoToNextStage,
  onDismiss,
}: {
  message: string;
  nextStageLabel: string | null;
  onGoToFinal: () => void;
  onGoToNextStage?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      data-testid="seguimientos-save-success-toast"
      className="fixed inset-x-4 bottom-4 z-40 md:inset-x-auto md:right-6 md:w-full md:max-w-md"
    >
      <div className="rounded-2xl border border-green-200 bg-white p-4 shadow-2xl shadow-green-100">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-green-100 p-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Guardado completado
                </p>
                <p className="mt-1 text-sm text-gray-600">{message}</p>
              </div>
              <button
                type="button"
                data-testid="seguimientos-save-success-dismiss-button"
                onClick={onDismiss}
                className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar confirmacion de guardado"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {nextStageLabel && onGoToNextStage ? (
                <button
                  type="button"
                  data-testid="seguimientos-save-success-next-button"
                  onClick={onGoToNextStage}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Ir a {nextStageLabel}
                </button>
              ) : null}
              <button
                type="button"
                data-testid="seguimientos-save-success-final-button"
                onClick={onGoToFinal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
              >
                Ir a Resultado final
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SeguimientosCaseEditor({
  hydration,
  draftData,
  workflow,
  activeStageId,
  modifiedFieldIdsByStageId,
  dirtyStageIds,
  savableDirtyStageIds,
  isFirstEntry,
  isReEntry,
  onBack,
  onStageSelect,
  onStageOverride,
  onStageLock,
  serverError,
  statusNotice,
  saveSuccessState,
  pendingOverrideRequest,
  caseConflictState,
  isReadonlyDraft,
  isSyncRecoveryBlocked,
  syncRecoveryMessage,
  syncRecoveryKind,
  reloadingConflictCase,
  draftStatus,
  draftLockBannerProps,
  completionLinks,
  baseEditorRevision,
  savingBaseStage,
  savingFollowupStages,
  refreshingResultSummary,
  exportingPdf,
  onRetrySync,
  onReloadCase,
  onBaseValuesChange,
  onFollowupValuesChange,
  onFailedVisitApplied,
  onAutoSeedFirstAsistente,
  onFirstAsistenteManualEdit,
  onSaveBaseStage,
  onSaveDirtyStages,
  onRefreshResultSummary,
  onExportPdf,
  onDismissSaveSuccess,
}: SeguimientosCaseEditorProps) {
  const activeStage = workflow.stageStates.find(
    (stageState) => stageState.stageId === activeStageId
  );
  const activeFollowupIndex = activeStage?.followupIndex;
  const activeFollowup =
    activeFollowupIndex != null
      ? draftData.followups[activeFollowupIndex]
      : null;
  const previousFollowup =
    activeFollowupIndex != null && activeFollowupIndex > 1
      ? draftData.followups[(activeFollowupIndex - 1) as SeguimientosFollowupIndex] ?? null
      : null;
  const activeStageDraftState =
    activeStage && activeStage.kind !== "final"
      ? draftData.stageDraftStateByStageId[
          activeStage.stageId as SeguimientosEditableStageId
        ]
      : null;
  const profesionalAsignado =
    draftData.base.profesional_asignado.trim() ||
    hydration.caseMeta.profesionalAsignado?.trim() ||
    null;
  const activeModifiedFieldIds = useMemo(
    () =>
      new Set(
        activeStage && activeStage.kind !== "final"
          ? modifiedFieldIdsByStageId[
              activeStage.stageId as SeguimientosEditableStageId
            ] ?? []
          : []
      ),
    [activeStage, modifiedFieldIdsByStageId]
  );
  const visibleStageIds = workflow.visibleStageIds;
  const activeIndex = visibleStageIds.indexOf(activeStageId as never);
  const previousStageId =
    activeIndex > 0 ? visibleStageIds[activeIndex - 1] : null;
  const nextStageId =
    activeIndex >= 0 && activeIndex < visibleStageIds.length - 1
      ? visibleStageIds[activeIndex + 1]
      : null;
  const pdfOptions = useMemo(
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
  const pdfBlockedReason =
    dirtyStageIds.length > 0
      ? "Tienes cambios sin guardar en Google Sheets. Guarda primero antes de generar el PDF."
      : null;
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideDialogReason, setOverrideDialogReason] = useState<
    "required" | "expired"
  >("required");
  const [overrideTargetStageIds, setOverrideTargetStageIds] = useState<
    SeguimientosEditableStageId[]
  >([]);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [reloadDialogOpen, setReloadDialogOpen] = useState(false);
  const [pdfModalFollowupIndex, setPdfModalFollowupIndex] = useState<
    SeguimientosFollowupIndex | null
  >(null);
  const isEditingBlocked = isReadonlyDraft || isSyncRecoveryBlocked;
  const hasPendingOverrideRequest = Boolean(
    pendingOverrideRequest?.stageIds.length
  );
  const overrideTargetLabels = useMemo(
    () =>
      overrideTargetStageIds
        .map(
          (stageId) =>
            workflow.stageStates.find((stageState) => stageState.stageId === stageId)
              ?.label ?? stageId
        )
        .filter(Boolean),
    [overrideTargetStageIds, workflow.stageStates]
  );
  const overrideActionLabel =
    pendingOverrideRequest?.reason === "expired"
      ? pendingOverrideRequest.stageIds.length > 1
        ? "Renovar desbloqueos"
        : "Renovar desbloqueo"
      : "Desbloquear etapa";
  const activeEditableStageId =
    activeStage && activeStage.kind !== "final"
      ? (activeStage.stageId as SeguimientosEditableStageId)
      : null;
  const activeStageHasDirtyChanges = Boolean(
    activeEditableStageId && dirtyStageIds.includes(activeEditableStageId)
  );
  const saveSuccessNextStage =
    saveSuccessState?.nextStageId != null
      ? workflow.stageStates.find(
          (stageState) => stageState.stageId === saveSuccessState.nextStageId
        ) ?? null
      : null;

  const suggestedStageLabel = useMemo(() => {
    const suggested = workflow.stageStates.find(
      (s) => s.stageId === workflow.suggestedStageId
    );
    if (suggested?.kind === "followup") {
      return `Seguimiento ${suggested.followupIndex}`;
    }
    if (suggested?.kind === "final") {
      return "Resultado final";
    }
    return null;
  }, [workflow.stageStates, workflow.suggestedStageId]);

  const handleFinalizarFollowup = useMemo(
    () => (followupIndex: SeguimientosFollowupIndex) => {
      setPdfModalFollowupIndex(followupIndex);
    },
    []
  );

  function findNextVisibleStageId(
    w: SeguimientosWorkflow,
    stageId: string
  ) {
    const idx = w.visibleStageIds.indexOf(stageId as never);
    if (idx >= 0 && idx < w.visibleStageIds.length - 1) {
      return w.visibleStageIds[idx + 1] ?? null;
    }
    return null;
  }

  useEffect(() => {
    if (!saveSuccessState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismissSaveSuccess();
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onDismissSaveSuccess, saveSuccessState]);

  // MOD-1: close PDF modal when user navigates away from the finalized followup.
  // NOTE: This effect has no direct regression test because the full CaseEditor
  // render + form submit + rerender flow is too complex to mock cost-effectively.
  // The behavior is verified manually during QA. If this effect is removed or
  // broken, the modal will persist overlaying the wrong stage editor.
  useEffect(() => {
    if (
      pdfModalFollowupIndex != null &&
      activeStageId !== `followup_${pdfModalFollowupIndex}`
    ) {
      setPdfModalFollowupIndex(null);
    }
  }, [activeStageId, pdfModalFollowupIndex]);

  const bannerScrollRef = useRef(new Set<string>());
  // TICKET-2: auto-scroll to first visible critical banner when it appears
  useEffect(() => {
    const targets: { testid: string; condition: unknown }[] = [
      {
        testid: "seguimientos-case-conflict-banner",
        condition: caseConflictState,
      },
      {
        testid: "seguimientos-sync-recovery-banner",
        condition: isSyncRecoveryBlocked && syncRecoveryMessage,
      },
      {
        testid: "seguimientos-overview-server-error",
        condition: serverError,
      },
    ];

    for (const { testid, condition } of targets) {
      if (!condition) continue;

      if (bannerScrollRef.current.has(testid)) continue;
      bannerScrollRef.current.add(testid);

      const el = document.querySelector(`[data-testid="${testid}"]`);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (isVisible) continue;

      el.scrollIntoView({ behavior: "smooth", block: "start" });
      break;
    }

    if (!caseConflictState) bannerScrollRef.current.delete("seguimientos-case-conflict-banner");
    if (!(isSyncRecoveryBlocked && syncRecoveryMessage)) bannerScrollRef.current.delete("seguimientos-sync-recovery-banner");
    if (!serverError) bannerScrollRef.current.delete("seguimientos-overview-server-error");
  }, [caseConflictState, isSyncRecoveryBlocked, syncRecoveryMessage, serverError]);

  function handleOpenOverrideDialog() {
    if (!activeStage || activeStage.kind === "final") {
      return;
    }

    if (pendingOverrideRequest?.stageIds.length) {
      setOverrideDialogReason(pendingOverrideRequest.reason);
      setOverrideTargetStageIds(pendingOverrideRequest.stageIds);
      setOverrideDialogOpen(true);
      return;
    }

    const targetStageIds = [
      activeStage.stageId as SeguimientosEditableStageId,
      ...workflow.stageStates
        .filter(
          (stageState) =>
            stageState.kind !== "final" &&
            stageState.stageId !== activeStage.stageId &&
            stageState.isProtectedByDefault &&
            !stageState.overrideActive &&
            savableDirtyStageIds.includes(
              stageState.stageId as SeguimientosEditableStageId
            )
        )
        .map((stageState) => stageState.stageId as SeguimientosEditableStageId),
    ];

    setOverrideDialogReason("required");
    setOverrideTargetStageIds(targetStageIds);
    setOverrideDialogOpen(true);
  }

  function handleLockStageClick() {
    if (!activeEditableStageId || !onStageLock) {
      return;
    }

    if (activeStageHasDirtyChanges) {
      setLockDialogOpen(true);
      return;
    }

    void onStageLock(activeEditableStageId);
  }

  function handleRequestReload() {
    if (dirtyStageIds.length > 0) {
      setReloadDialogOpen(true);
    } else {
      void onReloadCase();
    }
  }

  async function handleReloadWithPreserve() {
    setReloadDialogOpen(false);
    await onReloadCase(dirtyStageIds as readonly SeguimientosEditableStageId[]);
  }

  async function handleReloadDiscard() {
    setReloadDialogOpen(false);
    await onReloadCase();
  }

  const handleRequestBaseStageOverride = useMemo(
    () => () => {
      setOverrideDialogReason("required");
      setOverrideTargetStageIds([SEGUIMIENTOS_BASE_STAGE_ID as SeguimientosEditableStageId]);
      setOverrideDialogOpen(true);
    },
    []
  );

  function handleNavigateFromSaveSuccess(nextTargetStageId: string) {
    onStageSelect(nextTargetStageId);
  }

  return (
    <>
      <SeguimientosCaseOverview
        hydration={hydration}
        draftData={draftData}
        workflow={workflow}
        activeStageId={activeStageId}
        isFirstEntry={isFirstEntry}
        isReEntry={isReEntry}
        isReadonlyDraft={isReadonlyDraft}
        serverError={serverError}
        statusNotice={statusNotice}
        onBack={onBack}
        onStageSelect={onStageSelect}
        onRequestBaseStageOverride={handleRequestBaseStageOverride}
      >
        <div className="space-y-4">
          {isReadonlyDraft ? (
            <DraftLockBanner {...draftLockBannerProps} />
          ) : null}

          {draftStatus ? <DraftPersistenceStatus {...draftStatus} /> : null}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="space-y-1">
              <p
                data-testid="seguimientos-active-stage-title"
                className="text-sm font-semibold text-gray-900"
              >
                {activeStage?.title ?? "Etapa"}
              </p>
              <p className="text-sm text-gray-600">{activeStage?.helperText}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <NavigationButton
                label="Anterior"
                disabled={!previousStageId}
                onClick={() => previousStageId && onStageSelect(previousStageId)}
                icon="left"
              />
              <NavigationButton
                label="Siguiente"
                disabled={!nextStageId}
                onClick={() => nextStageId && onStageSelect(nextStageId)}
                icon="right"
              />
              {activeStage?.supportsOverride &&
              !isEditingBlocked &&
              activeStage.overrideActive &&
              onStageLock ? (
                <button
                  type="button"
                  data-testid="seguimientos-stage-lock-button"
                  onClick={handleLockStageClick}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Lock className="h-4 w-4" />
                  Bloquear etapa
                </button>
              ) : null}
              {activeStage?.supportsOverride &&
              !isEditingBlocked &&
              !activeStage.overrideActive &&
              (hasPendingOverrideRequest ||
                activeStage.isProtectedByDefault) ? (
                <button
                  type="button"
                  data-testid="seguimientos-stage-override-button"
                  disabled={overrideSubmitting}
                  onClick={handleOpenOverrideDialog}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                >
                  <ShieldAlert className="h-4 w-4" />
                  {overrideActionLabel}
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Progreso
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {activeStage?.progress.coveragePercent ?? 0}%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {activeStage?.progress.filled ?? 0} de {activeStage?.progress.total ?? 0} campos rastreados
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Resumen del caso
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailItem label="Vinculado" value={hydration.caseMeta.nombreVinculado} />
                <DetailItem label="Cédula" value={hydration.caseMeta.cedula} />
                <DetailItem
                  label="Tipo de empresa"
                  value={
                    hydration.caseMeta.companyType === "compensar"
                      ? "Compensar"
                      : "No compensar"
                  }
                />
                <DetailItem
                  label="Seguimientos visibles"
                  value={String(hydration.caseMeta.maxFollowups)}
                />
              </div>
            </div>
          </div>

          <div
            data-testid="seguimientos-operation-guide"
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Como se guarda este formulario
            </p>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <OperationGuideItem
                title="Borrador"
                description="Guarda el progreso del editor y te deja retomarlo después. No escribe Google Sheets ni genera PDF."
              />
              <OperationGuideItem
                title="Google Sheets"
                description="Guarda la ficha inicial o el seguimiento en la hoja del caso y sincroniza el resumen operativo."
              />
              <OperationGuideItem
                title="PDF"
                description="Solo se genera desde Resultado final. Antes de exportarlo, primero debes guardar los cambios en Google Sheets."
              />
            </div>
          </div>

          {dirtyStageIds.length > 0 || savableDirtyStageIds.length > 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Estado de edición
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Cambios pendientes"
                  value={String(dirtyStageIds.length)}
                  emptyValueLabel="-"
                />
                <DetailItem
                  label="Listos para guardar"
                  value={String(savableDirtyStageIds.length)}
                  emptyValueLabel="-"
                />
              </div>
            </div>
          ) : null}

          {savableDirtyStageIds.length > 1 ? (
            <div
              data-testid="seguimientos-save-pending-notice"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              Al guardar se enviarán {savableDirtyStageIds.length} etapas con cambios pendientes a Google Sheets.
            </div>
          ) : null}

          {activeStage?.isProtectedByDefault ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Esta etapa ya tiene información registrada
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    {activeStage.overrideActive
                      ? "La etapa está desbloqueada temporalmente. Puedes guardarla o volver a bloquearla antes de continuar."
                      : "Usa el botón Desbloquear etapa si necesitas corregirla y confirmarás manualmente esa edición."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {activeStage?.overrideActive ? (
            <div className="rounded-2xl border border-reca-200 bg-reca-50 p-4">
              <p className="text-sm font-semibold text-reca">
                Edición de histórico desbloqueada
              </p>
              <p className="mt-1 text-sm text-reca">
                Esta etapa quedó desbloqueada temporalmente para corrección en esta sesión.
              </p>
            </div>
          ) : null}

          {isReadonlyDraft ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-gray-200 p-2 text-gray-700">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Solo lectura por lock
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Esta pestaña no puede guardar cambios mientras otra conserve el control del borrador.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isSyncRecoveryBlocked && syncRecoveryMessage ? (
            <div
              data-testid="seguimientos-sync-recovery-banner"
              className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold">
                    {syncRecoveryKind === "post_save_checkpoint_failed"
                      ? "Estado local desincronizado"
                      : "Sincronización en progreso — actualizando datos..."}
                  </p>
                  <p className="mt-1">{syncRecoveryMessage}</p>
                </div>
                {syncRecoveryKind === "post_save_checkpoint_failed" ? (
                  <button
                    type="button"
                    data-testid="seguimientos-reload-page-button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Recargar pestaña
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="seguimientos-retry-sync-button"
                    onClick={() => void onRetrySync()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reintentar sincronización
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {isSyncRecoveryBlocked ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <RefreshCcw className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Edición bloqueada temporalmente
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Google Sheets ya guardó los cambios, pero la app todavía no pudo volver a cargar el caso. Intenta sincronizar de nuevo antes de seguir.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {caseConflictState ? (
            <div
              data-testid="seguimientos-case-conflict-banner"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold">
                    Este caso cambió en otra pestaña o sesión.
                  </p>
                  <p className="mt-1">
                    Recarga el caso antes de guardar para evitar sobrescribir cambios más recientes.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="seguimientos-reload-case-button"
                  disabled={reloadingConflictCase}
                  onClick={handleRequestReload}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-900 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {reloadingConflictCase ? "Recargando..." : "Recargar caso"}
                </button>
              </div>
            </div>
          ) : null}

          {statusNotice ? (
            <div
              data-testid="seguimientos-status-notice"
              className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
            >
              {statusNotice}
            </div>
          ) : null}

          {activeStage?.kind === "base" ? (
            <SeguimientosBaseStageEditor
              key={`${hydration.caseMeta.caseId}:${baseEditorRevision}`}
              values={draftData.base}
              isReadonlyDraft={isEditingBlocked}
              isProtectedByDefault={activeStage.isProtectedByDefault}
              overrideActive={activeStage.overrideActive}
              saving={savingBaseStage}
              lastSavedToSheetsAt={
                activeStageDraftState?.lastSavedToSheetsAt ?? null
              }
              modifiedFieldIds={activeModifiedFieldIds}
              isFirstEntry={isFirstEntry}
              isProgressCompleted={activeStage.progress.isCompleted}
              suggestedStageLabel={suggestedStageLabel}
              onValuesChange={onBaseValuesChange}
              onSave={onSaveBaseStage}
            />
          ) : null}

          {activeStage?.kind === "followup" &&
          activeFollowupIndex &&
          activeFollowup ? (
            <SeguimientosFollowupStageEditor
              key={`${hydration.caseMeta.caseId}:${activeStage.stageId}:${baseEditorRevision}`}
              followupIndex={activeFollowupIndex}
              values={activeFollowup}
              previousValues={previousFollowup}
              profesionalAsignado={profesionalAsignado}
              failedVisitAppliedAt={
                activeStageDraftState?.failedVisitAppliedAt ?? null
              }
              isReadonly={isEditingBlocked || !activeStage.isEditable}
              saving={savingFollowupStages}
              lastSavedToSheetsAt={
                activeStageDraftState?.lastSavedToSheetsAt ?? null
              }
              modifiedFieldIds={activeModifiedFieldIds}
              onValuesChange={onFollowupValuesChange}
              onFailedVisitApplied={onFailedVisitApplied}
              onAutoSeedFirstAsistente={onAutoSeedFirstAsistente}
              onFirstAsistenteManualEdit={onFirstAsistenteManualEdit}
              onSave={onSaveDirtyStages}
              onFinalizar={handleFinalizarFollowup}
            />
          ) : null}

          {activeStage?.kind === "final" ? (
            <SeguimientosFinalStageEditor
              summary={draftData.summary}
              pdfOptions={pdfOptions}
              completionLinks={completionLinks}
              isReadonly={isEditingBlocked}
              refreshing={refreshingResultSummary}
              exporting={exportingPdf}
              pdfBlockedReason={pdfBlockedReason}
              onRefresh={onRefreshResultSummary}
              onExport={onExportPdf}
            />
          ) : null}
        </div>
      </SeguimientosCaseOverview>

      {saveSuccessState && saveSuccessState.savedStageId === "base_process" ? (
        <SeguimientosSaveSuccessToast
          message={saveSuccessState.message}
          nextStageLabel={
            saveSuccessNextStage &&
            saveSuccessNextStage.stageId !== SEGUIMIENTOS_FINAL_STAGE_ID
              ? saveSuccessNextStage.label
              : null
          }
          onGoToFinal={() =>
            handleNavigateFromSaveSuccess(SEGUIMIENTOS_FINAL_STAGE_ID)
          }
          onGoToNextStage={
            saveSuccessNextStage &&
            saveSuccessNextStage.stageId !== SEGUIMIENTOS_FINAL_STAGE_ID
              ? () =>
                  handleNavigateFromSaveSuccess(saveSuccessNextStage.stageId)
              : undefined
          }
          onDismiss={onDismissSaveSuccess}
        />
      ) : null}

      {pdfModalFollowupIndex != null ? (
        <SeguimientosPdfExportModal
          draftData={draftData}
          followupIndex={pdfModalFollowupIndex}
          nextStageLabel={(() => {
            const nextId = findNextVisibleStageId(
              workflow,
              `followup_${pdfModalFollowupIndex}`
            );
            if (!nextId) return null;
            const nextState = workflow.stageStates.find(
              (s) => s.stageId === nextId
            );
            if (!nextState) return null;
            if (nextState.kind === "final") return null;
            return nextState.label;
          })()}
          exporting={exportingPdf}
          onExportPdf={onExportPdf}
          onGoToNextStage={() => {
            const nextVisible = findNextVisibleStageId(
              workflow,
              `followup_${pdfModalFollowupIndex}`
            );
            setPdfModalFollowupIndex(null);
            if (nextVisible) {
              onStageSelect(nextVisible);
            }
          }}
          onGoToFinal={() => {
            setPdfModalFollowupIndex(null);
            onStageSelect(SEGUIMIENTOS_FINAL_STAGE_ID);
          }}
          onClose={() => setPdfModalFollowupIndex(null)}
        />
      ) : null}

      {lockDialogOpen && activeEditableStageId ? (
        <div
          data-testid="seguimientos-stage-lock-confirm-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <button
            type="button"
            aria-label="Cerrar bloqueo de etapa"
            onClick={() => setLockDialogOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-900">Bloquear etapa</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                Esta etapa tiene cambios locales sin guardar. Elige si quieres
                conservarlos para retomarlos después o descartarlos y volver al último
                estado guardado en Google Sheets.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                data-testid="seguimientos-stage-lock-keep-button"
                onClick={() => {
                  void onStageLock?.(activeEditableStageId);
                  setLockDialogOpen(false);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Conservar cambios y bloquear
              </button>
              <button
                type="button"
                data-testid="seguimientos-stage-lock-discard-button"
                onClick={() => {
                  void onStageLock?.(activeEditableStageId, { discardChanges: true });
                  setLockDialogOpen(false);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
              >
                Descartar cambios y bloquear
              </button>
              <button
                type="button"
                data-testid="seguimientos-stage-lock-cancel-button"
                onClick={() => setLockDialogOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reloadDialogOpen ? (
        <div
          data-testid="seguimientos-reload-confirm-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <button
            type="button"
            aria-label="Cerrar dialogo de recarga"
            onClick={() => setReloadDialogOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-900">
                Recargar caso
              </h2>
              <p className="text-sm leading-relaxed text-gray-600">
                Tienes {dirtyStageIds.length} etapa{dirtyStageIds.length !== 1 ? "s" : ""} con cambios locales sin guardar. Elige si quieres conservar tu borrador al recargar o descartarlo y volver al ultimo estado guardado en Google Sheets.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                data-testid="seguimientos-reload-keep-button"
                onClick={() => void handleReloadWithPreserve()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
              >
                Conservar mi borrador
              </button>
              <button
                type="button"
                data-testid="seguimientos-reload-discard-button"
                onClick={() => void handleReloadDiscard()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Descartar y recargar
              </button>
              <button
                type="button"
                data-testid="seguimientos-reload-cancel-button"
                onClick={() => setReloadDialogOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <FormSubmitConfirmDialog
        open={overrideDialogOpen}
        title={
          overrideDialogReason === "expired"
            ? overrideTargetLabels.length > 1
              ? `Renovar desbloqueos: ${overrideTargetLabels.join(", ")}`
              : "Renovar desbloqueo"
            : overrideTargetLabels.length > 1
              ? `Desbloquear: ${overrideTargetLabels.join(", ")}`
              : "Desbloquear etapa"
        }
        description={
          overrideDialogReason === "expired"
            ? "El desbloqueo temporal venció. Renueva el desbloqueo para seguir corrigiendo estas etapas históricas y luego guarda manualmente en Google Sheets."
            : "Vas a modificar una etapa histórica ya cerrada. Los campos que cambies se marcarán en amarillo y deberás guardar manualmente esos cambios en Google Sheets."
        }
        confirmLabel={
          overrideDialogReason === "expired" ? "Sí, renovar" : "Sí, desbloquear"
        }
        loading={overrideSubmitting}
        loadingLabel={
          overrideDialogReason === "expired"
            ? "Renovando..."
            : "Desbloqueando..."
        }
        onCancel={() => {
          if (!overrideSubmitting) {
            setOverrideDialogOpen(false);
            setOverrideDialogReason("required");
            setOverrideTargetStageIds([]);
          }
        }}
        onConfirm={async () => {
          if (!overrideTargetStageIds.length) {
            setOverrideDialogOpen(false);
            setOverrideDialogReason("required");
            return;
          }

          setOverrideSubmitting(true);
          const authorized = await onStageOverride(overrideTargetStageIds);
          setOverrideSubmitting(false);

          if (authorized) {
            setOverrideDialogOpen(false);
            setOverrideDialogReason("required");
            setOverrideTargetStageIds([]);
            return;
          }

          setOverrideDialogOpen(false);
          setOverrideDialogReason("required");
          setOverrideTargetStageIds([]);
        }}
      />
    </>
  );
}
