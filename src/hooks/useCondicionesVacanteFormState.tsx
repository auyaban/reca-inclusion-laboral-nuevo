"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { CondicionesVacanteFormPresenterProps } from "@/components/forms/condicionesVacante/CondicionesVacanteFormPresenter";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";
import {
  LongFormDraftErrorState,
  LongFormFinalizeButton,
  LongFormLoadingOverlay,
  LongFormSuccessState,
  LongFormTestFillButton,
} from "@/components/forms/shared/LongFormShell";
import type { LongFormSectionNavItem } from "@/components/forms/shared/LongFormSectionNav";
import type { LongFormSectionStatus } from "@/components/forms/shared/LongFormSectionCard";
import { useCondicionesVacanteCatalogs } from "@/hooks/useCondicionesVacanteCatalogs";
import { useGooglePrewarm } from "@/hooks/useGooglePrewarm";
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";
import { useInvisibleDraftTelemetry } from "@/hooks/useInvisibleDraftTelemetry";
import {
  useLongFormDraftController,
} from "@/hooks/useLongFormDraftController";
import { useLongFormSections } from "@/hooks/useLongFormSections";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { openActaTab, returnToHubTab } from "@/lib/actaTabs";
import { normalizePersistedAsistentesForMode } from "@/lib/asistentes";
import {
  deriveCondicionesVacanteCompetencias,
  getDefaultCondicionesVacanteValues,
  normalizeCondicionesVacanteValues,
} from "@/lib/condicionesVacante";
import {
  buildCondicionesVacanteManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
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
import { buildCondicionesVacanteRequestHash } from "@/lib/finalization/idempotency";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import type { LongFormFinalizedSuccess } from "@/lib/longFormSuccess";
import { resolveLongFormDraftSource } from "@/lib/longFormHydration";
import {
  getInitialLongFormFinalizationProgress,
  shouldRenderInlineLongFormFinalizationFeedback,
  type LongFormFinalizationRetryAction,
  type LongFormFinalizationProgress,
} from "@/lib/longFormFinalization";
import {
  buildCondicionesVacanteSessionRouteKey,
  resolveCondicionesVacanteDraftHydration,
  resolveCondicionesVacanteSessionHydration,
} from "@/lib/condicionesVacanteHydration";
import {
  CONDICIONES_VACANTE_CAPABILITIES_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_COMPANY_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_EDUCATION_CHECKBOX_FIELDS,
  CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_POSTURES_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_RECOMMENDATIONS_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_RISKS_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_SECTION_IDS,
  CONDICIONES_VACANTE_SECTION_LABELS,
  CONDICIONES_VACANTE_VACANCY_REQUIRED_FIELDS,
  getCondicionesVacanteCompatStepForSection,
  getCondicionesVacanteSectionIdForStep,
  INITIAL_CONDICIONES_VACANTE_COLLAPSED_SECTIONS,
  isCondicionesVacanteAttendeesSectionComplete,
  isCondicionesVacanteCapabilitiesSectionComplete,
  isCondicionesVacanteCompanySectionComplete,
  isCondicionesVacanteDisabilitiesSectionComplete,
  isCondicionesVacanteEducationSectionComplete,
  isCondicionesVacantePosturesSectionComplete,
  isCondicionesVacanteRecommendationsSectionComplete,
  isCondicionesVacanteRisksSectionComplete,
  isCondicionesVacanteVacancySectionComplete,
  type CondicionesVacanteSectionId,
} from "@/lib/condicionesVacanteSections";
import { getCondicionesVacanteValidationTarget } from "@/lib/condicionesVacanteValidationNavigation";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  condicionesVacanteSchema,
  type CondicionesVacanteValues,
} from "@/lib/validations/condicionesVacante";

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
  presenterProps: CondicionesVacanteFormPresenterProps;
};

type FinalizedSuccessState = LongFormFinalizedSuccess;

export type CondicionesVacanteFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

type UseCondicionesVacanteFormStateOptions = {
  initialDraftResolution?: InitialDraftResolution;
};

