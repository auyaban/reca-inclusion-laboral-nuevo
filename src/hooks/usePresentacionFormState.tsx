"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { PresentacionFormPresenterProps } from "@/components/forms/presentacion/PresentacionFormPresenter";
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
import { useLongFormDraftController } from "@/hooks/useLongFormDraftController";
import { useLongFormSections } from "@/hooks/useLongFormSections";
import { useGooglePrewarm } from "@/hooks/useGooglePrewarm";
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";
import { useInvisibleDraftTelemetry } from "@/hooks/useInvisibleDraftTelemetry";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { normalizePersistedAsistentesForMode } from "@/lib/asistentes";
import { returnToHubTab } from "@/lib/actaTabs";
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
import { buildFinalizationRequestHash } from "@/lib/finalization/idempotency";
import {
  beginFinalizationUiLock,
  clearFinalizationUiLock,
  shouldSuppressDraftNavigationWhileFinalizing,
} from "@/lib/finalization/finalizationUiLock";
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
  getDefaultPresentacionValues,
  normalizePresentacionValues,
} from "@/lib/presentacion";
import {
  buildPresentacionManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import {
  buildPresentacionSessionRouteKey,
  resolvePresentacionDraftHydration,
  resolvePresentacionSessionHydration,
} from "@/lib/presentacionHydration";
import {
  getPresentacionCompatStepForSection,
  getPresentacionSectionIdForStep,
  INITIAL_PRESENTACION_COLLAPSED_SECTIONS,
  isPresentacionAgreementsSectionComplete,
  isPresentacionAttendeesSectionComplete,
  isPresentacionMotivationSectionComplete,
  isPresentacionVisitSectionComplete,
  PRESENTACION_SECTION_LABELS,
  type PresentacionSectionId,
} from "@/lib/presentacionSections";
import { getPresentacionValidationTarget } from "@/lib/presentacionValidationNavigation";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  presentacionSchema,
  type PresentacionValues,
} from "@/lib/validations/presentacion";

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
  presenterProps: PresentacionFormPresenterProps;
};

type FinalizedSuccessState = LongFormFinalizedSuccess;

export type PresentacionFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

type UsePresentacionFormStateOptions = {
  initialDraftResolution?: InitialDraftResolution;
};

const SECTION_LABELS: Record<PresentacionSectionId, string> =
  PRESENTACION_SECTION_LABELS;

