"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  useForm,
  useWatch,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { InterpreteLscFormPresenterProps } from "@/components/forms/interpreteLsc/InterpreteLscFormPresenter";
import type { LongFormSectionNavItem } from "@/components/forms/shared/LongFormSectionNav";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";
import {
  LongFormDraftErrorState,
  LongFormFinalizeButton,
  LongFormLoadingOverlay,
  LongFormSuccessState,
  LongFormTestFillButton,
} from "@/components/forms/shared/LongFormShell";
import { useInterpretesCatalog } from "@/hooks/useInterpretesCatalog";
import { useGooglePrewarm } from "@/hooks/useGooglePrewarm";
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";
import { useInvisibleDraftTelemetry } from "@/hooks/useInvisibleDraftTelemetry";
import { useInterpreteLscDraftRuntime } from "@/hooks/interpreteLsc/useInterpreteLscDraftRuntime";
import { useInterpreteLscFinalizationRuntime } from "@/hooks/interpreteLsc/useInterpreteLscFinalizationRuntime";
import { useLongFormSections } from "@/hooks/useLongFormSections";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
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
  countMeaningfulInterpreteLscAsistentes,
  countMeaningfulInterpreteLscInterpretes,
  countMeaningfulInterpreteLscOferentes,
  getDefaultInterpreteLscValues,
  normalizeInterpreteLscValues,
} from "@/lib/interpreteLsc";
import {
  buildInterpreteLscSectionNavItems,
  buildInterpreteLscSectionStatuses,
  getInterpreteLscCompatStepForSection,
  getInterpreteLscSectionIdForStep,
  INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS,
  isInterpreteLscAttendeesRowsComplete,
  isInterpreteLscCompanyFieldsComplete,
  isInterpreteLscInterpretersRowsComplete,
  isInterpreteLscParticipantsRowsComplete,
  type InterpreteLscSectionId,
} from "@/lib/interpreteLscSections";
import { getInterpreteLscValidationTarget } from "@/lib/interpreteLscValidationNavigation";
import type { LongFormFinalizedSuccess } from "@/lib/longFormSuccess";
import { resolveLongFormDraftSource } from "@/lib/longFormHydration";
import {
  shouldRenderInlineLongFormFinalizationFeedback,
} from "@/lib/longFormFinalization";
import {
  buildInterpreteLscManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  interpreteLscSchema,
  type InterpreteLscValues,
} from "@/lib/validations/interpreteLsc";

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
  const appliedAssignedCargoKeyRef = useRef<string | null>(null);
  const { profesionales } = useProfesionalesCatalog();
  const {
    interpretes: interpretesCatalog,
    error: interpretesCatalogError,
    creatingName: creatingInterpreteName,
    createInterprete,
  } = useInterpretesCatalog();
  const interpreteLscResolver = useMemo(
    () => zodResolver(interpreteLscSchema) as Resolver<InterpreteLscValues>,
    []
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InterpreteLscValues>({
    resolver: interpreteLscResolver,
    defaultValues: getDefaultInterpreteLscValues(empresa),
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const [
    fechaVisita = "",
    modalidadInterprete = "",
    modalidadProfesionalReca = "",
    nitEmpresa = "",
    oferentes = [],
    interpretes = [],
    sabana = { activo: false, horas: 1 },
    sumatoriaHoras = "",
    asistentes = [],
  ] = useWatch({
    control,
    name: [
      "fecha_visita",
      "modalidad_interprete",
      "modalidad_profesional_reca",
      "nit_empresa",
      "oferentes",
      "interpretes",
      "sabana",
      "sumatoria_horas",
      "asistentes",
    ],
  }) as [
    InterpreteLscValues["fecha_visita"] | undefined,
    InterpreteLscValues["modalidad_interprete"] | undefined,
    InterpreteLscValues["modalidad_profesional_reca"] | undefined,
    InterpreteLscValues["nit_empresa"] | undefined,
    InterpreteLscValues["oferentes"] | undefined,
    InterpreteLscValues["interpretes"] | undefined,
    InterpreteLscValues["sabana"] | undefined,
    InterpreteLscValues["sumatoria_horas"] | undefined,
    InterpreteLscValues["asistentes"] | undefined,
  ];
  const companyComplete = useMemo(
    () =>
      isInterpreteLscCompanyFieldsComplete({
        fechaVisita,
        modalidadInterprete,
        modalidadProfesionalReca,
        nitEmpresa,
      }),
    [fechaVisita, modalidadInterprete, modalidadProfesionalReca, nitEmpresa]
  );
  const participantsComplete = useMemo(
    () => isInterpreteLscParticipantsRowsComplete(oferentes),
    [oferentes]
  );
  const interpretersComplete = useMemo(
    () => isInterpreteLscInterpretersRowsComplete(interpretes),
    [interpretes]
  );
  const attendeesComplete = useMemo(
    () => isInterpreteLscAttendeesRowsComplete(asistentes),
    [asistentes]
  );
  const serviceSummary = useMemo(() => {
    if (!empresa) {
      return null;
    }

    const oferentesCount = countMeaningfulInterpreteLscOferentes(oferentes);
    const interpretesCount = countMeaningfulInterpreteLscInterpretes(interpretes);
    const asistentesCount = countMeaningfulInterpreteLscAsistentes(asistentes);
    const sabanaHoras = Number.isInteger(sabana?.horas)
      ? String(sabana?.horas ?? 0)
      : String(sabana?.horas ?? 0).replace(/\\.0$/, "");

    return {
      oferentesCount,
      interpretesCount,
      asistentesCount,
      sumatoriaHoras: sumatoriaHoras || "0:00",
      sabanaLabel: sabana?.activo
        ? `${sabanaHoras} horas adicionales`
        : "No aplica",
    };
  }, [asistentes, empresa, interpretes, oferentes, sabana, sumatoriaHoras]);

  const formTabLabel = getFormTabLabel("interprete-lsc");
  const showTestFillAction = isManualTestFillEnabled();
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const showTakeoverPrompt = isReadonlyDraft;
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
  const isHydratingDraftVisual = Boolean(
    !finalizedSuccess &&
      !currentRouteHydrationSettled &&
      (restoringDraft || (draftParam && loadingDraft))
  );
  const companyRef = useRef<HTMLElement | null>(null);
  const participantsRef = useRef<HTMLElement | null>(null);
  const interpretersRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useMemo(
    () => ({
      company: companyRef,
      participants: participantsRef,
      interpreters: interpretersRef,
      attendees: attendeesRef,
    }),
    []
  );
  const {
    activeSectionId,
    setActiveSectionId,
    collapsedSections,
    setCollapsedSections,
    scrollToSection,
    toggleSection,
    selectSection,
  } = useLongFormSections<InterpreteLscSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS,
    sectionRefs,
  });
  const errorSectionId = useMemo(
    () => getInterpreteLscValidationTarget(errors)?.sectionId ?? null,
    [errors]
  );
  const sectionCompletion = useMemo(
    () => ({
      company: companyComplete,
      participants: participantsComplete,
      interpreters: interpretersComplete,
      attendees: attendeesComplete,
    }),
    [
      attendeesComplete,
      companyComplete,
      interpretersComplete,
      participantsComplete,
    ]
  );
  const sectionStatuses = useMemo(
    () =>
      buildInterpreteLscSectionStatuses({
        activeSectionId,
        hasEmpresa,
        completion: sectionCompletion,
        errorSectionId,
      }),
    [activeSectionId, errorSectionId, hasEmpresa, sectionCompletion]
  );
  const navItems = useMemo<LongFormSectionNavItem[]>(
    () => buildInterpreteLscSectionNavItems(sectionStatuses),
    [sectionStatuses]
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

  const nextRoute = buildFormEditorUrl("interprete-lsc", {
      sessionId: localDraftSessionId,
    });
    window.history.replaceState(window.history.state, "", nextRoute);
  }, [draftParam, invisibleDraftPilotEnabled, localDraftSessionId]);
  const resetAssignedCargoAutofill = useCallback(() => {
    appliedAssignedCargoKeyRef.current = null;
  }, []);

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

  useEffect(() => {
    const assignedProfessional = empresa?.profesional_asignado ?? "";
    if (!assignedProfessional || isBootstrappingForm) return;
    const empresaIdentity = empresa?.id || empresa?.nit_empresa || "";
    const cargoAutofillKey = `${empresaIdentity}:${assignedProfessional.toLowerCase()}`;
    if (appliedAssignedCargoKeyRef.current === cargoAutofillKey) return;
    if (getValues("asistentes.0.cargo")) {
      appliedAssignedCargoKeyRef.current = cargoAutofillKey;
      return;
    }

    const match = profesionales.find(
      (profesional) =>
        profesional.nombre_profesional.toLowerCase() ===
        assignedProfessional.toLowerCase()
    );

    if (match?.cargo_profesional) {
      setValue("asistentes.0.cargo", match.cargo_profesional, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      appliedAssignedCargoKeyRef.current = cargoAutofillKey;
    }
  }, [
    empresa?.id,
    empresa?.nit_empresa,
    empresa?.profesional_asignado,
    getValues,
    isBootstrappingForm,
    profesionales,
    setValue,
  ]);

  const navigateToValidationTarget = useCallback(
    (
      nextErrors: FieldErrors<InterpreteLscValues>,
      onErrorMessage: (message: string) => void
    ) => {
      const validationTarget = getInterpreteLscValidationTarget(nextErrors);
      if (!validationTarget) {
        onErrorMessage("Revisa los campos resaltados antes de finalizar.");
        return null;
      }

      setCollapsedSections((current) => ({
        ...current,
        [validationTarget.sectionId]: false,
      }));
      onErrorMessage("Revisa los campos resaltados antes de finalizar.");
      scrollToSection(validationTarget.sectionId);
      focusFieldByNameAfterPaint(validationTarget.fieldName);
      return validationTarget;
    },
    [scrollToSection, setCollapsedSections]
  );

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

  const empresaRef = useRef(empresa);

  useEffect(() => {
    empresaRef.current = empresa;
  }, [empresa]);

  useEffect(() => {
    if (!restoringDraft) {
      setIsBootstrappingForm(false);
    }
  }, [restoringDraft]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateRoute() {
      const currentEmpresa = empresaRef.current;

      if (finalizedSuccess) {
        setRestoringDraft(false);
        return;
      }

      if (draftParam) {
        const routeKey = `draft:${draftParam}`;
        const routeAlreadyHydrated = isRouteHydrated(routeKey);
        if (!routeAlreadyHydrated) {
          setRestoringDraft(true);
        }
        const localDraft = await loadLocal();
        const localEmpresa = localDraft?.empresa ?? currentEmpresa ?? null;
        const draftHydrationAction = resolveInterpreteLscDraftHydration({
          isRouteHydrated: routeAlreadyHydrated,
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
            setRestoringDraft(false);
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
        if (cancelled) {
          setRestoringDraft(false);
          return;
        }

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

      if (!currentEmpresa && !hasSessionParam) {
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
      const localEmpresa = localDraft?.empresa ?? currentEmpresa ?? null;
      const sessionHydrationAction = resolveInterpreteLscSessionHydration({
        hasEmpresa: Boolean(currentEmpresa),
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
        if (cancelled) {
          setRestoringDraft(false);
          return;
        }

        applyFormState(localDraft.data, localEmpresa, localDraft.step);
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (
        sessionHydrationAction === "load_promoted_remote" &&
        persistedDraftId
      ) {
        reportInvisibleDraftSuppression("route_hydration_redirect", "session");

        const result = await loadDraft(persistedDraftId);
        if (cancelled) {
          setRestoringDraft(false);
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

      if (!currentEmpresa) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      applyFormState(
        getDefaultInterpreteLscValues(currentEmpresa),
        currentEmpresa,
        0
      );
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

  const handleSaveDraft = useCallback(async () => {
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
  }, [
    draftParam,
    empresa,
    finalizedSuccess,
    getValues,
    invisibleDraftPilotEnabled,
    isDocumentEditable,
    markRouteHydrated,
    reportInvisibleDraftSuppression,
    reset,
    router,
    saveDraft,
    setServerError,
    step,
  ]);

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

  const finalizationFeedbackNode = useMemo(
    () =>
      shouldRenderInlineLongFormFinalizationFeedback({
        progress: finalizationProgress,
        dialogOpen: submitConfirmOpen || isFinalizing,
      }) ? (
        <LongFormFinalizationStatus progress={finalizationProgress} />
      ) : null,
    [finalizationProgress, isFinalizing, submitConfirmOpen]
  );

  const draftStatusNode = useMemo(
    () => (
      <DraftPersistenceStatus
        {...buildDraftStatusProps({
          onSave: handleSaveDraft,
          saveDisabled: savingDraft || isFinalizing || !isDocumentEditable,
        })}
      />
    ),
    [
      buildDraftStatusProps,
      handleSaveDraft,
      isDocumentEditable,
      isFinalizing,
      savingDraft,
    ]
  );

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
    draftParam &&
    !empresa &&
    !restoringDraft &&
    !loadingDraft &&
    currentRouteHydrationSettled
  ) {
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
        finalizationFeedback: finalizationFeedbackNode,
        finalizationFeedbackRef,
        loadingOverlay: isHydratingDraftVisual ? (
          <LongFormLoadingOverlay />
        ) : null,
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
      draftStatus: draftStatusNode,
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
          getValues,
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
