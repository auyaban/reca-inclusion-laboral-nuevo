"use client";

import type { ComponentProps } from "react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { SeleccionFormPresenterProps } from "@/components/forms/seleccion/SeleccionFormPresenter";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";
import {
  LongFormDraftErrorState,
  LongFormFinalizeButton,
  LongFormTestFillButton,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import type { LongFormSectionNavItem } from "@/components/forms/shared/LongFormSectionNav";
import type { LongFormSectionStatus } from "@/components/forms/shared/LongFormSectionCard";
import { useLongFormDraftController } from "@/hooks/useLongFormDraftController";
import { useLongFormSections } from "@/hooks/useLongFormSections";
import { useGooglePrewarm } from "@/hooks/useGooglePrewarm";
import { useInvisibleDraftTelemetry } from "@/hooks/useInvisibleDraftTelemetry";
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { returnToHubTab } from "@/lib/actaTabs";
import {
  getMeaningfulAsistentes,
  normalizePersistedAsistentesForMode,
} from "@/lib/asistentes";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import {
  normalizeInvisibleDraftRouteParams,
  setDraftAlias,
} from "@/lib/drafts";
import { isInvisibleDraftPilotEnabled } from "@/lib/drafts/invisibleDraftConfig";
import { resolveInvisibleDraftBootstrapId } from "@/lib/drafts/invisibleDrafts";
import {
  FinalizationConfirmationError,
  waitForFinalizationConfirmation,
} from "@/lib/finalization/finalizationConfirmation";
import {
  beginFinalizationUiLock,
  clearFinalizationUiLock,
  shouldSuppressDraftNavigationWhileFinalizing,
} from "@/lib/finalization/finalizationUiLock";
import { buildSeleccionRequestHash } from "@/lib/finalization/idempotency";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import type { LongFormFinalizedSuccess } from "@/lib/longFormSuccess";
import { resolveLongFormDraftSource } from "@/lib/longFormHydration";
import {
  clearLongFormViewState,
  loadLongFormViewState,
  restoreLongFormScroll,
  saveLongFormViewState,
  type LongFormHydrationIntent,
  type LongFormStoredViewState,
} from "@/lib/longFormViewState";
import {
  getInitialLongFormFinalizationProgress,
  shouldRenderInlineLongFormFinalizationFeedback,
  type LongFormFinalizationRetryAction,
  type LongFormFinalizationProgress,
} from "@/lib/longFormFinalization";
import {
  buildSeleccionManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import {
  buildSeleccionSessionRouteKey,
  resolveSeleccionDraftHydration,
  resolveSeleccionSessionHydration,
} from "@/lib/seleccionHydration";
import {
  getDefaultSeleccionValues,
  normalizeSeleccionValues,
} from "@/lib/seleccion";
import {
  getSeleccionCompatStepForSection,
  getSeleccionSectionIdForStep,
  INITIAL_SELECCION_COLLAPSED_SECTIONS,
  isSeleccionActivitySectionComplete,
  isSeleccionAttendeesSectionComplete,
  isSeleccionCompanySectionComplete,
  isSeleccionOferentesSectionComplete,
  isSeleccionRecommendationsSectionComplete,
  SELECCION_SECTION_LABELS,
  type SeleccionSectionId,
} from "@/lib/seleccionSections";
import { getSeleccionValidationTarget } from "@/lib/seleccionValidationNavigation";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  seleccionSchema,
  type SeleccionValues,
} from "@/lib/validations/seleccion";

type LoadingState = { mode: "loading" };
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
  presenterProps: SeleccionFormPresenterProps;
};

type FinalizedSuccessState = LongFormFinalizedSuccess;

export type SeleccionFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

type UseSeleccionFormStateOptions = {
  initialDraftResolution?: InitialDraftResolution;
};

