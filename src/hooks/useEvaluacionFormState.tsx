"use client";

import type { ComponentProps, RefObject } from "react";
import { createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { EvaluacionFormPresenterProps } from "@/components/forms/evaluacion/EvaluacionFormPresenter";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";
import {
  LongFormDraftErrorState,
  LongFormFinalizeButton,
  LongFormTestFillButton,
} from "@/components/forms/shared/LongFormShell";
import type { LongFormSectionStatus } from "@/components/forms/shared/LongFormSectionCard";
import type { LongFormSectionNavItem } from "@/components/forms/shared/LongFormSectionNav";
import { useInvisibleDraftTelemetry } from "@/hooks/useInvisibleDraftTelemetry";
import { useGooglePrewarm } from "@/hooks/useGooglePrewarm";
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";
import { useLongFormDraftController } from "@/hooks/useLongFormDraftController";
import { useLongFormSections } from "@/hooks/useLongFormSections";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { returnToHubTab } from "@/lib/actaTabs";
import {
  getMeaningfulAsistentes,
  normalizePersistedAsistentesForMode,
} from "@/lib/asistentes";
import {
  normalizeInvisibleDraftRouteParams,
  setDraftAlias,
} from "@/lib/drafts";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
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
import { buildEvaluacionRequestHash } from "@/lib/finalization/idempotency";
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
  type LongFormFinalizationProgress,
  type LongFormFinalizationRetryAction,
} from "@/lib/longFormFinalization";
import {
  calculateEvaluacionAccessibilitySummary,
  createEmptyEvaluacionValues,
  deriveEvaluacionSection4Description,
  deriveEvaluacionSection5ItemValue,
  normalizeEvaluacionValues,
  resolveEvaluacionSection4LevelSync,
} from "@/lib/evaluacion";
import { shouldShowEvaluacionLoadingState } from "@/lib/evaluacionLoadingState";
import {
  buildEvaluacionSessionRouteKey,
  resolveEvaluacionDraftHydration,
  resolveEvaluacionSessionHydration,
} from "@/lib/evaluacionHydration";
import {
  EVALUACION_QUESTION_SECTION_IDS,
  EVALUACION_NAV_ITEMS,
  EVALUACION_SECTION_5_ITEMS,
  EVALUACION_SECTION_LABELS,
  EVALUACION_SECTION_ORDER,
  areEvaluacionQuestionSectionsComplete,
  getEvaluacionCompatStepForSection,
  getEvaluacionSectionIdForStep,
  INITIAL_EVALUACION_COLLAPSED_SECTIONS,
  isEvaluacionAttendeesSectionComplete,
  isEvaluacionCompanySectionComplete,
  isEvaluacionNarrativeSectionComplete,
  isEvaluacionQuestionSectionComplete,
  isEvaluacionSection4Complete,
  isEvaluacionSection5Complete,
  type EvaluacionQuestionSectionId,
  type EvaluacionSectionId,
} from "@/lib/evaluacionSections";
import { getEvaluacionValidationTarget } from "@/lib/evaluacionValidationNavigation";
import {
  buildEvaluacionManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  evaluacionSchema,
  type EvaluacionQuestionSectionValues,
  type EvaluacionValues,
} from "@/lib/validations/evaluacion";

type LoadingState = { mode: "loading" };
type DraftErrorState = {
  mode: "draft_error";
  draftErrorState: ComponentProps<typeof LongFormDraftErrorState>;
};
type SuccessState = {
  mode: "success";
  successState: {
    title: string;
    message: React.ReactNode;
    links: LongFormFinalizedSuccess["links"];
    onReturnToHub: () => void;
    onStartNewForm: () => void;
  };
};
type EditingState = {
  mode: "editing";
  presenterProps: EvaluacionFormPresenterProps;
};

export type EvaluacionFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

type UseEvaluacionFormStateOptions = {
  initialDraftResolution?: InitialDraftResolution;
};

const FIRST_EDITABLE_SECTION_ID = "section_2_1";
const FIRST_EDITABLE_STEP = getEvaluacionCompatStepForSection(
  FIRST_EDITABLE_SECTION_ID
);

