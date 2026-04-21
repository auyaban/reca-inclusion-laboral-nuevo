"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { InduccionOrganizacionalFormPresenterProps } from "@/components/forms/induccionOrganizacional/InduccionOrganizacionalFormPresenter";
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
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";
import { useInvisibleDraftTelemetry } from "@/hooks/useInvisibleDraftTelemetry";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import {
  normalizeInvisibleDraftRouteParams,
  setDraftAlias,
} from "@/lib/drafts";
import { NO_INITIAL_DRAFT_RESOLUTION, type InitialDraftResolution } from "@/lib/drafts/initialDraftResolution";
import { isInvisibleDraftPilotEnabled } from "@/lib/drafts/invisibleDraftConfig";
import { resolveInvisibleDraftBootstrapId } from "@/lib/drafts/invisibleDrafts";
import { returnToHubTab } from "@/lib/actaTabs";
import {
  FinalizationConfirmationError,
  waitForFinalizationConfirmation,
} from "@/lib/finalization/finalizationConfirmation";
import {
  beginFinalizationUiLock,
  clearFinalizationUiLock,
  shouldSuppressDraftNavigationWhileFinalizing,
} from "@/lib/finalization/finalizationUiLock";
import { buildInduccionOrganizacionalRequestHash } from "@/lib/finalization/induccionOrganizacionalRequest";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import {
  buildInduccionOrganizacionalSessionRouteKey,
  resolveInduccionOrganizacionalDraftHydration,
  resolveInduccionOrganizacionalSessionHydration,
} from "@/lib/induccionOrganizacionalHydration";
import type { LongFormFinalizedSuccess } from "@/lib/longFormSuccess";
import { resolveLongFormDraftSource } from "@/lib/longFormHydration";
import {
  getInitialLongFormFinalizationProgress,
  shouldRenderInlineLongFormFinalizationFeedback,
  type LongFormFinalizationRetryAction,
  type LongFormFinalizationProgress,
} from "@/lib/longFormFinalization";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  buildInduccionOrganizacionalManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import {
  getDefaultInduccionOrganizacionalValues,
  normalizeInduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";
import {
  getInduccionOrganizacionalCompatStepForSection,
  getInduccionOrganizacionalSectionIdForStep,
  INITIAL_INDUCCION_ORGANIZACIONAL_COLLAPSED_SECTIONS,
  INDUCCION_ORGANIZACIONAL_SECTION_LABELS,
  isInduccionOrganizacionalAttendeesSectionComplete,
  isInduccionOrganizacionalDevelopmentSectionComplete,
  isInduccionOrganizacionalObservacionesSectionComplete,
  isInduccionOrganizacionalRecommendationsSectionComplete,
  isInduccionOrganizacionalVinculadoSectionComplete,
  type InduccionOrganizacionalSectionId,
} from "@/lib/induccionOrganizacionalSections";
import { getInduccionOrganizacionalValidationTarget } from "@/lib/induccionOrganizacionalValidationNavigation";
import {
  induccionOrganizacionalSchema,
  type InduccionOrganizacionalValues,
} from "@/lib/validations/induccionOrganizacional";
import type { UsuarioRecaRecord } from "@/lib/usuariosReca";

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
  presenterProps: InduccionOrganizacionalFormPresenterProps;
};

type FinalizedSuccessState = LongFormFinalizedSuccess;

export type InduccionOrganizacionalFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

const SECTION_LABELS: Record<InduccionOrganizacionalSectionId, string> =
  INDUCCION_ORGANIZACIONAL_SECTION_LABELS;

type UseInduccionOrganizacionalFormStateOptions = {
  initialDraftResolution?: InitialDraftResolution;
};