export function useSeleccionFormState({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: UseSeleccionFormStateOptions = {}): SeleccionFormState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const clearEmpresa = useEmpresaStore((state) => state.clearEmpresa);
  const rawDraftParam = searchParams.get("draft");
  const rawSessionParam = searchParams.get("session");
  const { draftParam, sessionParam } = useMemo(
    () =>
      normalizeInvisibleDraftRouteParams({
        draftParam: rawDraftParam,
        sessionParam: rawSessionParam,
      }),
    [rawDraftParam, rawSessionParam]
  );
  const explicitNewDraft = searchParams.get("new") === "1";
  const invisibleDraftPilotEnabled = isInvisibleDraftPilotEnabled("seleccion");
  const bootstrapDraftId = useMemo(
    () =>
      resolveInvisibleDraftBootstrapId({
        formSlug: "seleccion",
        draftParam,
        sessionParam,
      }),
    [draftParam, sessionParam]
  );
  const [step, setStep] = useState(0);
  const [finalizedSuccess, setFinalizedSuccess] =
    useState<FinalizedSuccessState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] =
    useState<SeleccionValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] =
    useState<LongFormFinalizationProgress>(
      getInitialLongFormFinalizationProgress
    );
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const appliedAssignedCargoKeyRef = useRef<string | null>(null);
  const finalizationFeedbackRef = useRef<HTMLDivElement | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const activityRef = useRef<HTMLElement | null>(null);
  const oferentesRef = useRef<HTMLElement | null>(null);
  const recommendationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();

  const draftController = useLongFormDraftController({
    slug: "seleccion",
    empresa,
    initialDraftId: bootstrapDraftId,
    initialLocalDraftSessionId: sessionParam,
    initialRestoring: Boolean(bootstrapDraftId || sessionParam?.trim()),
  });

  const {
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
  } = draftController;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SeleccionValues>({
    resolver: zodResolver(seleccionSchema),
    defaultValues: getDefaultSeleccionValues(empresa),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const watchedValues = useWatch({
    control,
    name: [
      "fecha_visita",
      "modalidad",
      "nit_empresa",
      "desarrollo_actividad",
      "ajustes_recomendaciones",
      "nota",
    ] as const,
  });
  const [
    watchedFechaVisita,
    watchedModalidad,
    watchedNitEmpresa,
    watchedDesarrolloActividad,
    watchedAjustesRecomendaciones,
    watchedNota,
  ] = watchedValues as [
    SeleccionValues["fecha_visita"] | undefined,
    SeleccionValues["modalidad"] | undefined,
    SeleccionValues["nit_empresa"] | undefined,
    SeleccionValues["desarrollo_actividad"] | undefined,
    SeleccionValues["ajustes_recomendaciones"] | undefined,
    SeleccionValues["nota"] | undefined,
  ];
  const [repeatedSectionSnapshot, setRepeatedSectionSnapshot] = useState(() => ({
    oferentes: getValues("oferentes"),
    asistentes: getValues("asistentes"),
  }));
  const values = useMemo<SeleccionValues>(
    () => ({
      fecha_visita: watchedFechaVisita ?? getValues("fecha_visita"),
      modalidad: watchedModalidad ?? getValues("modalidad"),
      nit_empresa: watchedNitEmpresa ?? getValues("nit_empresa"),
      desarrollo_actividad:
        watchedDesarrolloActividad ?? getValues("desarrollo_actividad"),
      ajustes_recomendaciones:
        watchedAjustesRecomendaciones ?? getValues("ajustes_recomendaciones"),
      nota: watchedNota ?? getValues("nota"),
      oferentes: repeatedSectionSnapshot.oferentes,
      asistentes: repeatedSectionSnapshot.asistentes,
    }),
    [
      getValues,
      watchedAjustesRecomendaciones,
      watchedDesarrolloActividad,
      watchedFechaVisita,
      watchedModalidad,
      watchedNitEmpresa,
      watchedNota,
      repeatedSectionSnapshot,
    ]
  );
  const {
    fecha_visita: fechaVisita,
    modalidad,
    nit_empresa: nitEmpresa,
    desarrollo_actividad: desarrolloActividad,
    ajustes_recomendaciones: ajustesRecomendaciones,
    nota,
  } = values;

  const formTabLabel = getFormTabLabel("seleccion");
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const showTestFillAction = isManualTestFillEnabled();
  const showTakeoverPrompt = isReadonlyDraft;
  const currentRouteHydrationSettled = useMemo(() => {
    const routeKey = draftParam
      ? `draft:${draftParam}`
      : buildSeleccionSessionRouteKey(
          sessionParam?.trim() || localDraftSessionId,
          explicitNewDraft
        );

    return isRouteHydrationSettled(routeKey);
  }, [
    draftParam,
    explicitNewDraft,
    isRouteHydrationSettled,
    localDraftSessionId,
    sessionParam,
  ]);
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
    formSlug: "seleccion",
    empresa,
    formData: {
      oferentes: repeatedSectionSnapshot.oferentes,
      asistentes: repeatedSectionSnapshot.asistentes,
    },
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

  const { reportInvisibleDraftSuppression } = useInvisibleDraftTelemetry({
    formSlug: "seleccion",
    draftParam,
    activeDraftId,
    editingAuthorityState,
    lockConflict,
    invisibleDraftPilotEnabled,
    showTakeoverPrompt,
  });
  const companySectionComplete = useMemo(
    () =>
      hasEmpresa &&
      isSeleccionCompanySectionComplete({
        fecha_visita: fechaVisita,
        modalidad,
        nit_empresa: nitEmpresa,
      }),
    [fechaVisita, hasEmpresa, modalidad, nitEmpresa]
  );
  const oferentesSectionComplete = useMemo(
    () =>
      hasEmpresa &&
      isSeleccionOferentesSectionComplete({
        oferentes: repeatedSectionSnapshot.oferentes,
      }),
    [hasEmpresa, repeatedSectionSnapshot.oferentes]
  );
  const activitySectionComplete = useMemo(
    () =>
      hasEmpresa &&
      isSeleccionActivitySectionComplete({
        desarrollo_actividad: desarrolloActividad,
        oferentes: repeatedSectionSnapshot.oferentes,
      }),
    [desarrolloActividad, hasEmpresa, repeatedSectionSnapshot.oferentes]
  );
  const recommendationsSectionComplete = useMemo(
    () =>
      hasEmpresa &&
      isSeleccionRecommendationsSectionComplete({
        ajustes_recomendaciones: ajustesRecomendaciones,
        nota,
      }),
    [ajustesRecomendaciones, hasEmpresa, nota]
  );
  const attendeesSectionComplete = useMemo(
    () =>
      hasEmpresa &&
      isSeleccionAttendeesSectionComplete({
        asistentes: repeatedSectionSnapshot.asistentes,
      }),
    [hasEmpresa, repeatedSectionSnapshot.asistentes]
  );

  const sectionRefs = useMemo(
    () => ({
      company: companyRef,
      activity: activityRef,
      oferentes: oferentesRef,
      recommendations: recommendationsRef,
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
  } = useLongFormSections<SeleccionSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_SELECCION_COLLAPSED_SECTIONS,
    sectionRefs,
  });
  const activeSectionIdRef = useRef<SeleccionSectionId>("company");
  const collapsedSectionsRef = useRef(INITIAL_SELECCION_COLLAPSED_SECTIONS);

  useEffect(() => {
    activeSectionIdRef.current = activeSectionId;
  }, [activeSectionId]);

  useEffect(() => {
    collapsedSectionsRef.current = collapsedSections;
  }, [collapsedSections]);

  const currentRouteKey = useMemo(() => {
    if (draftParam) {
      return `draft:${draftParam}`;
    }

    const sessionId = sessionParam?.trim() || localDraftSessionId;
    return buildSeleccionSessionRouteKey(sessionId, explicitNewDraft);
  }, [draftParam, explicitNewDraft, localDraftSessionId, sessionParam]);

  const sectionStatuses = useMemo(() => {
    const errorSectionId = getSeleccionValidationTarget(errors)?.sectionId ?? null;

    function getStatus(
      id: SeleccionSectionId,
      options?: { completed?: boolean; disabled?: boolean }
    ): LongFormSectionStatus {
      if (activeSectionId === id) return "active";
      if (options?.disabled) return "disabled";
      if (errorSectionId === id) return "error";
      if (options?.completed) return "completed";
      return "idle";
    }

    return {
      company: getStatus("company", {
        completed: companySectionComplete,
      }),
      activity: getStatus("activity", {
        completed: activitySectionComplete,
        disabled: !hasEmpresa,
      }),
      oferentes: getStatus("oferentes", {
        completed: oferentesSectionComplete,
        disabled: !hasEmpresa,
      }),
      recommendations: getStatus("recommendations", {
        completed: recommendationsSectionComplete,
        disabled: !hasEmpresa,
      }),
      attendees: getStatus("attendees", {
        completed: attendeesSectionComplete,
        disabled: !hasEmpresa,
      }),
    };
  }, [
    activeSectionId,
    activitySectionComplete,
    attendeesSectionComplete,
    companySectionComplete,
    errors,
    hasEmpresa,
    oferentesSectionComplete,
    recommendationsSectionComplete,
  ]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () => [
      {
        id: "company",
        label: SELECCION_SECTION_LABELS.company,
        shortLabel: "Empresa",
        status: sectionStatuses.company,
      },
      {
        id: "activity",
        label: SELECCION_SECTION_LABELS.activity,
        shortLabel: "Actividad",
        status: sectionStatuses.activity,
      },
      {
        id: "oferentes",
        label: SELECCION_SECTION_LABELS.oferentes,
        shortLabel: "Oferentes",
        status: sectionStatuses.oferentes,
      },
      {
        id: "recommendations",
        label: SELECCION_SECTION_LABELS.recommendations,
        shortLabel: "Ajustes",
        status: sectionStatuses.recommendations,
      },
      {
        id: "attendees",
        label: SELECCION_SECTION_LABELS.attendees,
        shortLabel: "Asistentes",
        status: sectionStatuses.attendees,
      },
    ],
    [sectionStatuses]
  );

  const normalizeDraftBootstrapToSessionRoute = useCallback(() => {
    if (
      !invisibleDraftPilotEnabled ||
      !draftParam ||
      !localDraftSessionId.trim()
    ) {
      return;
    }

    router.replace(
      buildFormEditorUrl("seleccion", {
        sessionId: localDraftSessionId,
      }),
      { scroll: false }
    );
  }, [
    draftParam,
    invisibleDraftPilotEnabled,
    localDraftSessionId,
    router,
  ]);

  useEffect(() => {
    const companyName = empresa?.nombre_empresa?.trim();
    const baseTitle = companyName
      ? `${formTabLabel} | ${companyName}`
      : `${formTabLabel} | Nueva acta`;
    document.title = isReadonlyDraft ? `${baseTitle} | Solo lectura` : baseTitle;
  }, [empresa?.nombre_empresa, formTabLabel, isReadonlyDraft]);

  const navigateToValidationTarget = useCallback(
    (validationTarget: ReturnType<typeof getSeleccionValidationTarget>) => {
      if (!validationTarget) {
        setServerError("Revisa los campos resaltados antes de finalizar.");
        return;
      }

      setCollapsedSections((current) => ({
        ...current,
        [validationTarget.sectionId]: false,
      }));
      setServerError("Revisa los campos resaltados antes de finalizar.");
      scrollToSection(validationTarget.sectionId);
      focusFieldByNameAfterPaint(validationTarget.fieldName);
    },
    [scrollToSection, setCollapsedSections]
  );

  const resetFinalizationProgress = useCallback(() => {
    setFinalizationProgress(getInitialLongFormFinalizationProgress());
  }, []);

  const updateFinalizationStage = useCallback(
    (stageId: LongFormFinalizationProgress["currentStageId"]) => {
      if (!stageId) {
        return;
      }

      setFinalizationProgress((current) => ({
        phase: "processing",
        currentStageId: stageId,
        startedAt: current.startedAt ?? Date.now(),
        displayMessage: current.displayMessage,
        errorMessage: null,
        retryAction: current.retryAction,
      }));
    },
    []
  );

  const focusFinalizationFeedback = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      const element = finalizationFeedbackRef.current;
      if (!element) {
        return;
      }

      element.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      element.focus({ preventScroll: true });
    });
  }, []);

  const markFinalizationError = useCallback(
    (
      message: string,
      retryAction: LongFormFinalizationRetryAction = "submit",
      options?: {
        displayMessage?: string | null;
        detailMessage?: string | null;
      }
    ) => {
      setFinalizationProgress((current) => ({
        phase: "error",
        currentStageId: current.currentStageId ?? "esperando_respuesta",
        startedAt: current.startedAt ?? Date.now(),
        displayMessage: options?.displayMessage ?? null,
        errorMessage:
          options && "detailMessage" in options
            ? options.detailMessage ?? null
            : message,
        retryAction,
      }));
      focusFinalizationFeedback();
    },
    [focusFinalizationFeedback]
  );

  const updateFinalizationStatusContext = useCallback(
    (context: {
      displayMessage: string;
      retryAction: LongFormFinalizationRetryAction;
    }) => {
      setFinalizationProgress((current) => ({
        ...current,
        displayMessage: context.displayMessage,
        retryAction: context.retryAction,
      }));
    },
    []
  );

  const persistCurrentViewState = useCallback(
    (routeKey = currentRouteKey) => {
      if (!routeKey || typeof window === "undefined") {
        return;
      }

      saveLongFormViewState({
        slug: "seleccion",
        routeKey,
        viewState: {
          activeSectionId: activeSectionIdRef.current,
          collapsedSections: collapsedSectionsRef.current,
          scrollY: window.scrollY,
        },
      });
    },
    [currentRouteKey]
  );

  const applyFormState = useCallback(
    (
      valuesToRestore: Partial<SeleccionValues> | Record<string, unknown>,
      nextEmpresa: Empresa,
      nextStep: number,
      intent: LongFormHydrationIntent,
      routeKey: string
    ) => {
      const normalizedValues = normalizeSeleccionValues(valuesToRestore, nextEmpresa);
      const nextSectionId = getSeleccionSectionIdForStep(nextStep);
      const storedViewState = loadLongFormViewState<SeleccionSectionId>({
        slug: "seleccion",
        routeKey,
      });
      const currentViewState: LongFormStoredViewState<SeleccionSectionId> = {
        activeSectionId: activeSectionIdRef.current,
        collapsedSections: collapsedSectionsRef.current,
        scrollY: typeof window === "undefined" ? 0 : window.scrollY,
      };
      const restoredViewState =
        intent === "silent_restore"
          ? storedViewState ?? currentViewState
          : intent === "explicit_restore"
            ? storedViewState
            : null;

      appliedAssignedCargoKeyRef.current = null;
      setIsBootstrappingForm(true);
      setEmpresa(nextEmpresa);
      reset(normalizedValues);
      setRepeatedSectionSnapshot({
        oferentes: normalizedValues.oferentes,
        asistentes: normalizedValues.asistentes,
      });
      setStep(nextStep);
      setActiveSectionId(restoredViewState?.activeSectionId ?? nextSectionId);
      setCollapsedSections(
        restoredViewState?.collapsedSections ?? INITIAL_SELECCION_COLLAPSED_SECTIONS
      );
      setFinalizedSuccess(null);
      resumeDraftLifecycle();
      setServerError(null);
      resetFinalizationProgress();

      if (intent === "new_form" || intent === "post_finalize") {
        restoreLongFormScroll({ scrollY: 0 });
        return;
      }

      restoreLongFormScroll({
        scrollY: restoredViewState?.scrollY,
        sectionElement: sectionRefs[restoredViewState?.activeSectionId ?? nextSectionId]
          .current,
      });
    },
    [
      reset,
      resetFinalizationProgress,
      resumeDraftLifecycle,
      sectionRefs,
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

  useEffect(() => {
    if (finalizedSuccess) {
      return;
    }

    let cancelled = false;

    async function hydrateRoute() {
      if (draftParam) {
        const routeKey = `draft:${draftParam}`;
        setRestoringDraft(true);
        const localDraft = await loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
        const draftHydrationAction = resolveSeleccionDraftHydration({
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
          if (!cancelled) {
            if (invisibleDraftPilotEnabled) {
              setDraftAlias("seleccion", localDraftSessionId, draftParam);
            }
            applyFormState(
              draftSource.draft.data,
              draftSource.empresa,
              draftSource.draft.step,
              "explicit_restore",
              routeKey
            );
            markRouteHydrated(routeKey);
            setRestoringDraft(false);
            normalizeDraftBootstrapToSessionRoute();
          }
          return;
        }

        if (
          draftSource.action === "restore_prefetched" &&
          !invisibleDraftPilotEnabled
        ) {
          applyFormState(
            draftSource.draft.data,
            draftSource.empresa,
            draftSource.draft.step,
            "explicit_restore",
            routeKey
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

        applyFormState(
          result.draft.data,
          result.empresa,
          result.draft.step,
          "explicit_restore",
          routeKey
        );
        if (invisibleDraftPilotEnabled) {
          setDraftAlias("seleccion", localDraftSessionId, result.draft.id);
        }
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        normalizeDraftBootstrapToSessionRoute();
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      const sessionId = sessionParam?.trim() || localDraftSessionId;
      const routeKey = buildSeleccionSessionRouteKey(sessionId, explicitNewDraft);

      if (!empresa && !hasSessionParam) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      if (!hasSessionParam) {
        router.replace(buildFormEditorUrl("seleccion", { sessionId }), {
          scroll: false,
        });
      }

      const persistedDraftId = bootstrapDraftId;
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
      const sessionHydrationAction = resolveSeleccionSessionHydration({
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
          applyFormState(
            localDraft.data,
            localEmpresa,
            localDraft.step,
            "silent_restore",
            routeKey
          );
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

        applyFormState(
          result.draft.data,
          result.empresa,
          result.draft.step,
          "silent_restore",
          routeKey
        );
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (!empresa) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      applyFormState(
        getDefaultSeleccionValues(empresa),
        empresa,
        0,
        "new_form",
        routeKey
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
    bootstrapDraftId,
    draftParam,
    empresa,
    explicitNewDraft,
    initialDraftResolution,
    invisibleDraftPilotEnabled,
    beginRouteHydration,
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
    setActiveSectionId,
    setRestoringDraft,
    finalizedSuccess,
  ]);

  useEffect(() => {
    if (restoringDraft) {
      return;
    }

    persistCurrentViewState();
  }, [activeSectionId, collapsedSections, persistCurrentViewState, restoringDraft]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handlePersistCurrentViewState() {
      persistCurrentViewState();
    }

    window.addEventListener("pagehide", handlePersistCurrentViewState);
    document.addEventListener("visibilitychange", handlePersistCurrentViewState);

    return () => {
      window.removeEventListener("pagehide", handlePersistCurrentViewState);
      document.removeEventListener("visibilitychange", handlePersistCurrentViewState);
    };
  }, [persistCurrentViewState]);

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
    let timeoutId: number | null = null;

    const subscription = watch((_, { name }) => {
      if (
        !name ||
        (!name.startsWith("oferentes.") && !name.startsWith("asistentes."))
      ) {
        return;
      }

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        startTransition(() => {
          setRepeatedSectionSnapshot({
            oferentes: getValues("oferentes"),
            asistentes: getValues("asistentes"),
          });
        });
      }, 120);
    });

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      subscription.unsubscribe();
    };
  }, [getValues, watch]);

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
        "seleccion",
        "session_to_draft_promotion"
      )
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("seleccion", {
        draftId: activeDraftId,
      }),
      { scroll: false }
    );
  }, [
    activeDraftId,
    draftLifecycleSuspended,
    draftParam,
    isBootstrappingForm,
    invisibleDraftPilotEnabled,
    markRouteHydrated,
    reportInvisibleDraftSuppression,
    restoringDraft,
    router,
    sessionParam,
    finalizedSuccess,
  ]);

  useEffect(() => {
    if (activeSectionId === "company") return;

    const nextStep = getSeleccionCompatStepForSection(activeSectionId);
    if (nextStep !== step) {
      setStep(nextStep);
    }
  }, [activeSectionId, step]);

  const handleSelectEmpresa = useCallback(
    (nextEmpresa: Empresa) => {
      const nextSessionId = sessionParam?.trim() || startNewDraftSession();
      const nextRoute = buildFormEditorUrl("seleccion", {
        sessionId: nextSessionId,
        isNewDraft: explicitNewDraft,
      });

      setEmpresa(nextEmpresa);
      const nextValues = getDefaultSeleccionValues(nextEmpresa);
      reset(nextValues);
      setRepeatedSectionSnapshot({
        oferentes: nextValues.oferentes,
        asistentes: nextValues.asistentes,
      });
      setStep(0);
      setActiveSectionId("activity");
      setCollapsedSections(INITIAL_SELECCION_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setFinalizedSuccess(null);
      setServerError(null);
      resetFinalizationProgress();
      markRouteHydrated(
        buildSeleccionSessionRouteKey(nextSessionId, explicitNewDraft)
      );
      router.replace(nextRoute, { scroll: false });
      window.setTimeout(() => {
        scrollToSection("activity");
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

  function handleSectionSelect(sectionId: SeleccionSectionId) {
    if (sectionId !== "company" && !hasEmpresa) {
      return;
    }

    selectSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) {
      return false;
    }

    const nextValues = normalizeSeleccionValues(getValues(), empresa);
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
          "seleccion",
          "save_draft_redirect"
        )
      ) {
        return true;
      }

      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("seleccion", {
          draftId: result.draftId,
        }),
        { scroll: false }
      );
    }

    return true;
  }

  function handleFillTestData() {
    if (!isDocumentEditable) {
      return;
    }

    const nextValues = buildSeleccionManualTestValues(empresa, getValues());
    reset(nextValues);
    setRepeatedSectionSnapshot({
      oferentes: nextValues.oferentes,
      asistentes: nextValues.asistentes,
    });
    setServerError(null);
    void autosave(step, nextValues as Record<string, unknown>);
  }

  function handlePrepareSubmit(data: SeleccionValues) {
    if (!isDocumentEditable) {
      return;
    }

    const normalizedData: SeleccionValues = {
      ...normalizeSeleccionValues(data, empresa),
      asistentes: normalizePersistedAsistentesForMode(data.asistentes, {
        mode: "reca_plus_generic_attendees",
        profesionalAsignado: empresa?.profesional_asignado,
      }),
    };

    setServerError(null);
    resetFinalizationProgress();
    setPendingSubmitValues(normalizedData);
    setSubmitConfirmOpen(true);
  }

  async function confirmSubmit(
    retryAction: LongFormFinalizationRetryAction = "submit"
  ) {
    if (!isDocumentEditable) {
      return;
    }

    if (!pendingSubmitValues || !empresa) {
      clearFinalizationUiLock("seleccion");
      resumeDraftLifecycle();
      setSubmitConfirmOpen(false);
      resetFinalizationProgress();
      return;
    }

    beginFinalizationUiLock("seleccion");
    suspendDraftLifecycle();
    setServerError(null);
    setIsFinalizing(true);
    setFinalizationProgress({
      phase: "processing",
      currentStageId:
        retryAction === "check_status" ? "esperando_respuesta" : "validando",
      startedAt: Date.now(),
      displayMessage: null,
      errorMessage: null,
      retryAction,
    });

    try {
      const meaningfulAsistentes = getMeaningfulAsistentes(
        pendingSubmitValues.asistentes
      );
      const finalizationIdentity = {
        local_draft_session_id: localDraftSessionId,
        ...(activeDraftId ? { draft_id: activeDraftId } : {}),
      };
      const requestHash = buildSeleccionRequestHash({
        ...pendingSubmitValues,
        asistentes: meaningfulAsistentes,
      });
      let responsePayload: { sheetLink: string; pdfLink?: string };

      if (retryAction === "submit") {
        updateFinalizationStage("preparando_envio");
        updateFinalizationStage("enviando_al_servidor");
        const responsePromise = fetch("/api/formularios/seleccion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresa,
            formData: {
              ...pendingSubmitValues,
              asistentes: meaningfulAsistentes,
            },
            finalization_identity: finalizationIdentity,
          }),
        });
        updateFinalizationStage("esperando_respuesta");
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "seleccion",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
          responsePromise,
        });
      } else {
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "seleccion",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
        });
      }

      updateFinalizationStage("cerrando_borrador_local");
      setFinalizedSuccess({
        companyName: empresa.nombre_empresa,
        links: {
          sheetLink: responsePayload.sheetLink,
          pdfLink: responsePayload.pdfLink,
        },
      });
      clearFinalizationUiLock("seleccion");
      clearLongFormViewState({
        slug: "seleccion",
        routeKey: currentRouteKey,
      });
      restoreLongFormScroll({ scrollY: 0 });
      try {
        await clearDraftAfterSuccess();
      } catch (cleanupError) {
        console.error(
          "[seleccion.finalization_cleanup] failed (non-fatal)",
          cleanupError
        );
      }
      setFinalizationProgress((current) => ({
        ...current,
        phase: "completed",
        retryAction: "submit",
      }));
      setSubmitConfirmOpen(false);
      setPendingSubmitValues(null);
      setServerError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al guardar el formulario.";
      const isConfirmationError = error instanceof FinalizationConfirmationError;
      markFinalizationError(
        isConfirmationError ? error.detailMessage ?? errorMessage : errorMessage,
        isConfirmationError ? error.retryAction : retryAction,
        {
          displayMessage: isConfirmationError ? error.displayMessage : null,
          detailMessage: isConfirmationError ? error.detailMessage : errorMessage,
        }
      );
    } finally {
      setIsFinalizing(false);
    }
  }

  function onInvalid(nextErrors: FieldErrors<SeleccionValues>) {
    const validationTarget = getSeleccionValidationTarget(nextErrors);
    resetFinalizationProgress();
    navigateToValidationTarget(validationTarget);

    if (!validationTarget || !isDocumentEditable || !empresa) {
      return;
    }

    const nextValues = normalizeSeleccionValues(getValues(), empresa);

    checkpointInvalidSubmission({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          getSeleccionCompatStepForSection(
            validationTarget.sectionId === "company"
              ? "activity"
              : validationTarget.sectionId
          ),
          nextValues as Record<string, unknown>,
          "interval"
        ),
      onPromoteDraft: (nextDraftId) => {
        if (invisibleDraftPilotEnabled) {
          reportInvisibleDraftSuppression(
            "invalid_submission_promotion",
            "session"
          );
          return;
        }

        if (
          shouldSuppressDraftNavigationWhileFinalizing(
            "seleccion",
            "invalid_submission_promotion"
          )
        ) {
          return;
        }

        markRouteHydrated(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("seleccion", {
            draftId: nextDraftId,
          }),
          { scroll: false }
        );
      },
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
    clearLongFormViewState({
      slug: "seleccion",
      routeKey: currentRouteKey,
    });
    startNewDraftSession();
    clearEmpresa();
    appliedAssignedCargoKeyRef.current = null;
    setIsBootstrappingForm(true);
    setFinalizedSuccess(null);
    clearFinalizationUiLock("seleccion");
    resumeDraftLifecycle();
    setServerError(null);
    resetFinalizationProgress();
    const nextValues = getDefaultSeleccionValues(null);
    reset(nextValues);
    setRepeatedSectionSnapshot({
      oferentes: nextValues.oferentes,
      asistentes: nextValues.asistentes,
    });
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_SELECCION_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("seleccion", { isNewDraft: true }));
  }

  if (finalizedSuccess) {
    return {
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: (
          <>
            La seleccion para{" "}
            <span className="font-semibold text-gray-700">
              {finalizedSuccess.companyName}
            </span>{" "}
            fue registrada correctamente.
          </>
        ),
        links: finalizedSuccess.links,
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
        title: "Seleccion Incluyente",
        companyName: empresa?.nombre_empresa,
        onBack: handleReturnToHub,
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as SeleccionSectionId),
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
      sections: {
        company: {
          empresa,
          fechaVisita,
          modalidad,
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
        activity: {
          isDocumentEditable,
          value: desarrolloActividad,
          register,
          errors,
          getValues,
          setValue,
          collapsed: collapsedSections.activity,
          status: sectionStatuses.activity,
          sectionRef: activityRef,
          onToggle: () => toggleSection("activity"),
          onFocusCapture: () => setActiveSectionId("activity"),
        },
        oferentes: {
          isDocumentEditable,
          control,
          register,
          setValue,
          errors,
          collapsed: collapsedSections.oferentes,
          status: sectionStatuses.oferentes,
          sectionRef: oferentesRef,
          onToggle: () => toggleSection("oferentes"),
          onFocusCapture: () => setActiveSectionId("oferentes"),
        },
        recommendations: {
          isDocumentEditable,
          value: ajustesRecomendaciones,
          notaValue: nota,
          oferentes: repeatedSectionSnapshot.oferentes,
          register,
          errors,
          getValues,
          setValue,
          collapsed: collapsedSections.recommendations,
          status: sectionStatuses.recommendations,
          sectionRef: recommendationsRef,
          onToggle: () => toggleSection("recommendations"),
          onFocusCapture: () => setActiveSectionId("recommendations"),
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
          "Esta accion publicara el acta en Google Sheets y generara el PDF final. Confirma solo cuando hayas revisado toda la informacion.",
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
        onCancel: () => {
          if (isFinalizing) {
            return;
          }

          clearFinalizationUiLock("seleccion");
          resumeDraftLifecycle();
          setSubmitConfirmOpen(false);
          setPendingSubmitValues(null);
          if (finalizationProgress.phase !== "error") {
            resetFinalizationProgress();
          }
        },
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
