"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type FieldErrors } from "react-hook-form";
import { useRouter } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { InterpreteLscFormPresenterProps } from "@/components/forms/interpreteLsc/InterpreteLscFormPresenter";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";
import {
  LongFormDraftErrorState,
  LongFormFinalizeButton,
  LongFormSuccessState,
  LongFormTestFillButton,
} from "@/components/forms/shared/LongFormShell";
import { useGooglePrewarm } from "@/hooks/useGooglePrewarm";
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";
import { useInvisibleDraftTelemetry } from "@/hooks/useInvisibleDraftTelemetry";
import { useInterpreteLscDraftRuntime } from "@/hooks/interpreteLsc/useInterpreteLscDraftRuntime";
import { useInterpreteLscEditorRuntime } from "@/hooks/interpreteLsc/useInterpreteLscEditorRuntime";
import { useInterpreteLscFinalizationRuntime } from "@/hooks/interpreteLsc/useInterpreteLscFinalizationRuntime";
import { useInterpreteLscNavigationRuntime } from "@/hooks/interpreteLsc/useInterpreteLscNavigationRuntime";
import { returnToHubTab } from "@/lib/actaTabs";
import { normalizePersistedAsistentesForMode } from "@/lib/asistentes";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import {
  clearFinalizationUiLock,
  shouldSuppressDraftNavigationWhileFinalizing,
} from "@/lib/finalization/finalizationUiLock";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import {
  buildInterpreteLscSessionRouteKey,
  resolveInterpreteLscDraftHydration,
  resolveInterpreteLscSessionHydration,
} from "@/lib/interpreteLscHydration";
import {
  getDefaultInterpreteLscValues,
  normalizeInterpreteLscValues,
} from "@/lib/interpreteLsc";
import {
  getInterpreteLscCompatStepForSection,
  getInterpreteLscSectionIdForStep,
  INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS,
  type InterpreteLscSectionId,
} from "@/lib/interpreteLscSections";
import type { LongFormFinalizedSuccess } from "@/lib/longFormSuccess";
import { resolveLongFormDraftSource } from "@/lib/longFormHydration";
import {
  shouldRenderInlineLongFormFinalizationFeedback,
} from "@/lib/longFormFinalization";
import {
  buildInterpreteLscManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import { type InterpreteLscValues } from "@/lib/validations/interpreteLsc";

type LoadingState = {
  mode: "loading";
};

type DraftErrorState = {
  mode: "draft_error";
  draftErrorState: ComponentProps<typeof LongFormDraftErrorState>;
};

type SuccessState = {
  mode: "success";
  successState: ComponentProps<typeof LongFormSuccessState>;
};

type EditingState = {
  mode: "editing";
  presenterProps: InterpreteLscFormPresenterProps;
};

type FinalizedSuccessState = LongFormFinalizedSuccess;

export type InterpreteLscFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

type UseInterpreteLscFormStateOptions = {
  initialDraftResolution?: InitialDraftResolution;
};

export function useInterpreteLscFormState({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: UseInterpreteLscFormStateOptions = {}): InterpreteLscFormState {
  const router = useRouter();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const clearEmpresa = useEmpresaStore((state) => state.clearEmpresa);
  const [step, setStep] = useState(0);
  const [finalizedSuccess, setFinalizedSuccess] =
    useState<FinalizedSuccessState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const draftRuntime = useInterpreteLscDraftRuntime({
    empresa,
    initialDraftResolution,
  });
  const {
    draftParam,
    sessionParam,
    explicitNewDraft,
    invisibleDraftPilotEnabled,
    bootstrapDraftId,
    activeDraftId,
    localDraftSessionId,
    loadingDraft,
    savingDraft,
    editingAuthorityState,
    lockConflict,
    isDraftEditable,
    autosave,
    flushAutosave,
    hasPendingAutosave,
    hasLocalDirtyChanges,
    localDraftSavedAt,
    loadLocal,
    checkpointDraft,
    saveDraft,
    loadDraft,
    startNewDraftSession,
    setDraftAlias,
    draftLifecycleSuspended,
    restoringDraft,
    setRestoringDraft,
    beginRouteHydration,
    isRouteHydrated,
    isRouteHydrationSettled,
    markRouteHydrated,
    suspendDraftLifecycle,
    resumeDraftLifecycle,
    buildDraftStatusProps,
    buildDraftLockBannerProps,
    checkpointInvalidSubmission,
    clearDraftAfterSuccess,
    isReadonlyDraft,
    ensureDraftIdentity,
  } = draftRuntime;
  const editorRuntime = useInterpreteLscEditorRuntime({
    empresa,
    isBootstrappingForm,
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    errors,
    isSubmitting,
    fechaVisita,
    modalidadInterprete,
    modalidadProfesionalReca,
    nitEmpresa,
    oferentes,
    interpretes,
    asistentes,
    currentNormalizedValues,
    serviceSummary,
    profesionales,
    interpretesCatalog,
    interpretesCatalogError,
    creatingInterpreteName,
    createInterprete,
    resetAssignedCargoAutofill,
  } = editorRuntime;

  const formTabLabel = getFormTabLabel("interprete-lsc");
  const showTestFillAction = isManualTestFillEnabled();
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const showTakeoverPrompt = isReadonlyDraft;
  const navigationRuntime = useInterpreteLscNavigationRuntime({
    hasEmpresa,
    currentNormalizedValues,
    errors,
  });
  const {
    companyRef,
    participantsRef,
    interpretersRef,
    attendeesRef,
    activeSectionId,
    setActiveSectionId,
    collapsedSections,
    setCollapsedSections,
    scrollToSection,
    toggleSection,
    selectSection,
    sectionStatuses,
    navItems,
    navigateToValidationTarget,
  } = navigationRuntime;
  const currentRouteKey = useMemo(() => {
    if (draftParam) {
      return `draft:${draftParam}`;
    }
    const sessionId = sessionParam?.trim() || localDraftSessionId;
    return buildInterpreteLscSessionRouteKey(sessionId, explicitNewDraft);
  }, [draftParam, explicitNewDraft, localDraftSessionId, sessionParam]);
  const currentRouteHydrationSettled = useMemo(
    () =>
      currentRouteKey ? isRouteHydrationSettled(currentRouteKey) : !restoringDraft,
    [currentRouteKey, isRouteHydrationSettled, restoringDraft]
  );

  const { reportInvisibleDraftSuppression } = useInvisibleDraftTelemetry({
    formSlug: "interprete-lsc",
    draftParam,
    activeDraftId,
    editingAuthorityState,
    lockConflict,
    invisibleDraftPilotEnabled,
    showTakeoverPrompt,
  });

  const normalizeDraftBootstrapToSessionRoute = useCallback(() => {
    if (
      !invisibleDraftPilotEnabled ||
      !draftParam ||
      !localDraftSessionId.trim()
    ) {
      return;
    }

    router.replace(
      buildFormEditorUrl("interprete-lsc", {
        sessionId: localDraftSessionId,
      }),
      { scroll: false }
    );
  }, [draftParam, invisibleDraftPilotEnabled, localDraftSessionId, router]);

  useEffect(() => {
    const companyName = empresa?.nombre_empresa?.trim();
    const baseTitle = companyName
      ? `${formTabLabel} | ${companyName}`
      : `${formTabLabel} | Nueva acta`;
    document.title = isReadonlyDraft ? `${baseTitle} | Solo lectura` : baseTitle;
  }, [empresa?.nombre_empresa, formTabLabel, isReadonlyDraft]);
  const finalizationRuntime = useInterpreteLscFinalizationRuntime({
    empresa,
    isDocumentEditable,
    activeDraftId,
    localDraftSessionId,
    clearDraftAfterSuccess,
    suspendDraftLifecycle,
    resumeDraftLifecycle,
    reportInvalidPromotionSuppressed() {
      if (invisibleDraftPilotEnabled) {
        reportInvisibleDraftSuppression(
          "invalid_submission_promotion",
          "session"
        );
        return true;
      }
      return false;
    },
    markRouteHydrated,
    onSuccess: setFinalizedSuccess,
    onErrorMessage: setServerError,
  });
  const {
    submitConfirmOpen,
    isFinalizing,
    finalizationProgress,
    finalizationFeedbackRef,
    resetFinalizationProgress,
    handlePrepareSubmit,
    confirmSubmit,
    cancelSubmitDialog,
    reportInvalidSubmissionPromotion,
  } = finalizationRuntime;

  const handleFormBlurCapture = useCallback(() => {
    if (
      !isDocumentEditable ||
      loadingDraft ||
      restoringDraft ||
      draftLifecycleSuspended ||
      isFinalizing
    ) {
      return;
    }
    void flushAutosave();
  }, [
    draftLifecycleSuspended,
    flushAutosave,
    isDocumentEditable,
    isFinalizing,
    loadingDraft,
    restoringDraft,
  ]);

  useInitialLocalDraftSeed({
    enabled:
      hasEmpresa &&
      isDocumentEditable &&
      !loadingDraft &&
      !restoringDraft &&
      !draftLifecycleSuspended &&
      !isFinalizing,
    hydrationSettled: currentRouteHydrationSettled,
    seedKey: hasEmpresa
      ? `${activeDraftId ?? localDraftSessionId}:${empresa?.id ?? empresa?.nit_empresa ?? ""}`
      : null,
    step,
    getValues: () => getValues() as Record<string, unknown>,
    autosave,
    localDraftSavedAt,
    hasPendingAutosave,
    hasLocalDirtyChanges,
  });

  useGooglePrewarm({
    formSlug: "interprete-lsc",
    empresa,
    formData: { oferentes, interpretes, asistentes },
    step,
    draftId: activeDraftId,
    localDraftSessionId,
    ensureDraftIdentity,
    disabled:
      !hasEmpresa ||
      !isDocumentEditable ||
      isBootstrappingForm ||
      loadingDraft ||
      restoringDraft ||
      draftLifecycleSuspended ||
      isFinalizing ||
      submitConfirmOpen,
  });

  const applyFormState = useCallback(
    (
      valuesToRestore: Partial<InterpreteLscValues> | Record<string, unknown>,
      nextEmpresa: Empresa,
      nextStep: number
    ) => {
      resetAssignedCargoAutofill();
      setIsBootstrappingForm(true);
      setEmpresa(nextEmpresa);
      reset(normalizeInterpreteLscValues(valuesToRestore, nextEmpresa));
      setStep(nextStep);
      setActiveSectionId(getInterpreteLscSectionIdForStep(nextStep));
      setCollapsedSections(INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS);
      setFinalizedSuccess(null);
      resumeDraftLifecycle();
      setServerError(null);
      resetFinalizationProgress();
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [
      reset,
      resetAssignedCargoAutofill,
      resetFinalizationProgress,
      resumeDraftLifecycle,
      setActiveSectionId,
      setCollapsedSections,
      setEmpresa,
    ]
  );

  const resolveLocalEmpresa = useCallback(
    (localEmpresa: Empresa | null) => localEmpresa ?? empresa ?? null,
    [empresa]
  );

  useEffect(() => {
    if (!restoringDraft) {
      setIsBootstrappingForm(false);
    }
  }, [restoringDraft]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateRoute() {
      if (finalizedSuccess) {
        setRestoringDraft(false);
        return;
      }

      if (draftParam) {
        const routeKey = `draft:${draftParam}`;
        setRestoringDraft(true);
        const localDraft = await loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
        const draftHydrationAction = resolveInterpreteLscDraftHydration({
          isRouteHydrated: isRouteHydrated(routeKey),
          hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        });

        const draftSource = resolveLongFormDraftSource({
          hydrationAction: draftHydrationAction,
          localDraft,
          localEmpresa,
          initialDraftResolution,
        });

        if (draftSource.action === "skip") {
          setRestoringDraft(false);
          return;
        }

        beginRouteHydration(routeKey);

        if (draftSource.action === "restore_local") {
          if (cancelled) {
            return;
          }

          if (invisibleDraftPilotEnabled) {
            setDraftAlias("interprete-lsc", localDraftSessionId, draftParam);
          }

          applyFormState(
            draftSource.draft.data,
            draftSource.empresa,
            draftSource.draft.step
          );
          markRouteHydrated(routeKey);
          setRestoringDraft(false);
          normalizeDraftBootstrapToSessionRoute();
          return;
        }

        if (
          draftSource.action === "restore_prefetched" &&
          !invisibleDraftPilotEnabled
        ) {
          applyFormState(
            draftSource.draft.data,
            draftSource.empresa,
            draftSource.draft.step
          );
          markRouteHydrated(routeKey);
          setRestoringDraft(false);
          return;
        }

        if (draftSource.action === "show_error") {
          setServerError(draftSource.message);
          markRouteHydrated(routeKey);
          setRestoringDraft(false);
          return;
        }

        const result = await loadDraft(draftParam);
        if (cancelled) return;

        if (!result.draft || !result.empresa) {
          setServerError(result.error ?? "No se pudo cargar el borrador.");
          markRouteHydrated(routeKey);
          setRestoringDraft(false);
          return;
        }

        applyFormState(result.draft.data, result.empresa, result.draft.step);
        if (invisibleDraftPilotEnabled) {
          setDraftAlias("interprete-lsc", localDraftSessionId, result.draft.id);
        }
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        normalizeDraftBootstrapToSessionRoute();
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      const sessionId = sessionParam?.trim() || localDraftSessionId;
      const routeKey = buildInterpreteLscSessionRouteKey(
        sessionId,
        explicitNewDraft
      );

      if (!empresa && !hasSessionParam) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      if (!hasSessionParam) {
        router.replace(buildFormEditorUrl("interprete-lsc", { sessionId }), {
          scroll: false,
        });
      }

      const persistedDraftId = bootstrapDraftId;
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
      const sessionHydrationAction = resolveInterpreteLscSessionHydration({
        hasEmpresa: Boolean(empresa),
        persistedDraftId,
        hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        isRouteHydrated: isRouteHydrated(routeKey),
      });

      if (sessionHydrationAction === "show_company") {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      if (sessionHydrationAction === "skip") {
        setRestoringDraft(false);
        return;
      }

      beginRouteHydration(routeKey);

      if (
        sessionHydrationAction === "restore_local" &&
        localDraft &&
        localEmpresa
      ) {
        if (!cancelled) {
          applyFormState(localDraft.data, localEmpresa, localDraft.step);
          markRouteHydrated(routeKey);
          setRestoringDraft(false);
        }
        return;
      }

      if (
        sessionHydrationAction === "load_promoted_remote" &&
        persistedDraftId
      ) {
        reportInvisibleDraftSuppression("route_hydration_redirect", "session");

        const result = await loadDraft(persistedDraftId);
        if (cancelled) {
          return;
        }

        if (!result.draft || !result.empresa) {
          setServerError(result.error ?? "No se pudo cargar el borrador.");
          markRouteHydrated(routeKey);
          setRestoringDraft(false);
          return;
        }

        applyFormState(result.draft.data, result.empresa, result.draft.step);
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (!empresa) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      applyFormState(getDefaultInterpreteLscValues(empresa), empresa, 0);
      markRouteHydrated(routeKey);
      setRestoringDraft(false);
    }

    void hydrateRoute();

    return () => {
      cancelled = true;
    };
  }, [
    applyFormState,
    beginRouteHydration,
    bootstrapDraftId,
    draftParam,
    empresa,
    explicitNewDraft,
    finalizedSuccess,
    initialDraftResolution,
    invisibleDraftPilotEnabled,
    isRouteHydrated,
    loadDraft,
    loadLocal,
    localDraftSessionId,
    markRouteHydrated,
    normalizeDraftBootstrapToSessionRoute,
    reportInvisibleDraftSuppression,
    resolveLocalEmpresa,
    router,
    sessionParam,
    setDraftAlias,
    setActiveSectionId,
    setRestoringDraft,
  ]);

  useEffect(() => {
    if (!empresa || restoringDraft || draftLifecycleSuspended) {
      return;
    }

    const subscription = watch((nextValues) => {
      autosave(step, nextValues as Record<string, unknown>);
    });

    return () => subscription.unsubscribe();
  }, [
    autosave,
    draftLifecycleSuspended,
    empresa,
    restoringDraft,
    step,
    watch,
  ]);

  useEffect(() => {
    if (
      !activeDraftId ||
      draftParam ||
      !sessionParam?.trim() ||
      restoringDraft ||
      draftLifecycleSuspended ||
      isBootstrappingForm ||
      finalizedSuccess
    ) {
      return;
    }

    if (invisibleDraftPilotEnabled) {
      reportInvisibleDraftSuppression("session_to_draft_promotion", "session");
      return;
    }

    if (
      shouldSuppressDraftNavigationWhileFinalizing(
        "interprete-lsc",
        "session_to_draft_promotion"
      )
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("interprete-lsc", {
        draftId: activeDraftId,
      }),
      { scroll: false }
    );
  }, [
    activeDraftId,
    draftLifecycleSuspended,
    draftParam,
    finalizedSuccess,
    invisibleDraftPilotEnabled,
    isBootstrappingForm,
    markRouteHydrated,
    reportInvisibleDraftSuppression,
    restoringDraft,
    router,
    sessionParam,
  ]);

  useEffect(() => {
    if (activeSectionId === "company") return;

    const nextStep = getInterpreteLscCompatStepForSection(activeSectionId);
    if (nextStep !== step) {
      setStep(nextStep);
    }
  }, [activeSectionId, step]);

  const handleSelectEmpresa = useCallback(
    (nextEmpresa: Empresa) => {
      const nextSessionId = sessionParam?.trim() || startNewDraftSession();
      const nextRoute = buildFormEditorUrl("interprete-lsc", {
        sessionId: nextSessionId,
        isNewDraft: explicitNewDraft,
      });

      setEmpresa(nextEmpresa);
      reset(getDefaultInterpreteLscValues(nextEmpresa));
      setStep(0);
      setActiveSectionId("company");
      setCollapsedSections(INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setFinalizedSuccess(null);
      setServerError(null);
      resetFinalizationProgress();
      markRouteHydrated(
        buildInterpreteLscSessionRouteKey(nextSessionId, explicitNewDraft)
      );
      router.replace(nextRoute, { scroll: false });
      window.setTimeout(() => {
        scrollToSection("company");
      }, 0);
    },
    [
      explicitNewDraft,
      markRouteHydrated,
      reset,
      resetFinalizationProgress,
      resumeDraftLifecycle,
      router,
      scrollToSection,
      sessionParam,
      setCollapsedSections,
      setEmpresa,
      setActiveSectionId,
      startNewDraftSession,
    ]
  );

  function handleSectionSelect(sectionId: InterpreteLscSectionId) {
    if (sectionId !== "company" && !hasEmpresa) {
      return;
    }

    selectSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) {
      return false;
    }

    const normalizedValues = normalizeInterpreteLscValues(getValues(), empresa);
    const nextValues: InterpreteLscValues = {
      ...normalizedValues,
      asistentes: normalizePersistedAsistentesForMode(
        normalizedValues.asistentes,
        {
          mode: "reca_plus_generic_attendees",
          profesionalAsignado: empresa?.profesional_asignado,
        }
      ),
    };

    reset(nextValues);
    const result = await saveDraft(step, nextValues as Record<string, unknown>);
    if (!result.ok) {
      setServerError(
        result.error ?? "No se pudo guardar el borrador. Intenta de nuevo."
      );
      return false;
    }

    setServerError(null);
    if (finalizedSuccess) {
      return true;
    }
    if (result.draftId && draftParam !== result.draftId) {
      if (invisibleDraftPilotEnabled) {
        reportInvisibleDraftSuppression("save_draft_redirect", "session");
        return true;
      }

      if (
        shouldSuppressDraftNavigationWhileFinalizing(
          "interprete-lsc",
          "save_draft_redirect"
        )
      ) {
        return true;
      }

      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("interprete-lsc", {
          draftId: result.draftId,
        }),
        { scroll: false }
      );
    }

    return true;
  }

  function onInvalid(nextErrors: FieldErrors<InterpreteLscValues>) {
    resetFinalizationProgress();
    const validationTarget = navigateToValidationTarget(nextErrors, (message) =>
      setServerError(message)
    );

    if (!validationTarget || !isDocumentEditable || !empresa) {
      return;
    }

    const normalizedValues = normalizeInterpreteLscValues(getValues(), empresa);
    const nextValues: InterpreteLscValues = {
      ...normalizedValues,
      asistentes: normalizePersistedAsistentesForMode(
        normalizedValues.asistentes,
        {
          mode: "reca_plus_generic_attendees",
          profesionalAsignado: empresa?.profesional_asignado,
        }
      ),
    };

    checkpointInvalidSubmission({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          getInterpreteLscCompatStepForSection(validationTarget.sectionId),
          nextValues as Record<string, unknown>,
          "interval"
        ),
      onPromoteDraft: reportInvalidSubmissionPromotion,
      onError: () => {
        setServerError(
          "Revisa los campos resaltados antes de finalizar. Ademas, no se pudo guardar el borrador automaticamente."
        );
      },
    });
  }

  function handleReturnToHub() {
    void returnToHubTab("/hub");
  }

  function handleStartNewForm() {
    startNewDraftSession();
    clearEmpresa();
    resetAssignedCargoAutofill();
    setIsBootstrappingForm(true);
    setFinalizedSuccess(null);
    clearFinalizationUiLock("interprete-lsc");
    resumeDraftLifecycle();
    setServerError(null);
    resetFinalizationProgress();
    reset(getDefaultInterpreteLscValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("interprete-lsc", { isNewDraft: true }));
  }

  function handleFillTestData() {
    if (!isDocumentEditable) {
      return;
    }

    const nextValues = buildInterpreteLscManualTestValues(empresa, getValues());
    reset(nextValues);
    setServerError(null);
    void autosave(step, nextValues as Record<string, unknown>);
  }

  if (finalizedSuccess) {
    return {
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: (
          <>
            El servicio de interpretacion LSC para{" "}
            <span className="font-semibold text-gray-700">
              {finalizedSuccess.companyName}
            </span>{" "}
            fue registrado correctamente.
          </>
        ),
        links: finalizedSuccess.links,
        notice: finalizedSuccess.links?.pdfLink ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-900">
            El PDF final ya fue generado, pero el enlace requiere iniciar sesion
            en Google para abrirlo.
          </div>
        ) : null,
        onReturnToHub: handleReturnToHub,
        onStartNewForm: handleStartNewForm,
      },
    };
  }

  if (
    (draftParam && (restoringDraft || loadingDraft)) ||
    (!draftParam && !empresa && restoringDraft)
  ) {
    return { mode: "loading" };
  }

  if (draftParam && !empresa && !restoringDraft) {
    return {
      mode: "draft_error",
      draftErrorState: {
        message:
          serverError ??
          "No fue posible reconstruir la empresa asociada a este borrador.",
        onBackToDrafts: () => router.push("/hub?panel=drafts"),
      },
    };
  }

  return {
    mode: "editing",
    presenterProps: {
      shell: {
        title: "Interprete LSC",
        companyName: empresa?.nombre_empresa,
        onBack: handleReturnToHub,
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as InterpreteLscSectionId),
        serverError,
        finalizationFeedback:
          shouldRenderInlineLongFormFinalizationFeedback({
            progress: finalizationProgress,
            dialogOpen: submitConfirmOpen || isFinalizing,
          }) ? (
            <LongFormFinalizationStatus progress={finalizationProgress} />
          ) : null,
        finalizationFeedbackRef,
        submitAction: (
          <div className="flex items-center gap-3">
            {showTestFillAction ? (
              <LongFormTestFillButton
                disabled={isSubmitting || isFinalizing || !isDocumentEditable}
                onClick={handleFillTestData}
              />
            ) : null}
            <LongFormFinalizeButton
              disabled={isSubmitting || isFinalizing || !isDocumentEditable}
              isSubmitting={isSubmitting}
              isFinalizing={isFinalizing}
            />
          </div>
        ),
        onFormBlurCapture: handleFormBlurCapture,
        formProps: {
          onSubmit: handleSubmit(handlePrepareSubmit, onInvalid),
          noValidate: true,
        },
      },
      draftStatus: (
        <DraftPersistenceStatus
          {...buildDraftStatusProps({
            onSave: handleSaveDraft,
            saveDisabled: savingDraft || isFinalizing || !isDocumentEditable,
          })}
        />
      ),
      notice: showTakeoverPrompt ? (
        <DraftLockBanner
          {...buildDraftLockBannerProps({
            setServerError,
            onBackToDrafts: () => router.push("/hub?panel=drafts"),
          })} 
        />
      ) : null,
      serviceSummary,
      sections: {
        company: {
          empresa,
          fechaVisita,
          modalidadInterprete,
          modalidadProfesionalReca,
          nitEmpresa,
          register,
          errors,
          onSelectEmpresa: handleSelectEmpresa,
          disabled: !isDocumentEditable,
          collapsed: collapsedSections.company,
          status: sectionStatuses.company,
          sectionRef: companyRef,
          onToggle: () => toggleSection("company"),
          onFocusCapture: () => setActiveSectionId("company"),
        },
        participants: {
          isDocumentEditable,
          control,
          register,
          setValue,
          errors,
          collapsed: collapsedSections.participants,
          status: sectionStatuses.participants,
          sectionRef: participantsRef,
          onToggle: () => toggleSection("participants"),
          onFocusCapture: () => setActiveSectionId("participants"),
        },
        interpreters: {
          isDocumentEditable,
          control,
          register,
          setValue,
          errors,
          interpretesCatalog,
          interpretesCatalogError,
          creatingInterpreteName,
          onCreateInterprete: createInterprete,
          collapsed: collapsedSections.interpreters,
          status: sectionStatuses.interpreters,
          sectionRef: interpretersRef,
          onToggle: () => toggleSection("interpreters"),
          onFocusCapture: () => setActiveSectionId("interpreters"),
        },
        attendees: {
          isDocumentEditable,
          control,
          register,
          setValue,
          errors,
          profesionales,
          profesionalAsignado: empresa?.profesional_asignado,
          collapsed: collapsedSections.attendees,
          status: sectionStatuses.attendees,
          sectionRef: attendeesRef,
          onToggle: () => toggleSection("attendees"),
          onFocusCapture: () => setActiveSectionId("attendees"),
        },
      },
      submitDialog: {
        open: submitConfirmOpen || isFinalizing,
        description:
          "Esta accion publicara el acta en Google Sheets y generara el PDF final. Confirma solo cuando hayas revisado la informacion.",
        confirmLabel:
          finalizationProgress.phase === "error"
            ? finalizationProgress.retryAction === "check_status"
              ? "Verificar de nuevo"
              : "Reintentar"
            : undefined,
        cancelLabel:
          finalizationProgress.phase === "error" ? "Cerrar" : undefined,
        phase:
          isFinalizing || finalizationProgress.phase === "error"
            ? "processing"
            : "confirm",
        progress: finalizationProgress,
        loading: isFinalizing,
        onCancel: cancelSubmitDialog,
        onConfirm: () => {
          void confirmSubmit(
            finalizationProgress.phase === "error" &&
              finalizationProgress.retryAction === "check_status"
              ? "check_status"
              : "submit"
          );
        },
      },
    },
  };
}