export function useInduccionOrganizacionalFormState({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: UseInduccionOrganizacionalFormStateOptions = {}): InduccionOrganizacionalFormState {
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
  const invisibleDraftPilotEnabled = isInvisibleDraftPilotEnabled(
    "induccion-organizacional"
  );
  const bootstrapDraftId = useMemo(
    () =>
      resolveInvisibleDraftBootstrapId({
        formSlug: "induccion-organizacional",
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
    useState<InduccionOrganizacionalValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] =
    useState<LongFormFinalizationProgress>(
      getInitialLongFormFinalizationProgress
    );
  const [loadedVinculadoSnapshot, setLoadedVinculadoSnapshot] =
    useState<UsuarioRecaRecord | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const vinculadoRef = useRef<HTMLElement | null>(null);
  const desarrolloRef = useRef<HTMLElement | null>(null);
  const recomendacionesRef = useRef<HTMLElement | null>(null);
  const observacionesRef = useRef<HTMLElement | null>(null);
  const asistentesRef = useRef<HTMLElement | null>(null);
  const finalizationFeedbackRef = useRef<HTMLDivElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();

  const draftController = useLongFormDraftController({
    slug: "induccion-organizacional",
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
    loadDraft,
    saveDraft,
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
    checkpointDraft,
    ensureDraftIdentity,
  } = draftController;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InduccionOrganizacionalValues>({
    resolver: zodResolver(
      induccionOrganizacionalSchema as never
    ) as unknown as Resolver<InduccionOrganizacionalValues>,
    defaultValues: getDefaultInduccionOrganizacionalValues(empresa),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [
    fechaVisita = "",
    modalidad = "",
    nitEmpresa = "",
    vinculado = getDefaultInduccionOrganizacionalValues(empresa).vinculado,
    section3 = getDefaultInduccionOrganizacionalValues(empresa).section_3,
    section4 = getDefaultInduccionOrganizacionalValues(empresa).section_4,
    observaciones = "",
    asistentes = [],
  ] = useWatch({
    control,
    name: [
      "fecha_visita",
      "modalidad",
      "nit_empresa",
      "vinculado",
      "section_3",
      "section_4",
      "section_5.observaciones",
      "asistentes",
    ] as const,
  }) as [
    InduccionOrganizacionalValues["fecha_visita"] | undefined,
    InduccionOrganizacionalValues["modalidad"] | undefined,
    InduccionOrganizacionalValues["nit_empresa"] | undefined,
    InduccionOrganizacionalValues["vinculado"] | undefined,
    InduccionOrganizacionalValues["section_3"] | undefined,
    InduccionOrganizacionalValues["section_4"] | undefined,
    InduccionOrganizacionalValues["section_5"]["observaciones"] | undefined,
    InduccionOrganizacionalValues["asistentes"] | undefined,
  ];

  const formTabLabel = getFormTabLabel("induccion-organizacional");
  const hasEmpresa = Boolean(empresa);
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
    formSlug: "induccion-organizacional",
    empresa,
    formData: { asistentes },
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
    formSlug: "induccion-organizacional",
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
      vinculado: vinculadoRef,
      desarrollo: desarrolloRef,
      recomendaciones: recomendacionesRef,
      observaciones: observacionesRef,
      asistentes: asistentesRef,
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
  } = useLongFormSections<InduccionOrganizacionalSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_INDUCCION_ORGANIZACIONAL_COLLAPSED_SECTIONS,
    sectionRefs,
  });

  const sectionStatuses = useMemo(() => {
    const validationTarget =
      getInduccionOrganizacionalValidationTarget(errors)?.sectionId ?? null;

    function getStatus(
      id: InduccionOrganizacionalSectionId,
      options?: { completed?: boolean; disabled?: boolean }
    ): LongFormSectionStatus {
      if (activeSectionId === id) return "active";
      if (options?.disabled) return "disabled";
      if (validationTarget === id) return "error";
      if (options?.completed) return "completed";
      return "idle";
    }

    return {
      company: getStatus("company", { completed: hasEmpresa }),
      vinculado: getStatus("vinculado", {
        completed: hasEmpresa && isInduccionOrganizacionalVinculadoSectionComplete(vinculado),
        disabled: !hasEmpresa,
      }),
      desarrollo: getStatus("desarrollo", {
        completed: hasEmpresa && isInduccionOrganizacionalDevelopmentSectionComplete(section3),
        disabled: !hasEmpresa,
      }),
      recomendaciones: getStatus("recomendaciones", {
        completed: hasEmpresa && isInduccionOrganizacionalRecommendationsSectionComplete(section4),
        disabled: !hasEmpresa,
      }),
      observaciones: getStatus("observaciones", {
        completed: hasEmpresa && isInduccionOrganizacionalObservacionesSectionComplete({
          observaciones,
        }),
        disabled: !hasEmpresa,
      }),
      asistentes: getStatus("asistentes", {
        completed: hasEmpresa && isInduccionOrganizacionalAttendeesSectionComplete(asistentes),
        disabled: !hasEmpresa,
      }),
    };
  }, [activeSectionId, asistentes, errors, hasEmpresa, observaciones, section3, section4, vinculado]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () => [
      {
        id: "company",
        label: SECTION_LABELS.company,
        shortLabel: "Empresa",
        status: sectionStatuses.company,
      },
      {
        id: "vinculado",
        label: SECTION_LABELS.vinculado,
        shortLabel: "Vinculado",
        status: sectionStatuses.vinculado,
      },
      {
        id: "desarrollo",
        label: SECTION_LABELS.desarrollo,
        shortLabel: "Desarrollo",
        status: sectionStatuses.desarrollo,
      },
      {
        id: "recomendaciones",
        label: SECTION_LABELS.recomendaciones,
        shortLabel: "Ajustes",
        status: sectionStatuses.recomendaciones,
      },
      {
        id: "observaciones",
        label: SECTION_LABELS.observaciones,
        shortLabel: "Obs.",
        status: sectionStatuses.observaciones,
      },
      {
        id: "asistentes",
        label: SECTION_LABELS.asistentes,
        shortLabel: "Asistentes",
        status: sectionStatuses.asistentes,
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
      buildFormEditorUrl("induccion-organizacional", {
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
    (
      validationTarget: ReturnType<typeof getInduccionOrganizacionalValidationTarget>
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
      if (finalizedSuccess) {
        setRestoringDraft(false);
        return;
      }

      if (draftParam) {
        const routeKey = `draft:${draftParam}`;
        setRestoringDraft(true);
        const localDraft = await loadLocal();
        const draftSource = resolveLongFormDraftSource({
          hydrationAction: resolveInduccionOrganizacionalDraftHydration({
            isRouteHydrated: isRouteHydrated(routeKey),
            hasRestorableLocalDraft: Boolean(localDraft && localDraft.empresa),
          }),
          localDraft,
          localEmpresa: localDraft?.empresa ?? null,
          initialDraftResolution,
        });

        if (draftSource.action === "skip") {
          setRestoringDraft(false);
          return;
        }

        if (draftSource.action === "restore_local") {
          if (!cancelled) {
            if (invisibleDraftPilotEnabled) {
              setDraftAlias(
                "induccion-organizacional",
                localDraftSessionId,
                draftParam
              );
            }
            const nextValues = normalizeInduccionOrganizacionalValues(
              draftSource.draft.data,
              draftSource.empresa
            );
            setEmpresa(draftSource.empresa);
            reset(nextValues);
            setLoadedVinculadoSnapshot(null);
            setStep(draftSource.draft.step);
            setActiveSectionId(
              getInduccionOrganizacionalSectionIdForStep(draftSource.draft.step)
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
          const nextValues = normalizeInduccionOrganizacionalValues(
            draftSource.draft.data,
            draftSource.empresa
          );
          setEmpresa(draftSource.empresa);
          reset(nextValues);
          setLoadedVinculadoSnapshot(null);
          setStep(draftSource.draft.step);
          setActiveSectionId(
            getInduccionOrganizacionalSectionIdForStep(draftSource.draft.step)
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

        const nextValues = normalizeInduccionOrganizacionalValues(
          result.draft.data,
          result.empresa
        );
        setEmpresa(result.empresa);
        reset(nextValues);
        setLoadedVinculadoSnapshot(null);
        setStep(result.draft.step);
        setActiveSectionId(
          getInduccionOrganizacionalSectionIdForStep(result.draft.step)
        );
        if (invisibleDraftPilotEnabled) {
          setDraftAlias(
            "induccion-organizacional",
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
      const routeKey = buildInduccionOrganizacionalSessionRouteKey(
        sessionId,
        false
      );

      if (!empresa && !hasSessionParam) {
        reset(getDefaultInduccionOrganizacionalValues(null));
        setLoadedVinculadoSnapshot(null);
        setStep(0);
        setActiveSectionId("company");
        markRouteHydrated(null);
        setRestoringDraft(false);
        return;
      }

      if (!hasSessionParam && sessionId.trim()) {
        router.replace(
          buildFormEditorUrl("induccion-organizacional", {
            sessionId,
          }),
          { scroll: false }
        );
      }

      const persistedDraftId = bootstrapDraftId;
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = localDraft?.empresa ?? empresa ?? null;
      const sessionHydrationAction =
        resolveInduccionOrganizacionalSessionHydration({
          hasEmpresa: Boolean(empresa),
          persistedDraftId,
          hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
          isRouteHydrated: isRouteHydrated(routeKey),
        });

      if (sessionHydrationAction === "show_company") {
        reset(getDefaultInduccionOrganizacionalValues(null));
        setLoadedVinculadoSnapshot(null);
        setStep(0);
        setActiveSectionId("company");
        setRestoringDraft(false);
        return;
      }

      if (sessionHydrationAction === "skip") {
        setRestoringDraft(false);
        return;
      }

      if (
        sessionHydrationAction === "restore_local" &&
        localDraft &&
        localEmpresa
      ) {
        if (!cancelled) {
          const nextValues = normalizeInduccionOrganizacionalValues(
            localDraft.data,
            localEmpresa
          );
          setEmpresa(localEmpresa);
          reset(nextValues);
          setLoadedVinculadoSnapshot(null);
          setStep(localDraft.step);
          setActiveSectionId(
            getInduccionOrganizacionalSectionIdForStep(localDraft.step)
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

        const nextValues = normalizeInduccionOrganizacionalValues(
          result.draft.data,
          result.empresa
        );
        setEmpresa(result.empresa);
        reset(nextValues);
        setLoadedVinculadoSnapshot(null);
        setStep(result.draft.step);
        setActiveSectionId(
          getInduccionOrganizacionalSectionIdForStep(result.draft.step)
        );
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (!empresa) {
        reset(getDefaultInduccionOrganizacionalValues(null));
        setLoadedVinculadoSnapshot(null);
        setStep(0);
        setActiveSectionId("company");
        setRestoringDraft(false);
        return;
      }

      reset(getDefaultInduccionOrganizacionalValues(empresa));
      setLoadedVinculadoSnapshot(null);
      setStep(0);
      setActiveSectionId("vinculado");
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
    empresa,
    initialDraftResolution,
    invisibleDraftPilotEnabled,
    localDraftSessionId,
    loadDraft,
    loadLocal,
    isRouteHydrated,
    markRouteHydrated,
    normalizeDraftBootstrapToSessionRoute,
    reportInvisibleDraftSuppression,
    reset,
    router,
    setActiveSectionId,
    setEmpresa,
    setRestoringDraft,
    sessionParam,
    finalizedSuccess,
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
        "induccion-organizacional",
        "session_to_draft_promotion"
      )
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("induccion-organizacional", {
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
    if (activeSectionId === "company") return;
    const nextStep = getInduccionOrganizacionalCompatStepForSection(activeSectionId);
    if (nextStep !== step) {
      setStep(nextStep);
    }
  }, [activeSectionId, step]);

  const handleSelectEmpresa = useCallback(
    (nextEmpresa: Empresa) => {
      const nextSessionId = sessionParam?.trim() || startNewDraftSession();
      setEmpresa(nextEmpresa);
      const nextValues = getDefaultInduccionOrganizacionalValues(nextEmpresa);
      reset(nextValues);
      setLoadedVinculadoSnapshot(null);
      setStep(0);
      setActiveSectionId("vinculado");
      setCollapsedSections(INITIAL_INDUCCION_ORGANIZACIONAL_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setFinalizedSuccess(null);
      setServerError(null);
      resetFinalizationProgress();
      markRouteHydrated(
        buildInduccionOrganizacionalSessionRouteKey(nextSessionId, false)
      );
      router.replace(
        buildFormEditorUrl("induccion-organizacional", {
          sessionId: nextSessionId,
        }),
        { scroll: false }
      );
      window.requestAnimationFrame(() => {
        scrollToSection("vinculado");
      });
    },
    [
      markRouteHydrated,
      reset,
      resetFinalizationProgress,
      resumeDraftLifecycle,
      router,
      scrollToSection,
      sessionParam,
      setActiveSectionId,
      setCollapsedSections,
      setEmpresa,
      startNewDraftSession,
    ]
  );

  function handleSectionSelect(sectionId: InduccionOrganizacionalSectionId) {
    if (sectionId !== "company" && !hasEmpresa) {
      return;
    }

    selectSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) {
      return false;
    }

    const nextValues = normalizeInduccionOrganizacionalValues(getValues(), empresa);
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
          "induccion-organizacional",
          "save_draft_redirect"
        )
      ) {
        return true;
      }

      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("induccion-organizacional", {
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

    const nextValues = buildInduccionOrganizacionalManualTestValues(empresa);
    reset(nextValues);
    setLoadedVinculadoSnapshot(null);
    setServerError(null);
    resetFinalizationProgress();
    void autosave(step, nextValues as Record<string, unknown>);
  }

  function handlePrepareSubmit(data: InduccionOrganizacionalValues) {
    if (!isDocumentEditable || !empresa) {
      return;
    }

    setServerError(null);
    resetFinalizationProgress();
    setPendingSubmitValues(normalizeInduccionOrganizacionalValues(data, empresa));
    setSubmitConfirmOpen(true);
  }

  async function confirmSubmit(
    retryAction: LongFormFinalizationRetryAction = "submit"
  ) {
    if (!isDocumentEditable || !empresa) {
      return;
    }

    if (!pendingSubmitValues) {
      clearFinalizationUiLock("induccion-organizacional");
      resumeDraftLifecycle();
      setSubmitConfirmOpen(false);
      resetFinalizationProgress();
      return;
    }

    beginFinalizationUiLock("induccion-organizacional");
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
      const requestHash =
        buildInduccionOrganizacionalRequestHash(pendingSubmitValues);
      let responsePayload: { sheetLink: string; pdfLink?: string };

      if (retryAction === "submit") {
        updateFinalizationStage("preparando_envio");
        const requestBody = JSON.stringify({
          empresa,
          formData: pendingSubmitValues,
          finalization_identity: finalizationIdentity,
        });
        updateFinalizationStage("enviando_al_servidor");
        const responsePromise = fetch("/api/formularios/induccion-organizacional", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        updateFinalizationStage("esperando_respuesta");
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "induccion-organizacional",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
          responsePromise,
        });
      } else {
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "induccion-organizacional",
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
      clearFinalizationUiLock("induccion-organizacional");
      try {
        await clearDraftAfterSuccess();
      } catch (cleanupError) {
        console.error(
          "[induccion-organizacional.finalization_cleanup] failed (non-fatal)",
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

  function onInvalid(nextErrors: FieldErrors<InduccionOrganizacionalValues>) {
    const validationTarget = getInduccionOrganizacionalValidationTarget(nextErrors);
    resetFinalizationProgress();
    navigateToValidationTarget(validationTarget);

    if (!validationTarget || !isDocumentEditable || !empresa) {
      return;
    }

    const nextValues = normalizeInduccionOrganizacionalValues(getValues(), empresa);

    checkpointInvalidSubmission({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          getInduccionOrganizacionalCompatStepForSection(validationTarget.sectionId),
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
            "induccion-organizacional",
            "invalid_submission_promotion"
          )
        ) {
          return;
        }

        markRouteHydrated(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("induccion-organizacional", {
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
    startNewDraftSession();
    clearEmpresa();
    setLoadedVinculadoSnapshot(null);
    setFinalizedSuccess(null);
    clearFinalizationUiLock("induccion-organizacional");
    resumeDraftLifecycle();
    setServerError(null);
    resetFinalizationProgress();
    reset(getDefaultInduccionOrganizacionalValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_INDUCCION_ORGANIZACIONAL_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("induccion-organizacional", { isNewDraft: true }));
  }

  if (finalizedSuccess) {
    return {
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: (
          <>
            La induccion organizacional para{" "}
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

  const hasInvisibleDraftContext = Boolean(
    draftParam || (sessionParam?.trim() && bootstrapDraftId)
  );

  if (
    (draftParam && loadingDraft) ||
    (hasInvisibleDraftContext && restoringDraft)
  ) {
    return { mode: "loading" };
  }

  if (hasInvisibleDraftContext && !empresa && !restoringDraft && serverError) {
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
        title: "Induccion Organizacional",
        companyName: empresa?.nombre_empresa,
        onBack: handleReturnToHub,
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as InduccionOrganizacionalSectionId),
        serverError,
        finalizationFeedback:
          shouldRenderInlineLongFormFinalizationFeedback({
            progress: finalizationProgress,
            dialogOpen: submitConfirmOpen || isFinalizing,
          }) ? (
            <LongFormFinalizationStatus progress={finalizationProgress} />
          ) : null,
        finalizationFeedbackRef,
        onFormBlurCapture: handleFormBlurCapture,
        formProps: {
          onSubmit: handleSubmit(handlePrepareSubmit, onInvalid),
          noValidate: true,
        },
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
          onSelectEmpresa: handleSelectEmpresa,
          collapsed: collapsedSections.company,
          status: sectionStatuses.company,
          sectionRef: companyRef,
          onToggle: () => toggleSection("company"),
          onFocusCapture: () => setActiveSectionId("company"),
        },
        vinculado: {
          register,
          setValue,
          errors,
          vinculado,
          loadedSnapshot: loadedVinculadoSnapshot,
          onLoadedSnapshotChange: setLoadedVinculadoSnapshot,
          collapsed: collapsedSections.vinculado,
          status: sectionStatuses.vinculado,
          sectionRef: vinculadoRef,
          onToggle: () => toggleSection("vinculado"),
          onFocusCapture: () => setActiveSectionId("vinculado"),
        },
        development: {
          register,
          setValue,
          errors,
          collapsed: collapsedSections.desarrollo,
          status: sectionStatuses.desarrollo,
          sectionRef: desarrolloRef,
          onToggle: () => toggleSection("desarrollo"),
          onFocusCapture: () => setActiveSectionId("desarrollo"),
        },
        recommendations: {
          register,
          setValue,
          errors,
          section4,
          collapsed: collapsedSections.recomendaciones,
          status: sectionStatuses.recomendaciones,
          sectionRef: recomendacionesRef,
          onToggle: () => toggleSection("recomendaciones"),
          onFocusCapture: () => setActiveSectionId("recomendaciones"),
        },
        observations: {
          register,
          getValues,
          setValue,
          errors,
          value: observaciones,
          collapsed: collapsedSections.observaciones,
          status: sectionStatuses.observaciones,
          sectionRef: observacionesRef,
          onToggle: () => toggleSection("observaciones"),
          onFocusCapture: () => setActiveSectionId("observaciones"),
        },
        attendees: {
          isDocumentEditable,
          control,
          register,
          setValue,
          errors,
          profesionalAsignado: empresa?.profesional_asignado,
          profesionales,
          collapsed: collapsedSections.asistentes,
          status: sectionStatuses.asistentes,
          sectionRef: asistentesRef,
          onToggle: () => toggleSection("asistentes"),
          onFocusCapture: () => setActiveSectionId("asistentes"),
        },
      },
      submitDialog: {
        open: submitConfirmOpen || isFinalizing,
        description:
          "Esta accion publicara el acta en Google Sheets. Confirma solo cuando hayas revisado la informacion.",
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

          clearFinalizationUiLock("induccion-organizacional");
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