function buildSectionStatus(
  activeSectionId: EvaluacionSectionId,
  errorSectionId: EvaluacionSectionId | null,
  sectionId: EvaluacionSectionId,
  options?: { completed?: boolean; disabled?: boolean }
): LongFormSectionStatus {
  if (activeSectionId === sectionId) return "active";
  if (options?.disabled) return "disabled";
  if (errorSectionId === sectionId) return "error";
  if (options?.completed) return "completed";
  return "idle";
}

function buildPersistedEvaluacionValues(
  values: Partial<EvaluacionValues> | Record<string, unknown>,
  empresa: Empresa | null
) {
  const normalizedValues = normalizeEvaluacionValues(values, empresa);
  return {
    ...normalizedValues,
    asistentes: normalizePersistedAsistentesForMode(normalizedValues.asistentes, {
      mode: "reca_plus_agency_advisor",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function useEvaluacionFormState({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: UseEvaluacionFormStateOptions = {}): EvaluacionFormState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const hasEmpresa = Boolean(empresa);
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
  const invisibleDraftPilotEnabled = isInvisibleDraftPilotEnabled("evaluacion");
  const bootstrapDraftId = useMemo(
    () =>
      resolveInvisibleDraftBootstrapId({
        formSlug: "evaluacion",
        draftParam,
        sessionParam,
      }),
    [draftParam, sessionParam]
  );
  // Keep `company` aligned with the rest of the long forms: a new session starts at step 0,
  // and the first editable content block remains section 2.1 only after company selection.
  const [step, setStep] = useState(0);
  const [finalizedSuccess, setFinalizedSuccess] =
    useState<LongFormFinalizedSuccess | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] =
    useState<EvaluacionValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] =
    useState<LongFormFinalizationProgress>(
      getInitialLongFormFinalizationProgress
    );
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const appliedAssignedCargoKeyRef = useRef<string | null>(null);
  const previousSection4SuggestionRef = useRef<
    ReturnType<typeof calculateEvaluacionAccessibilitySummary>["suggestion"]
  >("");
  const finalizationFeedbackRef = useRef<HTMLDivElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();

  const draftController = useLongFormDraftController({
    slug: "evaluacion",
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
    isRouteHydrated,
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

  const emptyValues = useMemo(
    () => createEmptyEvaluacionValues(empresa),
    [empresa]
  );

  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EvaluacionValues>({
    resolver: zodResolver(
      evaluacionSchema as never
    ) as unknown as Resolver<EvaluacionValues>,
    defaultValues: emptyValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [fechaVisita = "", modalidad = "", nitEmpresa = ""] = useWatch({
    control,
    name: ["fecha_visita", "modalidad", "nit_empresa"],
  }) as [
    EvaluacionValues["fecha_visita"] | undefined,
    EvaluacionValues["modalidad"] | undefined,
    EvaluacionValues["nit_empresa"] | undefined,
  ];

  const [
    section21,
    section22,
    section23,
    section24,
    section25,
    section26,
    section3,
    section4Values = { nivel_accesibilidad: "", descripcion: "" },
    section5Values = emptyValues.section_5,
  ] = useWatch({
    control,
    name: [...EVALUACION_QUESTION_SECTION_IDS, "section_4", "section_5"],
  }) as [
    EvaluacionValues["section_2_1"] | undefined,
    EvaluacionValues["section_2_2"] | undefined,
    EvaluacionValues["section_2_3"] | undefined,
    EvaluacionValues["section_2_4"] | undefined,
    EvaluacionValues["section_2_5"] | undefined,
    EvaluacionValues["section_2_6"] | undefined,
    EvaluacionValues["section_3"] | undefined,
    EvaluacionValues["section_4"] | undefined,
    EvaluacionValues["section_5"] | undefined,
  ];

  const [
    observacionesGenerales = "",
    cargosCompatibles = "",
    asistentes = [],
  ] = useWatch({
    control,
    name: ["observaciones_generales", "cargos_compatibles", "asistentes"],
  }) as [
    EvaluacionValues["observaciones_generales"] | undefined,
    EvaluacionValues["cargos_compatibles"] | undefined,
    EvaluacionValues["asistentes"] | undefined,
  ];

  const questionSectionValues = useMemo(
    () =>
      ({
        section_2_1: section21 ?? emptyValues.section_2_1,
        section_2_2: section22 ?? emptyValues.section_2_2,
        section_2_3: section23 ?? emptyValues.section_2_3,
        section_2_4: section24 ?? emptyValues.section_2_4,
        section_2_5: section25 ?? emptyValues.section_2_5,
        section_2_6: section26 ?? emptyValues.section_2_6,
        section_3: section3 ?? emptyValues.section_3,
      }) satisfies Record<EvaluacionQuestionSectionId, EvaluacionQuestionSectionValues>,
    [
      emptyValues,
      section21,
      section22,
      section23,
      section24,
      section25,
      section26,
      section3,
    ]
  );

  const accessibilitySummary = useMemo(
    () => calculateEvaluacionAccessibilitySummary(questionSectionValues),
    [questionSectionValues]
  );
  const questionSectionsComplete = useMemo(
    () => areEvaluacionQuestionSectionsComplete(questionSectionValues),
    [questionSectionValues]
  );
  const formTabLabel = getFormTabLabel("evaluacion");
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const showTestFillAction = isManualTestFillEnabled();
  const showTakeoverPrompt = isReadonlyDraft;
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
    formSlug: "evaluacion",
    empresa,
    formData: { asistentes },
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
    formSlug: "evaluacion",
    draftParam,
    activeDraftId,
    editingAuthorityState,
    lockConflict,
    invisibleDraftPilotEnabled,
    showTakeoverPrompt,
  });

  const sectionRefs = useMemo(
    () =>
      Object.fromEntries(
        EVALUACION_SECTION_ORDER.map((sectionId) => [
          sectionId,
          createRef<HTMLElement>(),
        ])
      ) as Record<EvaluacionSectionId, RefObject<HTMLElement | null>>,
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
  } = useLongFormSections<EvaluacionSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_EVALUACION_COLLAPSED_SECTIONS,
    sectionRefs,
  });
  const activeSectionIdRef = useRef<EvaluacionSectionId>("company");
  const collapsedSectionsRef = useRef(INITIAL_EVALUACION_COLLAPSED_SECTIONS);

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
    return buildEvaluacionSessionRouteKey(sessionId, explicitNewDraft);
  }, [draftParam, explicitNewDraft, localDraftSessionId, sessionParam]);
  const currentRouteHydrated = useMemo(
    () => (currentRouteKey ? isRouteHydrated(currentRouteKey) : false),
    [currentRouteKey, isRouteHydrated]
  );

  const persistCurrentViewState = useCallback(
    (routeKey = currentRouteKey) => {
      if (!routeKey || typeof window === "undefined") {
        return;
      }

      saveLongFormViewState({
        slug: "evaluacion",
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

  const normalizeDraftBootstrapToSessionRoute = useCallback(() => {
    if (
      !invisibleDraftPilotEnabled ||
      !draftParam ||
      !localDraftSessionId.trim()
    ) {
      return;
    }

    router.replace(
      buildFormEditorUrl("evaluacion", {
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
    (validationTarget: ReturnType<typeof getEvaluacionValidationTarget>) => {
      if (!validationTarget) {
        setServerError("Revisa los campos resaltados antes de finalizar.");
        return;
      }

      setCollapsedSections((current) => ({
        ...current,
        [validationTarget.sectionId]: false,
      }));
      setServerError("Revisa los campos resaltados antes de finalizar.");
      setActiveSectionId(validationTarget.sectionId);
      scrollToSection(validationTarget.sectionId);
      focusFieldByNameAfterPaint(
        validationTarget.fieldName,
        { scroll: true, behavior: "smooth", block: "center" },
        4
      );
    },
    [scrollToSection, setActiveSectionId, setCollapsedSections]
  );

  const resetFinalizationProgress = useCallback(() => {
    setFinalizationProgress(getInitialLongFormFinalizationProgress());
  }, []);

  const updateFinalizationStage = useCallback(
    (stageId: LongFormFinalizationProgress["currentStageId"]) => {
      if (!stageId) return;
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
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const element = finalizationFeedbackRef.current;
      if (!element) return;
      element.scrollIntoView({ block: "center", behavior: "smooth" });
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

  const applyFormState = useCallback(
    (
      valuesToRestore: Partial<EvaluacionValues> | Record<string, unknown>,
      nextEmpresa: Empresa,
      nextStep: number,
      intent: LongFormHydrationIntent,
      routeKey: string
    ) => {
      const normalizedValues = normalizeEvaluacionValues(valuesToRestore, nextEmpresa);
      const nextSectionId = getEvaluacionSectionIdForStep(nextStep);
      const storedViewState = loadLongFormViewState<EvaluacionSectionId>({
        slug: "evaluacion",
        routeKey,
      });
      const currentViewState: LongFormStoredViewState<EvaluacionSectionId> = {
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
      previousSection4SuggestionRef.current = "";
      setIsBootstrappingForm(true);
      setEmpresa(nextEmpresa);
      reset(normalizedValues);
      setStep(nextStep);
      setActiveSectionId(restoredViewState?.activeSectionId ?? nextSectionId);
      setCollapsedSections(
        restoredViewState?.collapsedSections ?? INITIAL_EVALUACION_COLLAPSED_SECTIONS
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
        sectionElement:
          sectionRefs[restoredViewState?.activeSectionId ?? nextSectionId].current,
      });
    },
    [
      reset,
      resetFinalizationProgress,
      resumeDraftLifecycle,
      sectionRefs,
      setCollapsedSections,
      setEmpresa,
      setActiveSectionId,
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
    const nextLevel = resolveEvaluacionSection4LevelSync({
      currentLevel: section4Values.nivel_accesibilidad,
      previousSuggestion: previousSection4SuggestionRef.current,
      nextSuggestion: accessibilitySummary.suggestion,
    });

    if (nextLevel !== section4Values.nivel_accesibilidad) {
      setValue("section_4.nivel_accesibilidad", nextLevel, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }

    previousSection4SuggestionRef.current = accessibilitySummary.suggestion;
  }, [
    accessibilitySummary.suggestion,
    section4Values.nivel_accesibilidad,
    setValue,
  ]);

  useEffect(() => {
    const nextDescription = deriveEvaluacionSection4Description(
      section4Values.nivel_accesibilidad
    );
    if (nextDescription === section4Values.descripcion) return;
    setValue("section_4.descripcion", nextDescription, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [
    section4Values.descripcion,
    section4Values.nivel_accesibilidad,
    setValue,
  ]);

  useEffect(() => {
    EVALUACION_SECTION_5_ITEMS.forEach((item) => {
      const currentItem = section5Values?.[item.id];
      if (!currentItem) return;
      const nextItem = deriveEvaluacionSection5ItemValue(item.id, currentItem.aplica);

      if (currentItem.nota !== nextItem.nota) {
        setValue(`section_5.${item.id}.nota`, nextItem.nota, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }

      if (currentItem.ajustes !== nextItem.ajustes) {
        setValue(`section_5.${item.id}.ajustes`, nextItem.ajustes, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }
    });
  }, [section5Values, setValue]);

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
        const draftHydrationAction = resolveEvaluacionDraftHydration({
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

        if (draftSource.action === "restore_local") {
          if (cancelled) return;
          if (invisibleDraftPilotEnabled) {
            setDraftAlias("evaluacion", localDraftSessionId, draftParam);
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
          setDraftAlias("evaluacion", localDraftSessionId, result.draft.id);
        }
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        normalizeDraftBootstrapToSessionRoute();
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      const sessionId = sessionParam?.trim() || localDraftSessionId;
      const routeKey = buildEvaluacionSessionRouteKey(sessionId, explicitNewDraft);

      if (!empresa && !hasSessionParam) {
        setRestoringDraft(false);
        setStep(0);
        setActiveSectionId("company");
        return;
      }

      if (!hasSessionParam) {
        router.replace(buildFormEditorUrl("evaluacion", { sessionId }), {
          scroll: false,
        });
      }

      const persistedDraftId = bootstrapDraftId;
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
      const sessionHydrationAction = resolveEvaluacionSessionHydration({
        hasEmpresa: Boolean(empresa),
        persistedDraftId,
        hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        isRouteHydrated: isRouteHydrated(routeKey),
      });

      if (sessionHydrationAction === "show_company") {
        setRestoringDraft(false);
        setStep(0);
        setActiveSectionId("company");
        return;
      }

      if (sessionHydrationAction === "skip") {
        setRestoringDraft(false);
        return;
      }

      if (sessionHydrationAction === "restore_local" && localDraft && localEmpresa) {
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

      if (sessionHydrationAction === "load_promoted_remote" && persistedDraftId) {
        reportInvisibleDraftSuppression("route_hydration_redirect", "session");
        const result = await loadDraft(persistedDraftId);
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
          "silent_restore",
          routeKey
        );
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (!empresa) {
        setRestoringDraft(false);
        setStep(0);
        setActiveSectionId("company");
        return;
      }

      applyFormState(
        createEmptyEvaluacionValues(empresa),
        empresa,
        FIRST_EDITABLE_STEP,
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
    setActiveSectionId,
    setRestoringDraft,
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
        "evaluacion",
        "session_to_draft_promotion"
      )
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    persistCurrentViewState(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("evaluacion", {
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
    persistCurrentViewState,
    reportInvisibleDraftSuppression,
    restoringDraft,
    router,
    sessionParam,
  ]);

  useEffect(() => {
    if (activeSectionId === "company") return;
    const nextStep = getEvaluacionCompatStepForSection(activeSectionId);
    if (nextStep !== step) {
      setStep(nextStep);
    }
  }, [activeSectionId, step]);

  const handleSelectEmpresa = useCallback(
    (nextEmpresa: Empresa) => {
      const nextSessionId = sessionParam?.trim() || startNewDraftSession();
      const nextRoute = buildFormEditorUrl("evaluacion", {
        sessionId: nextSessionId,
        isNewDraft: explicitNewDraft,
      });

      setEmpresa(nextEmpresa);
      previousSection4SuggestionRef.current = "";
      reset(createEmptyEvaluacionValues(nextEmpresa));
      setStep(FIRST_EDITABLE_STEP);
      setActiveSectionId(FIRST_EDITABLE_SECTION_ID);
      setCollapsedSections(INITIAL_EVALUACION_COLLAPSED_SECTIONS);
      setFinalizedSuccess(null);
      resumeDraftLifecycle();
      setServerError(null);
      resetFinalizationProgress();
      markRouteHydrated(
        buildEvaluacionSessionRouteKey(nextSessionId, explicitNewDraft)
      );
      router.replace(nextRoute, { scroll: false });
      window.setTimeout(() => {
        scrollToSection(FIRST_EDITABLE_SECTION_ID);
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

  function handleSectionSelect(sectionId: EvaluacionSectionId) {
    if (sectionId !== "company" && !hasEmpresa) return;
    selectSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) return false;
    const nextValues = buildPersistedEvaluacionValues(getValues(), empresa);
    reset(nextValues);
    const result = await saveDraft(step, nextValues as Record<string, unknown>);
    if (!result.ok) {
      setServerError(
        result.error ?? "No se pudo guardar el borrador. Intenta de nuevo."
      );
      return false;
    }

    setServerError(null);
    if (finalizedSuccess) return true;
    if (result.draftId && draftParam !== result.draftId) {
      if (invisibleDraftPilotEnabled) {
        reportInvisibleDraftSuppression("save_draft_redirect", "session");
        return true;
      }

      if (
        shouldSuppressDraftNavigationWhileFinalizing(
          "evaluacion",
          "save_draft_redirect"
        )
      ) {
        return true;
      }

      markRouteHydrated(`draft:${result.draftId}`);
      persistCurrentViewState(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("evaluacion", {
          draftId: result.draftId,
        }),
        { scroll: false }
      );
    }

    return true;
  }

  function handlePrepareSubmit(data: EvaluacionValues) {
    if (!isDocumentEditable) return;
    setServerError(null);
    resetFinalizationProgress();
    setPendingSubmitValues(buildPersistedEvaluacionValues(data, empresa));
    setSubmitConfirmOpen(true);
  }

  async function confirmSubmit(
    retryAction: LongFormFinalizationRetryAction = "submit"
  ) {
    if (!isDocumentEditable) return;

    if (!pendingSubmitValues || !empresa) {
      clearFinalizationUiLock("evaluacion");
      resumeDraftLifecycle();
      setSubmitConfirmOpen(false);
      resetFinalizationProgress();
      return;
    }

    beginFinalizationUiLock("evaluacion");
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
      const requestHash = buildEvaluacionRequestHash({
        ...pendingSubmitValues,
        asistentes: meaningfulAsistentes,
      });
      let responsePayload: { sheetLink: string; pdfLink?: string };

      if (retryAction === "submit") {
        updateFinalizationStage("preparando_envio");
        const requestBody = JSON.stringify({
          empresa,
          formData: {
            ...pendingSubmitValues,
            asistentes: meaningfulAsistentes,
          },
          finalization_identity: finalizationIdentity,
        });
        updateFinalizationStage("enviando_al_servidor");
        const responsePromise = fetch("/api/formularios/evaluacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        updateFinalizationStage("esperando_respuesta");
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "evaluacion",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
          responsePromise,
        });
      } else {
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "evaluacion",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
        });
      }

      updateFinalizationStage("cerrando_borrador_local");
      setFinalizedSuccess({
        companyName: empresa.nombre_empresa,
        links: { sheetLink: responsePayload.sheetLink },
      });
      clearFinalizationUiLock("evaluacion");
      setFinalizationProgress((current) => ({
        ...current,
        phase: "completed",
        retryAction: "submit",
      }));
      setSubmitConfirmOpen(false);
      setPendingSubmitValues(null);
      setServerError(null);
      try {
        await clearDraftAfterSuccess();
      } catch (cleanupError) {
        console.error(
          "[evaluacion.finalization_cleanup] failed (non-fatal)",
          cleanupError
        );
      }
      window.scrollTo({ top: 0, behavior: "auto" });
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

  function onInvalid(nextErrors: FieldErrors<EvaluacionValues>) {
    const validationTarget = getEvaluacionValidationTarget(nextErrors);
    resetFinalizationProgress();
    navigateToValidationTarget(validationTarget);
    if (!validationTarget || !isDocumentEditable || !empresa) return;

    const nextValues = buildPersistedEvaluacionValues(getValues(), empresa);
    const checkpointStep =
      validationTarget.sectionId === "company"
        ? step
        : getEvaluacionCompatStepForSection(validationTarget.sectionId);

    checkpointInvalidSubmission({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          checkpointStep,
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
            "evaluacion",
            "invalid_submission_promotion"
          )
        ) {
          return;
        }

        markRouteHydrated(`draft:${nextDraftId}`);
        persistCurrentViewState(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("evaluacion", {
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
      slug: "evaluacion",
      routeKey: currentRouteKey,
    });
    startNewDraftSession();
    clearEmpresa();
    appliedAssignedCargoKeyRef.current = null;
    previousSection4SuggestionRef.current = "";
    setIsBootstrappingForm(true);
    setFinalizedSuccess(null);
    setSubmitConfirmOpen(false);
    setPendingSubmitValues(null);
    clearFinalizationUiLock("evaluacion");
    resumeDraftLifecycle();
    setServerError(null);
    resetFinalizationProgress();
    reset(createEmptyEvaluacionValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_EVALUACION_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("evaluacion", { isNewDraft: true }));
  }

  function handleFillTestData() {
    if (!isDocumentEditable) {
      return;
    }

    const nextValues = buildEvaluacionManualTestValues(empresa);
    reset(nextValues);
    setServerError(null);
    void autosave(step, nextValues as Record<string, unknown>);
  }

  const sectionStatuses = useMemo<
    Record<EvaluacionSectionId, LongFormSectionStatus>
  >(() => {
    const errorSectionId =
      getEvaluacionValidationTarget(errors)?.sectionId ?? null;
    const questionSectionStatuses = Object.fromEntries(
      EVALUACION_QUESTION_SECTION_IDS.map((sectionId) => [
        sectionId,
        buildSectionStatus(activeSectionId, errorSectionId, sectionId, {
          completed:
            hasEmpresa &&
            isEvaluacionQuestionSectionComplete(
              sectionId,
              questionSectionValues[sectionId]
            ),
          disabled: !hasEmpresa,
        }),
      ])
    ) as Record<EvaluacionQuestionSectionId, LongFormSectionStatus>;

    return {
      company: buildSectionStatus(activeSectionId, errorSectionId, "company", {
        completed: isEvaluacionCompanySectionComplete({
          hasEmpresa,
          fecha_visita: fechaVisita,
          modalidad,
          nit_empresa: nitEmpresa,
        }),
      }),
      ...questionSectionStatuses,
      section_4: buildSectionStatus(activeSectionId, errorSectionId, "section_4", {
        completed:
          hasEmpresa &&
          isEvaluacionSection4Complete({
            nivel_accesibilidad: section4Values.nivel_accesibilidad,
            descripcion: section4Values.descripcion,
            questionSectionsComplete,
          }),
        disabled: !hasEmpresa,
      }),
      section_5: buildSectionStatus(activeSectionId, errorSectionId, "section_5", {
        completed: hasEmpresa && isEvaluacionSection5Complete(section5Values),
        disabled: !hasEmpresa,
      }),
      section_6: buildSectionStatus(activeSectionId, errorSectionId, "section_6", {
        completed:
          hasEmpresa &&
          isEvaluacionNarrativeSectionComplete({
            value: observacionesGenerales,
            required: false,
          }),
        disabled: !hasEmpresa,
      }),
      section_7: buildSectionStatus(activeSectionId, errorSectionId, "section_7", {
        completed:
          hasEmpresa &&
          isEvaluacionNarrativeSectionComplete({
            value: cargosCompatibles,
          }),
        disabled: !hasEmpresa,
      }),
      section_8: buildSectionStatus(activeSectionId, errorSectionId, "section_8", {
        completed:
          hasEmpresa &&
          isEvaluacionAttendeesSectionComplete({ asistentes }),
        disabled: !hasEmpresa,
      }),
    };
  }, [
    activeSectionId,
    asistentes,
    cargosCompatibles,
    errors,
    fechaVisita,
    hasEmpresa,
    modalidad,
    nitEmpresa,
    observacionesGenerales,
    questionSectionValues,
    questionSectionsComplete,
    section4Values.descripcion,
    section4Values.nivel_accesibilidad,
    section5Values,
  ]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () =>
      EVALUACION_NAV_ITEMS.map((item) =>
        item.type === "group"
          ? {
              type: "group",
              id: item.id,
              label: item.label,
              shortLabel: item.shortLabel,
              children: item.children.map((childId) => ({
                id: childId,
                label: EVALUACION_SECTION_LABELS[childId],
                shortLabel: EVALUACION_SECTION_LABELS[childId].startsWith("2.")
                  ? EVALUACION_SECTION_LABELS[childId].slice(0, 3)
                  : undefined,
                status: sectionStatuses[childId],
              })),
            }
          : {
              id: item.id,
              label: item.label,
              shortLabel: item.shortLabel,
              status: sectionStatuses[item.id],
            }
      ),
    [sectionStatuses]
  );

  if (finalizedSuccess) {
    return {
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: (
          <>
            La evaluación de accesibilidad para{" "}
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
    shouldShowEvaluacionLoadingState({
      draftParam,
      restoringDraft,
      loadingDraft,
      hasEmpresa,
      currentRouteHydrated,
    })
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
        title: "Evaluacion de Accesibilidad",
        companyName: empresa?.nombre_empresa,
        onBack: handleReturnToHub,
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as EvaluacionSectionId),
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
              type="button"
              onClick={handleSubmit(handlePrepareSubmit, onInvalid)}
              disabled={
                isSubmitting ||
                isFinalizing ||
                !isDocumentEditable
              }
              isSubmitting={isSubmitting}
              isFinalizing={isFinalizing}
            />
          </div>
        ),
        onFormBlurCapture: handleFormBlurCapture,
        formProps: {
          onSubmit: (event) => {
            event.preventDefault();
          },
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
          disabled: hasEmpresa && !isDocumentEditable,
          collapsed: collapsedSections.company,
          status: sectionStatuses.company,
          sectionRef: sectionRefs.company,
          onToggle: () => toggleSection("company"),
          onFocusCapture: () => setActiveSectionId("company"),
        },
        questionSections: Object.fromEntries(
          EVALUACION_QUESTION_SECTION_IDS.map((sectionId) => [
            sectionId,
            {
              isDocumentEditable,
              sectionId,
              values: questionSectionValues[sectionId],
              register,
              errors,
              getValues,
              setValue,
              collapsed: collapsedSections[sectionId],
              status: sectionStatuses[sectionId],
              sectionRef: sectionRefs[sectionId],
              onToggle: () => toggleSection(sectionId),
              onFocusCapture: () => setActiveSectionId(sectionId),
            },
          ])
        ) as EvaluacionFormPresenterProps["sections"]["questionSections"],
        section_4: {
          isDocumentEditable,
          values: section4Values,
          summary: accessibilitySummary,
          register,
          errors,
          collapsed: collapsedSections.section_4,
          status: sectionStatuses.section_4,
          sectionRef: sectionRefs.section_4,
          onToggle: () => toggleSection("section_4"),
          onFocusCapture: () => setActiveSectionId("section_4"),
        },
        section_5: {
          isDocumentEditable,
          values: section5Values,
          register,
          errors,
          collapsed: collapsedSections.section_5,
          status: sectionStatuses.section_5,
          sectionRef: sectionRefs.section_5,
          onToggle: () => toggleSection("section_5"),
          onFocusCapture: () => setActiveSectionId("section_5"),
        },
        section_6: {
          isDocumentEditable,
          fieldName: "observaciones_generales",
          label: "Observaciones generales",
          value: observacionesGenerales,
          required: false,
          register,
          errors,
          getValues,
          setValue,
          placeholder:
            "Describe hallazgos, alertas operativas y acuerdos relevantes de la visita.",
          collapsed: collapsedSections.section_6,
          status: sectionStatuses.section_6,
          sectionRef: sectionRefs.section_6,
          onToggle: () => toggleSection("section_6"),
          onFocusCapture: () => setActiveSectionId("section_6"),
        },
        section_7: {
          isDocumentEditable,
          fieldName: "cargos_compatibles",
          label: "Cargos compatibles",
          value: cargosCompatibles,
          required: true,
          register,
          errors,
          getValues,
          setValue,
          placeholder:
            "Registra los cargos, areas o tipos de rol que hoy aparecen como compatibles.",
          collapsed: collapsedSections.section_7,
          status: sectionStatuses.section_7,
          sectionRef: sectionRefs.section_7,
          onToggle: () => toggleSection("section_7"),
          onFocusCapture: () => setActiveSectionId("section_7"),
        },
        section_8: {
          isDocumentEditable,
          control,
          register,
          setValue,
          errors,
          profesionales,
          profesionalAsignado: empresa?.profesional_asignado,
          collapsed: collapsedSections.section_8,
          status: sectionStatuses.section_8,
          sectionRef: sectionRefs.section_8,
          onToggle: () => toggleSection("section_8"),
          onFocusCapture: () => setActiveSectionId("section_8"),
        },
      },
      submitDialog: {
        open: submitConfirmOpen || isFinalizing,
        description:
          "Esta acción publicará el acta en Google Sheets. Confirma solo cuando hayas revisado la información.",
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
          if (isFinalizing) return;
          clearFinalizationUiLock("evaluacion");
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
