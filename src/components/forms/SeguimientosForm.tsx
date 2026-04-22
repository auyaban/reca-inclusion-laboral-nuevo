"use client";

import { LongFormDraftErrorState, LongFormLoadingState } from "@/components/forms/shared/LongFormShell";
import { SeguimientosCaseEditor } from "@/components/forms/seguimientos/SeguimientosCaseEditor";
import { SeguimientosCedulaGate } from "@/components/forms/seguimientos/SeguimientosCedulaGate";
import { useSeguimientosCaseState } from "@/hooks/useSeguimientosCaseState";

export default function SeguimientosForm() {
  const state = useSeguimientosCaseState();

  if (state.restoring) {
    return (
      <LongFormLoadingState
        title="Abriendo Seguimientos"
        description="Estamos restaurando el caso o el borrador solicitado."
      />
    );
  }

  if (state.draftError) {
    return (
      <LongFormDraftErrorState
        message={state.draftError}
        onBackToDrafts={() => window.location.assign("/hub?panel=drafts")}
      />
    );
  }

  if (!state.hydration || !state.currentDraftData || !state.currentWorkflow) {
    return (
      <SeguimientosCedulaGate
        preparing={state.bootstrapping}
        progressStep={state.bootstrapProgressStep}
        error={state.serverError}
        companyTypeResolution={state.companyTypeResolution}
        onPrepareCedula={state.prepareCase}
      />
    );
  }

  return (
    <SeguimientosCaseEditor
      hydration={state.hydration}
      draftData={state.currentDraftData}
      workflow={state.currentWorkflow}
      activeStageId={state.currentActiveStageId ?? state.hydration.workflow.activeStageId}
      navItems={state.navItems}
      modifiedFieldIdsByStageId={state.modifiedFieldIdsByStageId}
      dirtyStageIds={state.dirtyStageIds}
      savableDirtyStageIds={state.savableDirtyStageIds}
      onBack={state.handleBack}
      onStageSelect={state.handleStageSelect}
      onStageOverride={state.handleStageOverride}
      onStageLock={state.handleStageLock}
      serverError={state.serverError}
      statusNotice={state.statusNotice}
      pendingOverrideRequest={state.pendingOverrideRequest}
      caseConflictState={state.caseConflictState}
      isReadonlyDraft={state.isReadonlyDraft}
      isSyncRecoveryBlocked={state.isSyncRecoveryBlocked}
      syncRecoveryMessage={state.syncRecoveryState?.message ?? null}
      reloadingConflictCase={state.reloadingConflictCase}
      draftStatus={state.draftStatus}
      draftLockBannerProps={state.draftLockBannerProps}
      completionLinks={state.completionLinks}
      baseEditorRevision={state.baseEditorRevision}
      saveSuccessState={state.saveSuccessState}
      savingBaseStage={state.savingBaseStage}
      savingFollowupStages={state.savingFollowupStages}
      refreshingResultSummary={state.refreshingResultSummary}
      exportingPdf={state.exportingPdf}
      onRetrySync={state.handleRetrySync}
      onReloadCase={state.handleReloadCase}
      onBaseValuesChange={state.handleBaseValuesChange}
      onFollowupValuesChange={state.handleFollowupValuesChange}
      onFailedVisitApplied={state.handleFailedVisitApplied}
      onAutoSeedFirstAsistente={state.handleAutoSeededFirstAsistente}
      onFirstAsistenteManualEdit={state.handleFollowupFirstAsistenteManualEdit}
      onSaveBaseStage={state.handleSaveBaseStage}
      onSaveDirtyStages={state.handleSaveDirtyStages}
      onRefreshResultSummary={state.handleRefreshResultSummary}
      onExportPdf={state.handleExportPdf}
      onDismissSaveSuccess={state.dismissSaveSuccessState}
    />
  );
}