export function usePresentacionFormState({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: UsePresentacionFormStateOptions = {}): PresentacionFormState {
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
  const invisibleDraftPilotEnabled = isInvisibleDraftPilotEnabled("presentacion");
  const bootstrapDraftId = useMemo(
    () =>
      resolveInvisibleDraftBootstrapId({
        formSlug: "presentacion",
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
    useState<PresentacionValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] =
    useState<LongFormFinalizationProgress>(
      getInitialLongFormFinalizationProgress
    );
  const companyRef = useRef<HTMLElement | null>(null);
  const visitRef = useRef<HTMLElement | null>(null);
  const motivationRef = useRef<HTMLElement | null>(null);
  const agreementsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const finalizationFeedbackRef = useRef<HTMLDivElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();

  const draftController = useLongFormDraftController({
    slug: "presentacion",
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
    reset,
    setValue,
    getValues,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PresentacionValues>({
    resolver: zodResolver(presentacionSchema),
    defaultValues: getDefaultPresentacionValues(empresa),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [
    tipoVisita = "",
    fechaVisita = "",
    modalidad = "",
    nitEmpresa = "",
    motivacion = [],
    acuerdos = "",
    asistentes = [],
  ] = useWatch({
    control,
    name: [
      "tipo_visita",
      "fecha_visita",
      "modalidad",
      "nit_empresa",
      "motivacion",
      "acuerdos_observaciones",
      "asistentes",
    ],
  }) as [
    PresentacionValues["tipo_visita"] | undefined,
    PresentacionValues["fecha_visita"] | undefined,
    PresentacionValues["modalidad"] | undefined,
    PresentacionValues["nit_empresa"] | undefined,
    PresentacionValues["motivacion"] | undefined,
    PresentacionValues["acuerdos_observaciones"] | undefined,
    PresentacionValues["asistentes"] | undefined,
  ];

  const formTabLabel = getFormTabLabel("presentacion");
  const showTestFillAction = isManualTestFillEnabled();
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const showTakeoverPrompt = isReadonlyDraft;
  const isHydratingDraftVisual = Boolean(
    !finalizedSuccess && (restoringDraft || (draftParam && loadingDraft))
  );
  const currentRouteKey = useMemo(() => {
    if (draftParam) {
      return `draft:${draftParam}`;
    }

    const sessionId = sessionParam?.trim() || localDraftSessionId;
    return buildPresentacionSessionRouteKey(sessionId, explicitNewDraft);
  }, [draftParam, explicitNewDraft, localDraftSessionId, sessionParam]);
  const currentRouteHydrationSettled = useMemo(
    () =>
      currentRouteKey ? isRouteHydrationSettled(currentRouteKey) : !restoringDraft,
    [currentRouteKey, isRouteHydrationSettled, restoringDraft]
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
    formSlug: "presentacion",
    empresa,
    formData: {
      tipo_visita: tipoVisita,
      asistentes,
    },
    step,
    draftId: activeDraftId,
    localDraftSessionId,
    ensureDraftIdentity,
    disabled:
      !hasEmpresa ||
      !isDocumentEditable ||
      loadingDraft ||
      restoringDraft ||
      draftLifecycleSuspended ||
      isFinalizing ||
      submitConfirmOpen,
  });

  const { reportInvisibleDraftSuppression } = useInvisibleDraftTelemetry({
    formSlug: "presentacion",
    draftParam,
    activeDraftId,
    editingAuthorityState,
    lockConflict,
    invisibleDraftPilotEnabled,
    showTakeoverPrompt,
  });

  const sectionRefs = useMemo(
    () => ({
      company: companyRef,
      visit: visitRef,
      motivation: motivationRef,
      agreements: agreementsRef,
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
  } = useLongFormSections<PresentacionSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_PRESENTACION_COLLAPSED_SECTIONS,
    sectionRefs,
  });

  const sectionStatuses = useMemo(() => {
    const visitComplete = isPresentacionVisitSectionComplete({
      tipo_visita: tipoVisita,
      fecha_visita: fechaVisita,
      modalidad,
      nit_empresa: nitEmpresa,
    });
    const motivationComplete = isPresentacionMotivationSectionComplete({
      motivacion,
    });
    const agreementsComplete = isPresentacionAgreementsSectionComplete({
      acuerdos_observaciones: acuerdos,
    });
    const attendeesComplete = isPresentacionAttendeesSectionComplete({
      asistentes,
    });
    const errorSectionId =
      getPresentacionValidationTarget(errors)?.sectionId ?? null;

    function getStatus(
      id: PresentacionSectionId,
      options?: { completed?: boolean; disabled?: boolean }
    ): LongFormSectionStatus {
      if (activeSectionId === id) {
        return "active";
      }

      if (options?.disabled) {
        return "disabled";
      }

      if (errorSectionId === id) {
        return "error";
      }

      if (options?.completed) {
        return "completed";
      }

      return "idle";
    }

    return {
      company: getStatus("company", { completed: hasEmpresa }),
      visit: getStatus("visit", {
        completed: hasEmpresa && visitComplete,
        disabled: !hasEmpresa,
      }),
      motivation: getStatus("motivation", {
        completed: hasEmpresa && motivationComplete,
        disabled: !hasEmpresa,
      }),
      agreements: getStatus("agreements", {
        completed: hasEmpresa && agreementsComplete,
        disabled: !hasEmpresa,
      }),
      attendees: getStatus("attendees", {
        completed: hasEmpresa && attendeesComplete,
        disabled: !hasEmpresa,
      }),
    };
  }, [
    activeSectionId,
    acuerdos,
    asistentes,
    errors,
    fechaVisita,
    hasEmpresa,
    modalidad,
    motivacion,
    nitEmpresa,
    tipoVisita,
  ]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () => [
      {
        id: "company",
        label: SECTION_LABELS.company,
        shortLabel: "Empresa",
        status: sectionStatuses.company,
      },
      {
        id: "visit",
        label: SECTION_LABELS.visit,
        shortLabel: "Visita",
        status: sectionStatuses.visit,
      },
      {
        id: "motivation",
        label: SECTION_LABELS.motivation,
        shortLabel: "Motivación",
        status: sectionStatuses.motivation,
      },
      {
        id: "agreements",
        label: SECTION_LABELS.agreements,
        shortLabel: "Acuerdos",
        status: sectionStatuses.agreements,
      },
      {
        id: "attendees",
        label: SECTION_LABELS.attendees,
        shortLabel: "Asistentes",
        status: sectionStatuses.attendees,
      },
    ],
    [sectionStatuses]
  );

  const normalizeDraftBootstrapToSessionRoute = useCallback(() => {
    if (!invisibleDraftPilotEnabled || !draftParam || !localDraftSessionId.trim()) {
      return;
    }

    const nextRoute = buildFormEditorUrl("presentacion", {
      sessionId: localDraftSessionId,
    });
    markRouteHydrated(
      buildPresentacionSessionRouteKey(localDraftSessionId, explicitNewDraft)
    );
    window.history.replaceState(window.history.state, "", nextRoute);
  }, [
    draftParam,
    explicitNewDraft,
    invisibleDraftPilotEnabled,
    localDraftSessionId,
    markRouteHydrated,
  ]);

  useEffect(() => {
    const companyName = empresa?.nombre_empresa?.trim();
    const baseTitle = companyName
      ? `${formTabLabel} | ${companyName}`
      : `${formTabLabel} | Nueva acta`;

    document.title = isReadonlyDraft ? `${baseTitle} | Solo lectura` : baseTitle;
  }, [empresa?.nombre_empresa, formTabLabel, isReadonlyDraft]);

  const navigateToValidationTarget = useCallback(
    (validationTarget: ReturnType<typeof getPresentacionValidationTarget>) => {
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

  const restoreFormState = useCallback(
    (
      valuesToRestore: Partial<PresentacionValues> | Record<string, unknown>,
      nextEmpresa: Empresa,
      nextStep: number
    ) => {
      const normalizedValues = normalizePresentacionValues(
        valuesToRestore,
        nextEmpresa
      );
      const nextSectionId = getPresentacionSectionIdForStep(nextStep);

      setEmpresa(nextEmpresa);
      reset(normalizedValues);
      setStep(nextStep);
      setActiveSectionId(nextSectionId);
      setCollapsedSections(INITIAL_PRESENTACION_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setFinalizedSuccess(null);
      setServerError(null);
      resetFinalizationProgress();
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
    const assignedProfessional = empresa?.profesional_asignado ?? "";
    if (!assignedProfessional || getValues("asistentes.0.cargo")) {
      return;
    }

    const match = profesionales.find(
      (profesional) =>
        profesional.nombre_profesional.toLowerCase() ===
        assignedProfessional.toLowerCase()
    );

    if (match?.cargo_profesional) {
      setValue("asistentes.0.cargo", match.cargo_profesional);
    }
  }, [empresa?.profesional_asignado, getValues, profesionales, setValue]);

  useEffect(() => {
    if (!empresa || restoringDraft || draftLifecycleSuspended) {
      return;
    }

    const subscription = watch((nextValues) => {
      autosave(step, nextValues as Record<string, unknown>);
    });

    return () => subscription.unsubscribe();
  }, [autosave, draftLifecycleSuspended, empresa, restoringDraft, step, watch]);

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
        setRestoringDraft(true);
        const localDraft = await loadLocal();
        const localEmpresa = localDraft?.empresa ?? currentEmpresa ?? null;
        const draftHydrationAction = resolvePresentacionDraftHydration({
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
            setDraftAlias("presentacion", localDraftSessionId, draftParam);
          }

          restoreFormState(
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
          restoreFormState(
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

        restoreFormState(result.draft.data, result.empresa, result.draft.step);
        if (invisibleDraftPilotEnabled) {
          setDraftAlias("presentacion", localDraftSessionId, result.draft.id);
        }
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        normalizeDraftBootstrapToSessionRoute();
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      if (!hasSessionParam) {
        markRouteHydrated(null);
        setRestoringDraft(false);
        if (!currentEmpresa) {
          reset(getDefaultPresentacionValues(null));
          setStep(0);
          setActiveSectionId("company");
          setCollapsedSections(INITIAL_PRESENTACION_COLLAPSED_SECTIONS);
          setServerError(null);
        }
        return;
      }

      const sessionId = sessionParam?.trim();
      if (!sessionId) {
        setRestoringDraft(false);
        return;
      }

      const routeKey = buildPresentacionSessionRouteKey(
        sessionId,
        explicitNewDraft
      );

      setRestoringDraft(true);

      const persistedDraftId = bootstrapDraftId;
      const localDraft = await loadLocal();
      const localEmpresa = localDraft?.empresa ?? currentEmpresa ?? null;
      const sessionHydrationAction = resolvePresentacionSessionHydration({
        hasEmpresa: Boolean(currentEmpresa),
        persistedDraftId,
        hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        isRouteHydrated: isRouteHydrated(routeKey),
      });

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
          return;
        }

        restoreFormState(localDraft.data, localEmpresa, localDraft.step);
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
          return;
        }

        if (!result.draft || !result.empresa) {
          setServerError(result.error ?? "No se pudo cargar el borrador.");
          markRouteHydrated(routeKey);
          setRestoringDraft(false);
          return;
        }

        restoreFormState(result.draft.data, result.empresa, result.draft.step);
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (sessionHydrationAction === "show_company") {
        reset(getDefaultPresentacionValues(null));
        setStep(0);
        setActiveSectionId("company");
        setCollapsedSections(INITIAL_PRESENTACION_COLLAPSED_SECTIONS);
        setServerError(null);
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (currentEmpresa) {
        reset(
          normalizePresentacionValues(
            getDefaultPresentacionValues(currentEmpresa),
            currentEmpresa
          )
        );
        setStep(0);
        setActiveSectionId("visit");
        setCollapsedSections(INITIAL_PRESENTACION_COLLAPSED_SECTIONS);
        setServerError(null);
      } else {
        reset(getDefaultPresentacionValues(null));
        setStep(0);
        setActiveSectionId("company");
        setCollapsedSections(INITIAL_PRESENTACION_COLLAPSED_SECTIONS);
      }

      markRouteHydrated(routeKey);
      setRestoringDraft(false);
    }

    void hydrateRoute();

    return () => {
      cancelled = true;
    };
  }, [
    bootstrapDraftId,
    draftParam,
    explicitNewDraft,
    finalizedSuccess,
    initialDraftResolution,
    invisibleDraftPilotEnabled,
    beginRouteHydration,
    isRouteHydrated,
    currentRouteHydrationSettled,
    localDraftSessionId,
    loadDraft,
    loadLocal,
    markRouteHydrated,
    normalizeDraftBootstrapToSessionRoute,
    reportInvisibleDraftSuppression,
    reset,
    restoreFormState,
    sessionParam,
    setActiveSectionId,
    setCollapsedSections,
    setRestoringDraft,
  ]);

  useEffect(() => {
    if (
      !activeDraftId ||
      draftParam ||
      !sessionParam?.trim() ||
      restoringDraft ||
      draftLifecycleSuspended ||
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
        "presentacion",
        "session_to_draft_promotion"
      )
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("presentacion", {
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
    markRouteHydrated,
    reportInvisibleDraftSuppression,
    restoringDraft,
    router,
    sessionParam,
  ]);

  useEffect(() => {
    if (draftParam || sessionParam?.trim() || !empresa || finalizedSuccess) {
      return;
    }

    const nextSessionId = localDraftSessionId;
    markRouteHydrated(
      buildPresentacionSessionRouteKey(nextSessionId, explicitNewDraft)
    );
    router.replace(
      buildFormEditorUrl("presentacion", {
        sessionId: nextSessionId,
        isNewDraft: explicitNewDraft,
      }),
      { scroll: false }
    );
  }, [
    draftParam,
    empresa,
    explicitNewDraft,
    finalizedSuccess,
    localDraftSessionId,
    markRouteHydrated,
    router,
    sessionParam,
  ]);

  useEffect(() => {
    if (activeSectionId === "company") {
      return;
    }

    setStep((currentStep) => {
      const nextStep = getPresentacionCompatStepForSection(activeSectionId);
      return currentStep === nextStep ? currentStep : nextStep;
    });
  }, [activeSectionId]);

  function handleSelectEmpresa(nextEmpresa: Empresa) {
    const nextSessionId = sessionParam?.trim() || startNewDraftSession();
    const nextRoute = buildFormEditorUrl("presentacion", {
      sessionId: nextSessionId,
      isNewDraft: explicitNewDraft,
    });

    setEmpresa(nextEmpresa);
    reset(getDefaultPresentacionValues(nextEmpresa));
    setStep(0);
    setActiveSectionId("visit");
    setCollapsedSections(INITIAL_PRESENTACION_COLLAPSED_SECTIONS);
    resumeDraftLifecycle();
    setFinalizedSuccess(null);
    setServerError(null);
    resetFinalizationProgress();
    markRouteHydrated(
      buildPresentacionSessionRouteKey(nextSessionId, explicitNewDraft)
    );

    router.replace(nextRoute, { scroll: false });
    window.setTimeout(() => {
      scrollToSection("visit");
    }, 0);
  }

  function handleSectionSelect(sectionId: PresentacionSectionId) {
    if (sectionId !== "company" && !hasEmpresa) {
      return;
    }

    selectSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) {
      return false;
    }

    const normalizedValues = normalizePresentacionValues(getValues(), empresa);
    const nextValues: PresentacionValues = {
      ...normalizedValues,
      asistentes: normalizePersistedAsistentesForMode(
        normalizedValues.asistentes,
        {
          mode: "reca_plus_agency_advisor",
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
    if (result.draftId && draftParam !== result.draftId) {
      if (invisibleDraftPilotEnabled) {
        reportInvisibleDraftSuppression("save_draft_redirect", "session");
        return true;
      }

      if (
        shouldSuppressDraftNavigationWhileFinalizing(
          "presentacion",
          "save_draft_redirect"
        )
      ) {
        return true;
      }

      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("presentacion", {
          draftId: result.draftId,
        }),
        { scroll: false }
      );
    }

    return true;
  }

  function handlePrepareSubmit(data: PresentacionValues) {
    if (!isDocumentEditable || !empresa) {
      return;
    }

    const normalizedValues = normalizePresentacionValues(data, empresa);
    const normalizedData: PresentacionValues = {
      ...normalizedValues,
      asistentes: normalizePersistedAsistentesForMode(
        normalizedValues.asistentes,
        {
          mode: "reca_plus_agency_advisor",
          profesionalAsignado: empresa?.profesional_asignado,
        }
      ),
    };

    setServerError(null);
    resetFinalizationProgress();
    setPendingSubmitValues(normalizedData);
    setSubmitConfirmOpen(true);
  }

  async function confirmSubmit(
    retryAction: LongFormFinalizationRetryAction = "submit"
  ) {
    if (!isDocumentEditable || !empresa) {
      return;
    }

    if (!pendingSubmitValues) {
      clearFinalizationUiLock("presentacion");
      resumeDraftLifecycle();
      setSubmitConfirmOpen(false);
      resetFinalizationProgress();
      return;
    }

    beginFinalizationUiLock("presentacion");
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
        local_draft_session_id: localDraftSessionId,
        ...(activeDraftId ? { draft_id: activeDraftId } : {}),
      };
      const requestHash = buildFinalizationRequestHash(
        "presentacion",
        pendingSubmitValues as Record<string, unknown>
      );
      let responsePayload: { sheetLink: string; pdfLink?: string };

      if (retryAction === "submit") {
        updateFinalizationStage("preparando_envio");
        const requestBody = JSON.stringify({
          ...pendingSubmitValues,
          empresa,
          finalization_identity: finalizationIdentity,
        });
        updateFinalizationStage("enviando_al_servidor");
        const responsePromise = fetch("/api/formularios/presentacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        updateFinalizationStage("esperando_respuesta");
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "presentacion",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
          responsePromise,
        });
      } else {
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "presentacion",
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
      clearFinalizationUiLock("presentacion");
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
          "[presentacion.finalization_cleanup] failed (non-fatal)",
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

  function onInvalid(nextErrors: FieldErrors<PresentacionValues>) {
    const validationTarget = getPresentacionValidationTarget(nextErrors);
    resetFinalizationProgress();
    navigateToValidationTarget(validationTarget);

    if (!validationTarget || !isDocumentEditable || !empresa) {
      return;
    }

    const normalizedValues = normalizePresentacionValues(getValues(), empresa);
    const nextValues: PresentacionValues = {
      ...normalizedValues,
      asistentes: normalizePersistedAsistentesForMode(
        normalizedValues.asistentes,
        {
          mode: "reca_plus_agency_advisor",
          profesionalAsignado: empresa?.profesional_asignado,
        }
      ),
    };

    checkpointInvalidSubmission({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          getPresentacionCompatStepForSection(validationTarget.sectionId),
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
            "presentacion",
            "invalid_submission_promotion"
          )
        ) {
          return;
        }

        markRouteHydrated(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("presentacion", {
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
  }

  function handleStartNewForm() {
    startNewDraftSession();
    clearEmpresa();
    setFinalizedSuccess(null);
    clearFinalizationUiLock("presentacion");
    resumeDraftLifecycle();
    setServerError(null);
    resetFinalizationProgress();
    reset(getDefaultPresentacionValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_PRESENTACION_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("presentacion", { isNewDraft: true }));
  }

  function handleFillTestData() {
    if (!isDocumentEditable) {
      return;
    }

    const nextValues = buildPresentacionManualTestValues(empresa);
    reset(nextValues);
    setServerError(null);
    void autosave(step, nextValues as Record<string, unknown>);
  }

  function handleReturnToHub() {
    void returnToHubTab("/hub");
  }

  if (finalizedSuccess) {
    return {
      mode: "success",
      successState: {
        title: "¡Formulario guardado!",
        message: (
          <>
            La presentación del programa para{" "}
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
        title: "Presentación / Reactivación del Programa",
        companyName: empresa?.nombre_empresa,
        onBack: () => router.push("/hub"),
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as PresentacionSectionId),
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
        loadingOverlayPlacement: "viewport",
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
              disabled={isSubmitting || isFinalizing || !isDocumentEditable}
              isSubmitting={isSubmitting}
              isFinalizing={isFinalizing}
            />
          </div>
        ),
        onFormBlurCapture: handleFormBlurCapture,
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
          onSelectEmpresa: handleSelectEmpresa,
          collapsed: collapsedSections.company,
          status: sectionStatuses.company,
          sectionRef: companyRef,
          onToggle: () => toggleSection("company"),
          onFocusCapture: () => setActiveSectionId("company"),
        },
        visit: {
          isDocumentEditable,
          register,
          errors,
          collapsed: collapsedSections.visit,
          status: sectionStatuses.visit,
          sectionRef: visitRef,
          onToggle: () => toggleSection("visit"),
          onFocusCapture: () => setActiveSectionId("visit"),
        },
        motivation: {
          isDocumentEditable,
          register,
          errors,
          motivacion: motivacion ?? [],
          collapsed: collapsedSections.motivation,
          status: sectionStatuses.motivation,
          sectionRef: motivationRef,
          onToggle: () => toggleSection("motivation"),
          onFocusCapture: () => setActiveSectionId("motivation"),
        },
        agreements: {
          isDocumentEditable,
          register,
          errors,
          acuerdos: acuerdos ?? "",
          getValues,
          setValue,
          collapsed: collapsedSections.agreements,
          status: sectionStatuses.agreements,
          sectionRef: agreementsRef,
          onToggle: () => toggleSection("agreements"),
          onFocusCapture: () => setActiveSectionId("agreements"),
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
          if (isFinalizing) {
            return;
          }

          clearFinalizationUiLock("presentacion");
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