const CONDICIONES_VACANTE_WATCH_FIELDS = Array.from(
  new Set<keyof CondicionesVacanteValues>([
    ...CONDICIONES_VACANTE_COMPANY_REQUIRED_FIELDS,
    ...CONDICIONES_VACANTE_VACANCY_REQUIRED_FIELDS,
    ...CONDICIONES_VACANTE_EDUCATION_CHECKBOX_FIELDS,
    ...CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS,
    ...CONDICIONES_VACANTE_CAPABILITIES_REQUIRED_FIELDS,
    ...CONDICIONES_VACANTE_POSTURES_REQUIRED_FIELDS,
    ...CONDICIONES_VACANTE_RISKS_REQUIRED_FIELDS,
    ...CONDICIONES_VACANTE_RECOMMENDATIONS_REQUIRED_FIELDS,
    "competencias",
    "discapacidades",
    "asistentes",
  ])
);

function areDiscapacidadesEqual(
  left: CondicionesVacanteValues["discapacidades"],
  right: CondicionesVacanteValues["discapacidades"]
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (row, index) =>
      row.discapacidad === right[index]?.discapacidad &&
      row.descripcion === right[index]?.descripcion
  );
}

function buildPersistedValues(
  values: Partial<CondicionesVacanteValues> | Record<string, unknown>,
  empresa: Empresa | null,
  catalogs?: ReturnType<typeof useCondicionesVacanteCatalogs>["catalogs"] | null
) {
  const normalizedValues = normalizeCondicionesVacanteValues(
    values,
    empresa,
    catalogs ?? undefined
  );

  return {
    ...normalizedValues,
    asistentes: normalizePersistedAsistentesForMode(normalizedValues.asistentes, {
      mode: "reca_plus_agency_advisor",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

function getSuccessNoticeError(error: string | null) {
  return error === "Borrador no encontrado" ? null : error;
}

function buildSectionStatus(
  activeSectionId: CondicionesVacanteSectionId,
  errorSectionId: CondicionesVacanteSectionId | null,
  sectionId: CondicionesVacanteSectionId,
  options?: { completed?: boolean; disabled?: boolean }
): LongFormSectionStatus {
  if (activeSectionId === sectionId) return "active";
  if (options?.disabled) return "disabled";
  if (errorSectionId === sectionId) return "error";
  if (options?.completed) return "completed";
  return "idle";
}

export function useCondicionesVacanteFormState({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: UseCondicionesVacanteFormStateOptions = {}): CondicionesVacanteFormState {
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
  const invisibleDraftPilotEnabled =
    isInvisibleDraftPilotEnabled("condiciones-vacante");
  const bootstrapDraftId = useMemo(
    () =>
      resolveInvisibleDraftBootstrapId({
        formSlug: "condiciones-vacante",
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
    useState<CondicionesVacanteValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] =
    useState<LongFormFinalizationProgress>(
      getInitialLongFormFinalizationProgress
    );
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const [lastSubmittedSnapshot, setLastSubmittedSnapshot] = useState<{
    empresa: Empresa;
    formData: CondicionesVacanteValues;
    step: number;
  } | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const vacancyRef = useRef<HTMLElement | null>(null);
  const educationRef = useRef<HTMLElement | null>(null);
  const capabilitiesRef = useRef<HTMLElement | null>(null);
  const posturesRef = useRef<HTMLElement | null>(null);
  const risksRef = useRef<HTMLElement | null>(null);
  const disabilitiesRef = useRef<HTMLElement | null>(null);
  const recommendationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const finalizationFeedbackRef = useRef<HTMLDivElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();
  const {
    catalogs,
    error: catalogError,
    status: catalogStatus,
    retry: retryCatalog,
  } = useCondicionesVacanteCatalogs();
  const catalogsRef = useRef(catalogs);

  useEffect(() => {
    catalogsRef.current = catalogs;
  }, [catalogs]);

  const draftController = useLongFormDraftController({
    slug: "condiciones-vacante",
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
    loadLocal,
    checkpointDraft,
    saveDraft,
    loadDraft,
    duplicateDraft,
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
    hasPendingAutosave,
    hasLocalDirtyChanges,
    localDraftSavedAt,
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
  } = useForm<CondicionesVacanteValues>({
    resolver:
      zodResolver(condicionesVacanteSchema) as Resolver<CondicionesVacanteValues>,
    defaultValues: getDefaultCondicionesVacanteValues(empresa, catalogs ?? undefined),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const watchedValues = useWatch({
    control,
    name: CONDICIONES_VACANTE_WATCH_FIELDS,
  });
  void watchedValues;
  const values = getValues() as CondicionesVacanteValues;
  const formTabLabel = getFormTabLabel("condiciones-vacante");
  const showTestFillAction = isManualTestFillEnabled();
  const duplicateLandingStep =
    getCondicionesVacanteCompatStepForSection("vacancy");
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const showTakeoverPrompt = isReadonlyDraft;
  const currentRouteKey = useMemo(() => {
    if (draftParam) {
      return `draft:${draftParam}`;
    }

    const sessionId = sessionParam?.trim() || localDraftSessionId;
    return buildCondicionesVacanteSessionRouteKey(sessionId, explicitNewDraft);
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
    formSlug: "condiciones-vacante",
    empresa,
    formData: {
      asistentes: values.asistentes,
      discapacidades: values.discapacidades,
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
    formSlug: "condiciones-vacante",
    draftParam,
    activeDraftId,
    editingAuthorityState,
    lockConflict,
    invisibleDraftPilotEnabled,
    showTakeoverPrompt,
  });
  const successNoticeError = getSuccessNoticeError(serverError);
  const sectionRefs = useMemo(
    () => ({
      company: companyRef,
      vacancy: vacancyRef,
      education: educationRef,
      capabilities: capabilitiesRef,
      postures: posturesRef,
      risks: risksRef,
      disabilities: disabilitiesRef,
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
  } = useLongFormSections<CondicionesVacanteSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_CONDICIONES_VACANTE_COLLAPSED_SECTIONS,
    sectionRefs,
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
      buildFormEditorUrl("condiciones-vacante", {
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

  useEffect(() => {
    const nextCompetencias = deriveCondicionesVacanteCompetencias(values.nivel_cargo);
    const currentCompetencias = values.competencias ?? [];
    const isSame =
      currentCompetencias.length === nextCompetencias.length &&
      currentCompetencias.every(
        (competencia, index) => competencia === nextCompetencias[index]
      );

    if (!isSame) {
      setValue("competencias", nextCompetencias, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [setValue, values.competencias, values.nivel_cargo]);

  useEffect(() => {
    if (!catalogs?.disabilityDescriptions || isBootstrappingForm) {
      return;
    }

    const currentRows = getValues("discapacidades");
    const normalizedRows = normalizeCondicionesVacanteValues(
      getValues(),
      empresa,
      catalogs
    ).discapacidades;

    if (!areDiscapacidadesEqual(currentRows, normalizedRows)) {
      setValue("discapacidades", normalizedRows, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [catalogs, empresa, getValues, isBootstrappingForm, setValue]);

  useEffect(() => {
    if (!restoringDraft) {
      setIsBootstrappingForm(false);
      setIsDuplicating(false);
    }
  }, [restoringDraft]);

  const navigateToValidationTarget = useCallback(
    (
      validationTarget: ReturnType<typeof getCondicionesVacanteValidationTarget>
    ) => {
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

  const applyFormState = useCallback(
    (
      valuesToRestore: Partial<CondicionesVacanteValues> | Record<string, unknown>,
      nextEmpresa: Empresa,
      nextStep: number
    ) => {
      setIsBootstrappingForm(true);
      setEmpresa(nextEmpresa);
      reset(
        normalizeCondicionesVacanteValues(
          valuesToRestore,
          nextEmpresa,
          catalogsRef.current ?? undefined
        )
      );
      setStep(nextStep);
      setActiveSectionId(getCondicionesVacanteSectionIdForStep(nextStep));
      setCollapsedSections(INITIAL_CONDICIONES_VACANTE_COLLAPSED_SECTIONS);
      setFinalizedSuccess(null);
      setLastSubmittedSnapshot(null);
      resumeDraftLifecycle();
      setServerError(null);
      resetFinalizationProgress();
      setIsBootstrappingForm(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [
      reset,
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
    let cancelled = false;

    async function hydrateRoute() {
      const currentEmpresa = empresaRef.current;
      const currentCatalogs = catalogsRef.current;

      if (finalizedSuccess) {
        setRestoringDraft(false);
        return;
      }

      if (draftParam) {
        const routeKey = `draft:${draftParam}`;
        setRestoringDraft(true);
        const localDraft = await loadLocal();
        const localEmpresa = localDraft?.empresa ?? currentEmpresa ?? null;
        const draftHydrationAction = resolveCondicionesVacanteDraftHydration({
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
            setDraftAlias("condiciones-vacante", localDraftSessionId, draftParam);
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
          setDraftAlias(
            "condiciones-vacante",
            localDraftSessionId,
            result.draft.id
          );
        }
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        normalizeDraftBootstrapToSessionRoute();
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      const sessionId = sessionParam?.trim() || localDraftSessionId;
      const routeKey = buildCondicionesVacanteSessionRouteKey(
        sessionId,
        explicitNewDraft
      );

      if (!currentEmpresa && !hasSessionParam) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      if (!hasSessionParam) {
        router.replace(
          buildFormEditorUrl("condiciones-vacante", { sessionId }),
          { scroll: false }
        );
      }

      const persistedDraftId = bootstrapDraftId;
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = localDraft?.empresa ?? currentEmpresa ?? null;
      const sessionHydrationAction = resolveCondicionesVacanteSessionHydration({
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

      if (!currentEmpresa) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      applyFormState(
        getDefaultCondicionesVacanteValues(
          currentEmpresa,
          currentCatalogs ?? undefined
        ),
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
    bootstrapDraftId,
    draftParam,
    explicitNewDraft,
    finalizedSuccess,
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
    router,
    sessionParam,
    setActiveSectionId,
    setRestoringDraft,
  ]);

  useEffect(() => {
    if (!empresa || restoringDraft || draftLifecycleSuspended) {
      return;
    }

    const subscription = watch((nextValues) => {
      autosave(
        step,
        buildPersistedValues(nextValues as Record<string, unknown>, empresa, catalogs)
      );
    });

    return () => subscription.unsubscribe();
  }, [
    autosave,
    catalogs,
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
        "condiciones-vacante",
        "session_to_draft_promotion"
      )
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("condiciones-vacante", {
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
    if (activeSectionId === "company") {
      return;
    }

    const nextStep = getCondicionesVacanteCompatStepForSection(activeSectionId);
    if (nextStep !== step) {
      setStep(nextStep);
    }
  }, [activeSectionId, step]);

  const handleSelectEmpresa = useCallback(
    (nextEmpresa: Empresa) => {
      const nextSessionId = sessionParam?.trim() || startNewDraftSession();
      const nextRoute = buildFormEditorUrl("condiciones-vacante", {
        sessionId: nextSessionId,
        isNewDraft: explicitNewDraft,
      });

      setEmpresa(nextEmpresa);
      reset(getDefaultCondicionesVacanteValues(nextEmpresa, catalogs ?? undefined));
      setStep(0);
      setActiveSectionId("vacancy");
      setCollapsedSections(INITIAL_CONDICIONES_VACANTE_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setFinalizedSuccess(null);
      setLastSubmittedSnapshot(null);
      setServerError(null);
      setIsBootstrappingForm(false);
      markRouteHydrated(
        buildCondicionesVacanteSessionRouteKey(nextSessionId, explicitNewDraft)
      );
      router.replace(nextRoute, { scroll: false });
      window.setTimeout(() => {
        scrollToSection("vacancy");
      }, 0);
    },
    [
      catalogs,
      explicitNewDraft,
      markRouteHydrated,
      reset,
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

  const sectionStatuses = useMemo<
    Record<CondicionesVacanteSectionId, LongFormSectionStatus>
  >(() => {
    const errorSectionId =
      getCondicionesVacanteValidationTarget(errors)?.sectionId ?? null;

    return {
      company: buildSectionStatus(activeSectionId, errorSectionId, "company", {
        completed: isCondicionesVacanteCompanySectionComplete({
          hasEmpresa,
          fecha_visita: values.fecha_visita,
          modalidad: values.modalidad,
          nit_empresa: values.nit_empresa,
        }),
      }),
      vacancy: buildSectionStatus(activeSectionId, errorSectionId, "vacancy", {
        completed:
          hasEmpresa && isCondicionesVacanteVacancySectionComplete(values),
        disabled: !hasEmpresa,
      }),
      education: buildSectionStatus(activeSectionId, errorSectionId, "education", {
        completed:
          hasEmpresa && isCondicionesVacanteEducationSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      capabilities: buildSectionStatus(
        activeSectionId,
        errorSectionId,
        "capabilities",
        {
          completed:
            hasEmpresa && isCondicionesVacanteCapabilitiesSectionComplete(values),
          disabled: !hasEmpresa,
        }
      ),
      postures: buildSectionStatus(activeSectionId, errorSectionId, "postures", {
        completed:
          hasEmpresa && isCondicionesVacantePosturesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      risks: buildSectionStatus(activeSectionId, errorSectionId, "risks", {
        completed: hasEmpresa && isCondicionesVacanteRisksSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      disabilities: buildSectionStatus(
        activeSectionId,
        errorSectionId,
        "disabilities",
        {
          completed:
            hasEmpresa && isCondicionesVacanteDisabilitiesSectionComplete(values),
          disabled: !hasEmpresa,
        }
      ),
      recommendations: buildSectionStatus(
        activeSectionId,
        errorSectionId,
        "recommendations",
        {
          completed:
            hasEmpresa &&
            isCondicionesVacanteRecommendationsSectionComplete(values),
          disabled: !hasEmpresa,
        }
      ),
      attendees: buildSectionStatus(activeSectionId, errorSectionId, "attendees", {
        completed:
          hasEmpresa && isCondicionesVacanteAttendeesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
    };
  }, [activeSectionId, errors, hasEmpresa, values]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () =>
      CONDICIONES_VACANTE_SECTION_IDS.map((sectionId) => ({
        id: sectionId,
        label: CONDICIONES_VACANTE_SECTION_LABELS[sectionId],
        status: sectionStatuses[sectionId],
      })),
    [sectionStatuses]
  );

  const handleSectionSelect = useCallback(
    (sectionId: CondicionesVacanteSectionId) => {
      if (!hasEmpresa && sectionId !== "company") {
        return;
      }

      selectSection(sectionId);
    },
    [hasEmpresa, selectSection]
  );

  const handleSaveDraft = useCallback(async () => {
    if (!isDocumentEditable) {
      return false;
    }

    const nextValues = buildPersistedValues(getValues(), empresa, catalogs);
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
          "condiciones-vacante",
          "save_draft_redirect"
        )
      ) {
        return true;
      }

      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("condiciones-vacante", {
          draftId: result.draftId,
        }),
        { scroll: false }
      );
    }

    return true;
  }, [
    catalogs,
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
    step,
  ]);

  function handleFillTestData() {
    if (!isDocumentEditable) {
      return;
    }

    const nextValues = buildCondicionesVacanteManualTestValues(empresa);
    reset(nextValues);
    setServerError(null);
    void autosave(step, nextValues as Record<string, unknown>);
  }

  const handlePrepareSubmit = useCallback(
    (data: CondicionesVacanteValues) => {
      if (!isDocumentEditable) {
        return;
      }

      setServerError(null);
      resetFinalizationProgress();
      setPendingSubmitValues(buildPersistedValues(data, empresa, catalogs));
      setSubmitConfirmOpen(true);
    },
    [catalogs, empresa, isDocumentEditable, resetFinalizationProgress]
  );

  const confirmSubmit = useCallback(
    async (retryAction: LongFormFinalizationRetryAction = "submit") => {
    if (!isDocumentEditable) {
      return;
    }

    if (!pendingSubmitValues || !empresa) {
      clearFinalizationUiLock("condiciones-vacante");
      resumeDraftLifecycle();
      setSubmitConfirmOpen(false);
      resetFinalizationProgress();
      return;
    }

    beginFinalizationUiLock("condiciones-vacante");
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
      const finalizationIdentity = {
        draft_id: activeDraftId ?? undefined,
        local_draft_session_id: localDraftSessionId,
      };
      const requestHash = buildCondicionesVacanteRequestHash(pendingSubmitValues);
      let responsePayload: { sheetLink: string; pdfLink?: string };

      if (retryAction === "submit") {
        updateFinalizationStage("preparando_envio");
        const requestBody = JSON.stringify({
          empresa,
          formData: pendingSubmitValues,
          finalization_identity: finalizationIdentity,
        });
        updateFinalizationStage("enviando_al_servidor");
        const responsePromise = fetch("/api/formularios/condiciones-vacante", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        updateFinalizationStage("esperando_respuesta");
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "condiciones-vacante",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
          responsePromise,
        });
      } else {
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "condiciones-vacante",
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
      clearFinalizationUiLock("condiciones-vacante");
      setLastSubmittedSnapshot({
        empresa,
        formData: pendingSubmitValues,
        step: duplicateLandingStep,
      });
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
          "[condiciones-vacante.finalization_cleanup] failed (non-fatal)",
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
    },
    [
      activeDraftId,
      clearDraftAfterSuccess,
      duplicateLandingStep,
      empresa,
      isDocumentEditable,
      localDraftSessionId,
      markFinalizationError,
      pendingSubmitValues,
      resetFinalizationProgress,
      resumeDraftLifecycle,
      suspendDraftLifecycle,
      updateFinalizationStage,
      updateFinalizationStatusContext,
    ]
  );

  const onInvalid = useCallback(
    (nextErrors: FieldErrors<CondicionesVacanteValues>) => {
      const validationTarget = getCondicionesVacanteValidationTarget(nextErrors);
      resetFinalizationProgress();
      navigateToValidationTarget(validationTarget);

      if (!validationTarget || !isDocumentEditable || !empresa) {
        return;
      }

      const checkpointStep =
        validationTarget.sectionId === "company"
          ? 0
          : getCondicionesVacanteCompatStepForSection(validationTarget.sectionId);
      const nextValues = buildPersistedValues(getValues(), empresa, catalogs);

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
              "condiciones-vacante",
              "invalid_submission_promotion"
            )
          ) {
            return;
          }

          markRouteHydrated(`draft:${nextDraftId}`);
          router.replace(
            buildFormEditorUrl("condiciones-vacante", {
              draftId: nextDraftId,
            }),
            { scroll: false }
          );
        },
        onError: () => {
          setServerError(
            "Revisa los campos resaltados antes de finalizar. Además, no se pudo guardar el borrador automáticamente."
          );
        },
      });
    },
    [
      activeDraftId,
      catalogs,
      checkpointDraft,
      checkpointInvalidSubmission,
      empresa,
      getValues,
      invisibleDraftPilotEnabled,
      isDocumentEditable,
      markRouteHydrated,
      navigateToValidationTarget,
      reportInvisibleDraftSuppression,
      resetFinalizationProgress,
      router,
    ]
  );

  const handleReturnToHub = useCallback(() => {
    void returnToHubTab("/hub");
  }, []);

  const openDuplicatedDraftTab = useCallback((nextDraftId: string) => {
    return openActaTab(
      buildFormEditorUrl("condiciones-vacante", {
        draftId: nextDraftId,
      })
    );
  }, []);

  const handleDuplicateFromEditor = useCallback(async () => {
    if (!empresa || !isDocumentEditable || isFinalizing || isSubmitting) {
      return;
    }

    const sourceSnapshot = buildPersistedValues(getValues(), empresa, catalogs);

    setServerError(null);
    setIsDuplicating(true);

    try {
      const duplicated = await duplicateDraft({
        step: duplicateLandingStep,
        data: sourceSnapshot as Record<string, unknown>,
        empresa,
      });

      if (!duplicated.ok || !duplicated.draftId) {
        throw new Error(
          duplicated.error ?? "No se pudo crear la copia del borrador."
        );
      }

      autosave(step, sourceSnapshot as Record<string, unknown>);
      await flushAutosave();

      const didOpen = openDuplicatedDraftTab(duplicated.draftId);
      if (!didOpen) {
        setServerError(
          "La copia se creó, pero no se pudo abrir en una nueva pestaña. Revisa el bloqueador de popups o ábrela desde Borradores."
        );
      }
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "No se pudo duplicar el borrador."
      );
    } finally {
      setIsDuplicating(false);
    }
  }, [
    autosave,
    catalogs,
    duplicateDraft,
    duplicateLandingStep,
    empresa,
    flushAutosave,
    getValues,
    isDocumentEditable,
    isFinalizing,
    isSubmitting,
    openDuplicatedDraftTab,
    step,
  ]);

  const handleDuplicateFromSuccess = useCallback(async () => {
    if (!lastSubmittedSnapshot) {
      setServerError("No se encontró la copia base para duplicar esta acta.");
      return;
    }

    setServerError(null);
    setIsDuplicating(true);

    try {
      const duplicated = await duplicateDraft({
        step: lastSubmittedSnapshot.step,
        data: lastSubmittedSnapshot.formData as Record<string, unknown>,
        empresa: lastSubmittedSnapshot.empresa,
      });

      if (!duplicated.ok || !duplicated.draftId) {
        throw new Error(
          duplicated.error ?? "No se pudo crear la copia del borrador."
        );
      }

      const didOpen = openDuplicatedDraftTab(duplicated.draftId);
      if (!didOpen) {
        setServerError(
          "La copia se creó, pero no se pudo abrir en una nueva pestaña. Revisa el bloqueador de popups o ábrela desde Borradores."
        );
      }
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "No se pudo duplicar el borrador."
      );
    } finally {
      setIsDuplicating(false);
    }
  }, [duplicateDraft, lastSubmittedSnapshot, openDuplicatedDraftTab]);

  const handleStartNewForm = useCallback(() => {
    startNewDraftSession();
    clearEmpresa();
    setIsBootstrappingForm(true);
    setFinalizedSuccess(null);
    clearFinalizationUiLock("condiciones-vacante");
    resumeDraftLifecycle();
    setLastSubmittedSnapshot(null);
    setServerError(null);
    resetFinalizationProgress();
    reset(getDefaultCondicionesVacanteValues(null, catalogs ?? undefined));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_CONDICIONES_VACANTE_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(
      buildFormEditorUrl("condiciones-vacante", { isNewDraft: true })
    );
    setIsBootstrappingForm(false);
  }, [
    catalogs,
    clearEmpresa,
    markRouteHydrated,
    reset,
    resumeDraftLifecycle,
    router,
    setCollapsedSections,
    setActiveSectionId,
    resetFinalizationProgress,
    startNewDraftSession,
  ]);

  if (finalizedSuccess) {
    const successNotice = successNoticeError ?? null;

    return {
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: (
          <>
            Las condiciones de vacante para{" "}
            <span className="font-semibold text-gray-700">
              {finalizedSuccess.companyName}
            </span>{" "}
            fueron registradas correctamente.
          </>
        ),
        links: finalizedSuccess.links,
        onReturnToHub: handleReturnToHub,
        onStartNewForm: handleStartNewForm,
        notice: successNotice ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {successNotice}
          </div>
        ) : null,
        extraActions: lastSubmittedSnapshot ? (
          <button
            type="button"
            onClick={() => {
              void handleDuplicateFromSuccess();
            }}
            disabled={isDuplicating}
            className="w-full rounded-xl border border-reca-200 bg-reca-50 py-2.5 text-sm font-semibold text-reca transition-colors hover:bg-reca-100"
          >
            {isDuplicating ? "Duplicando..." : "Duplicar para otra vacante"}
          </button>
        ) : null,
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
        title: "Condiciones de la Vacante",
        companyName: empresa?.nombre_empresa,
        onBack: handleReturnToHub,
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as CondicionesVacanteSectionId),
        serverError,
        finalizationFeedback:
          shouldRenderInlineLongFormFinalizationFeedback({
            progress: finalizationProgress,
            dialogOpen: submitConfirmOpen || isFinalizing,
          }) ? (
            <LongFormFinalizationStatus progress={finalizationProgress} />
          ) : null,
        finalizationFeedbackRef,
        loadingOverlay: isHydratingDraftVisual ? (
          <LongFormLoadingOverlay />
        ) : null,
        submitAction: (
          <div className="flex flex-wrap justify-end gap-3">
            {showTestFillAction ? (
              <LongFormTestFillButton
                disabled={
                  isSubmitting ||
                  isFinalizing ||
                  isDuplicating ||
                  !isDocumentEditable
                }
                onClick={handleFillTestData}
              />
            ) : null}
            {hasEmpresa && isDocumentEditable ? (
              <button
                type="button"
                onClick={() => {
                  void handleDuplicateFromEditor();
                }}
                disabled={isSubmitting || isFinalizing || isDuplicating}
                className="inline-flex items-center rounded-xl border border-reca-200 bg-reca-50 px-6 py-2.5 text-sm font-semibold text-reca transition-colors hover:bg-reca-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDuplicating ? "Duplicando..." : "Duplicar acta"}
              </button>
            ) : null}
            <LongFormFinalizeButton
              disabled={
                isSubmitting || isFinalizing || isDuplicating || !isDocumentEditable
              }
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
          fechaVisita: values.fecha_visita,
          modalidad: values.modalidad,
          nitEmpresa: values.nit_empresa,
          register,
          errors,
          onSelectEmpresa: handleSelectEmpresa,
          disabled: hasEmpresa && !isDocumentEditable,
          collapsed: collapsedSections.company,
          status: sectionStatuses.company,
          sectionRef: companyRef,
          onToggle: () => toggleSection("company"),
          onFocusCapture: () => setActiveSectionId("company"),
        },
        vacancy: {
          isDocumentEditable,
          register,
          errors,
          competencias: values.competencias,
          collapsed: collapsedSections.vacancy,
          status: sectionStatuses.vacancy,
          sectionRef: vacancyRef,
          onToggle: () => toggleSection("vacancy"),
          onFocusCapture: () => setActiveSectionId("vacancy"),
        },
        education: {
          isDocumentEditable,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: collapsedSections.education,
          status: sectionStatuses.education,
          sectionRef: educationRef,
          onToggle: () => toggleSection("education"),
          onFocusCapture: () => setActiveSectionId("education"),
        },
        capabilities: {
          isDocumentEditable,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: collapsedSections.capabilities,
          status: sectionStatuses.capabilities,
          sectionRef: capabilitiesRef,
          onToggle: () => toggleSection("capabilities"),
          onFocusCapture: () => setActiveSectionId("capabilities"),
        },
        postures: {
          isDocumentEditable,
          register,
          errors,
          collapsed: collapsedSections.postures,
          status: sectionStatuses.postures,
          sectionRef: posturesRef,
          onToggle: () => toggleSection("postures"),
          onFocusCapture: () => setActiveSectionId("postures"),
        },
        risks: {
          isDocumentEditable,
          register,
          errors,
          values,
          getValues,
          setValue,
          collapsed: collapsedSections.risks,
          status: sectionStatuses.risks,
          sectionRef: risksRef,
          onToggle: () => toggleSection("risks"),
          onFocusCapture: () => setActiveSectionId("risks"),
        },
        disabilities: {
          isDocumentEditable,
          control,
          errors,
          setValue,
          catalogs: catalogs ?? undefined,
          catalogError,
          catalogStatus,
          onRetryCatalog: retryCatalog,
          collapsed: collapsedSections.disabilities,
          status: sectionStatuses.disabilities,
          sectionRef: disabilitiesRef,
          onToggle: () => toggleSection("disabilities"),
          onFocusCapture: () => setActiveSectionId("disabilities"),
        },
        recommendations: {
          isDocumentEditable,
          register,
          errors,
          recommendations: values.observaciones_recomendaciones,
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
          "Esta acción publicará el acta en Google Sheets. Confirma solo cuando hayas revisado toda la información.",
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

          clearFinalizationUiLock("condiciones-vacante");
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
