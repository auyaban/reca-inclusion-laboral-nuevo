"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { InduccionOperativaFormPresenterProps } from "@/components/forms/induccionOperativa/InduccionOperativaFormPresenter";
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
import { useInvisibleDraftTelemetry } from "@/hooks/useInvisibleDraftTelemetry";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { returnToHubTab } from "@/lib/actaTabs";
import { setDraftAlias } from "@/lib/drafts";
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
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import {
  buildInduccionOperativaSessionRouteKey,
  resolveInduccionOperativaDraftHydration,
  resolveInduccionOperativaSessionHydration,
} from "@/lib/induccionOperativaHydration";
import type { LongFormFinalizedSuccess } from "@/lib/longFormSuccess";
import { resolveLongFormDraftSource } from "@/lib/longFormHydration";
import {
  getInitialLongFormFinalizationProgress,
  type LongFormFinalizationRetryAction,
  type LongFormFinalizationProgress,
} from "@/lib/longFormFinalization";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  buildInduccionOperativaManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import {
  buildInduccionOperativaRequestHash,
  getDefaultInduccionOperativaValues,
  normalizeInduccionOperativaValues,
} from "@/lib/induccionOperativa";
import {
  getInduccionOperativaCompatStepForSection,
  getInduccionOperativaSectionIdForStep,
  INITIAL_INDUCCION_OPERATIVA_COLLAPSED_SECTIONS,
  INDUCCION_OPERATIVA_SECTION_LABELS,
  isInduccionOperativaAdjustmentsSectionComplete,
  isInduccionOperativaAttendeesSectionComplete,
  isInduccionOperativaDevelopmentSectionComplete,
  isInduccionOperativaFollowupSectionComplete,
  isInduccionOperativaObservationsSectionComplete,
  isInduccionOperativaSocioemotionalSectionComplete,
  isInduccionOperativaSupportSectionComplete,
  isInduccionOperativaVinculadoSectionComplete,
  type InduccionOperativaSectionId,
} from "@/lib/induccionOperativaSections";
import { getInduccionOperativaValidationTarget } from "@/lib/induccionOperativaValidationNavigation";
import {
  induccionOperativaSchema,
  type InduccionOperativaValues,
} from "@/lib/validations/induccionOperativa";
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
  presenterProps: InduccionOperativaFormPresenterProps;
};

type FinalizedSuccessState = LongFormFinalizedSuccess;

export type InduccionOperativaFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

type UseInduccionOperativaFormStateOptions = {
  initialDraftResolution?: InitialDraftResolution;
};

const SECTION_LABELS: Record<InduccionOperativaSectionId, string> =
  INDUCCION_OPERATIVA_SECTION_LABELS;

export function useInduccionOperativaFormState(
  {
    initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
  }: UseInduccionOperativaFormStateOptions = {}
): InduccionOperativaFormState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const clearEmpresa = useEmpresaStore((state) => state.clearEmpresa);
  const draftParam = searchParams.get("draft");
  const sessionParam = searchParams.get("session");
  const invisibleDraftPilotEnabled = isInvisibleDraftPilotEnabled(
    "induccion-operativa"
  );
  const bootstrapDraftId = useMemo(
    () =>
      resolveInvisibleDraftBootstrapId({
        formSlug: "induccion-operativa",
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
    useState<InduccionOperativaValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] =
    useState<LongFormFinalizationProgress>(
      getInitialLongFormFinalizationProgress
    );
  const [loadedVinculadoSnapshot, setLoadedVinculadoSnapshot] =
    useState<UsuarioRecaRecord | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const vinculadoRef = useRef<HTMLElement | null>(null);
  const developmentRef = useRef<HTMLElement | null>(null);
  const socioemotionalRef = useRef<HTMLElement | null>(null);
  const supportRef = useRef<HTMLElement | null>(null);
  const adjustmentsRef = useRef<HTMLElement | null>(null);
  const followupRef = useRef<HTMLElement | null>(null);
  const observationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const finalizationFeedbackRef = useRef<HTMLDivElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();

  const draftController = useLongFormDraftController({
    slug: "induccion-operativa",
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
  } = useForm<InduccionOperativaValues>({
    resolver: zodResolver(
      induccionOperativaSchema as never
    ) as unknown as Resolver<InduccionOperativaValues>,
    defaultValues: getDefaultInduccionOperativaValues(empresa),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [
    fechaVisita = "",
    modalidad = "",
    nitEmpresa = "",
    vinculado = getDefaultInduccionOperativaValues(empresa).vinculado,
    section3 = getDefaultInduccionOperativaValues(empresa).section_3,
    section4 = getDefaultInduccionOperativaValues(empresa).section_4,
    section5 = getDefaultInduccionOperativaValues(empresa).section_5,
    ajustesRequeridos = "",
    fechaPrimerSeguimiento = "",
    observacionesRecomendaciones = "",
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
      "section_5",
      "ajustes_requeridos",
      "fecha_primer_seguimiento",
      "observaciones_recomendaciones",
      "asistentes",
    ] as const,
  }) as [
    InduccionOperativaValues["fecha_visita"] | undefined,
    InduccionOperativaValues["modalidad"] | undefined,
    InduccionOperativaValues["nit_empresa"] | undefined,
    InduccionOperativaValues["vinculado"] | undefined,
    InduccionOperativaValues["section_3"] | undefined,
    InduccionOperativaValues["section_4"] | undefined,
    InduccionOperativaValues["section_5"] | undefined,
    InduccionOperativaValues["ajustes_requeridos"] | undefined,
    InduccionOperativaValues["fecha_primer_seguimiento"] | undefined,
    InduccionOperativaValues["observaciones_recomendaciones"] | undefined,
    InduccionOperativaValues["asistentes"] | undefined,
  ];

  const formTabLabel = getFormTabLabel("induccion-operativa");
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const showTestFillAction = isManualTestFillEnabled();
  const showTakeoverPrompt = isReadonlyDraft;

  const { reportInvisibleDraftSuppression } = useInvisibleDraftTelemetry({
    formSlug: "induccion-operativa",
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
      development: developmentRef,
      socioemotional: socioemotionalRef,
      support: supportRef,
      adjustments: adjustmentsRef,
      followup: followupRef,
      observations: observationsRef,
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
  } = useLongFormSections<InduccionOperativaSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_INDUCCION_OPERATIVA_COLLAPSED_SECTIONS,
    sectionRefs,
  });

  const sectionStatuses = useMemo(() => {
    const validationTarget =
      getInduccionOperativaValidationTarget(errors)?.sectionId ?? null;

    function getStatus(
      id: InduccionOperativaSectionId,
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
        completed: hasEmpresa && isInduccionOperativaVinculadoSectionComplete(vinculado),
        disabled: !hasEmpresa,
      }),
      development: getStatus("development", {
        completed: hasEmpresa && isInduccionOperativaDevelopmentSectionComplete(section3),
        disabled: !hasEmpresa,
      }),
      socioemotional: getStatus("socioemotional", {
        completed: hasEmpresa && isInduccionOperativaSocioemotionalSectionComplete(section4),
        disabled: !hasEmpresa,
      }),
      support: getStatus("support", {
        completed: hasEmpresa && isInduccionOperativaSupportSectionComplete(section5),
        disabled: !hasEmpresa,
      }),
      adjustments: getStatus("adjustments", {
        completed: hasEmpresa && isInduccionOperativaAdjustmentsSectionComplete({
          ajustes_requeridos: ajustesRequeridos,
        }),
        disabled: !hasEmpresa,
      }),
      followup: getStatus("followup", {
        completed: hasEmpresa && isInduccionOperativaFollowupSectionComplete({
          fecha_primer_seguimiento: fechaPrimerSeguimiento,
        }),
        disabled: !hasEmpresa,
      }),
      observations: getStatus("observations", {
        completed: hasEmpresa && isInduccionOperativaObservationsSectionComplete({
          observaciones_recomendaciones: observacionesRecomendaciones,
        }),
        disabled: !hasEmpresa,
      }),
      attendees: getStatus("attendees", {
        completed: hasEmpresa && isInduccionOperativaAttendeesSectionComplete(asistentes),
        disabled: !hasEmpresa,
      }),
    };
  }, [
    activeSectionId,
    ajustesRequeridos,
    asistentes,
    errors,
    fechaPrimerSeguimiento,
    hasEmpresa,
    observacionesRecomendaciones,
    section3,
    section4,
    section5,
    vinculado,
  ]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () => [
      { id: "company", label: SECTION_LABELS.company, shortLabel: "Empresa", status: sectionStatuses.company },
      { id: "vinculado", label: SECTION_LABELS.vinculado, shortLabel: "Vinculado", status: sectionStatuses.vinculado },
      { id: "development", label: SECTION_LABELS.development, shortLabel: "Desarrollo", status: sectionStatuses.development },
      { id: "socioemotional", label: SECTION_LABELS.socioemotional, shortLabel: "Socio.", status: sectionStatuses.socioemotional },
      { id: "support", label: SECTION_LABELS.support, shortLabel: "Apoyo", status: sectionStatuses.support },
      { id: "adjustments", label: SECTION_LABELS.adjustments, shortLabel: "Ajustes", status: sectionStatuses.adjustments },
      { id: "followup", label: SECTION_LABELS.followup, shortLabel: "Seguimiento", status: sectionStatuses.followup },
      { id: "observations", label: SECTION_LABELS.observations, shortLabel: "Obs.", status: sectionStatuses.observations },
      { id: "attendees", label: SECTION_LABELS.attendees, shortLabel: "Asistentes", status: sectionStatuses.attendees },
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
      buildFormEditorUrl("induccion-operativa", {
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
      validationTarget: ReturnType<typeof getInduccionOperativaValidationTarget>
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
          hydrationAction: resolveInduccionOperativaDraftHydration({
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
                "induccion-operativa",
                localDraftSessionId,
                draftParam
              );
            }
            const nextValues = normalizeInduccionOperativaValues(
              draftSource.draft.data,
              draftSource.empresa
            );
            setEmpresa(draftSource.empresa);
            reset(nextValues);
            setLoadedVinculadoSnapshot(null);
            setStep(draftSource.draft.step);
            setActiveSectionId(
              getInduccionOperativaSectionIdForStep(draftSource.draft.step)
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
          const nextValues = normalizeInduccionOperativaValues(
            draftSource.draft.data,
            draftSource.empresa
          );
          setEmpresa(draftSource.empresa);
          reset(nextValues);
          setLoadedVinculadoSnapshot(null);
          setStep(draftSource.draft.step);
          setActiveSectionId(
            getInduccionOperativaSectionIdForStep(draftSource.draft.step)
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

        const nextValues = normalizeInduccionOperativaValues(
          result.draft.data,
          result.empresa
        );
        setEmpresa(result.empresa);
        reset(nextValues);
        setLoadedVinculadoSnapshot(null);
        setStep(result.draft.step);
        setActiveSectionId(
          getInduccionOperativaSectionIdForStep(result.draft.step)
        );
        if (invisibleDraftPilotEnabled) {
          setDraftAlias(
            "induccion-operativa",
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
      const routeKey = buildInduccionOperativaSessionRouteKey(sessionId, false);

      if (!empresa && !hasSessionParam) {
        reset(getDefaultInduccionOperativaValues(null));
        setLoadedVinculadoSnapshot(null);
        setStep(0);
        setActiveSectionId("company");
        markRouteHydrated(null);
        setRestoringDraft(false);
        return;
      }

      if (!hasSessionParam && sessionId.trim()) {
        router.replace(
          buildFormEditorUrl("induccion-operativa", {
            sessionId,
          }),
          { scroll: false }
        );
      }

      const persistedDraftId = bootstrapDraftId;
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = localDraft?.empresa ?? empresa ?? null;
      const sessionHydrationAction = resolveInduccionOperativaSessionHydration({
        hasEmpresa: Boolean(empresa),
        persistedDraftId,
        hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        isRouteHydrated: isRouteHydrated(routeKey),
      });

      if (sessionHydrationAction === "show_company") {
        reset(getDefaultInduccionOperativaValues(null));
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
          const nextValues = normalizeInduccionOperativaValues(
            localDraft.data,
            localEmpresa
          );
          setEmpresa(localEmpresa);
          reset(nextValues);
          setLoadedVinculadoSnapshot(null);
          setStep(localDraft.step);
          setActiveSectionId(
            getInduccionOperativaSectionIdForStep(localDraft.step)
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

        const nextValues = normalizeInduccionOperativaValues(
          result.draft.data,
          result.empresa
        );
        setEmpresa(result.empresa);
        reset(nextValues);
        setLoadedVinculadoSnapshot(null);
        setStep(result.draft.step);
        setActiveSectionId(
          getInduccionOperativaSectionIdForStep(result.draft.step)
        );
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (!empresa) {
        reset(getDefaultInduccionOperativaValues(null));
        setLoadedVinculadoSnapshot(null);
        setStep(0);
        setActiveSectionId("company");
        setRestoringDraft(false);
        return;
      }

      reset(getDefaultInduccionOperativaValues(empresa));
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
        "induccion-operativa",
        "session_to_draft_promotion"
      )
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("induccion-operativa", {
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
    const nextStep = getInduccionOperativaCompatStepForSection(activeSectionId);
    if (nextStep !== step) {
      setStep(nextStep);
    }
  }, [activeSectionId, step]);

  const handleSelectEmpresa = useCallback(
    (nextEmpresa: Empresa) => {
      const nextSessionId = sessionParam?.trim() || startNewDraftSession();
      setEmpresa(nextEmpresa);
      const nextValues = getDefaultInduccionOperativaValues(nextEmpresa);
      reset(nextValues);
      setLoadedVinculadoSnapshot(null);
      setStep(0);
      setActiveSectionId("vinculado");
      setCollapsedSections(INITIAL_INDUCCION_OPERATIVA_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setFinalizedSuccess(null);
      setServerError(null);
      resetFinalizationProgress();
      markRouteHydrated(
        buildInduccionOperativaSessionRouteKey(nextSessionId, false)
      );
      router.replace(
        buildFormEditorUrl("induccion-operativa", {
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

  function handleSectionSelect(sectionId: InduccionOperativaSectionId) {
    if (sectionId !== "company" && !hasEmpresa) {
      return;
    }

    selectSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) {
      return false;
    }

    const nextValues = normalizeInduccionOperativaValues(getValues(), empresa);
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
          "induccion-operativa",
          "save_draft_redirect"
        )
      ) {
        return true;
      }

      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("induccion-operativa", {
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

    const nextValues = buildInduccionOperativaManualTestValues(empresa);
    reset(nextValues);
    setLoadedVinculadoSnapshot(null);
    setServerError(null);
    resetFinalizationProgress();
    void autosave(step, nextValues as Record<string, unknown>);
  }

  function handlePrepareSubmit(data: InduccionOperativaValues) {
    if (!isDocumentEditable || !empresa) {
      return;
    }

    setServerError(null);
    resetFinalizationProgress();
    setPendingSubmitValues(normalizeInduccionOperativaValues(data, empresa));
    setSubmitConfirmOpen(true);
  }

  async function confirmSubmit(
    retryAction: LongFormFinalizationRetryAction = "submit"
  ) {
    if (!isDocumentEditable || !empresa) {
      return;
    }

    if (!pendingSubmitValues) {
      clearFinalizationUiLock("induccion-operativa");
      resumeDraftLifecycle();
      setSubmitConfirmOpen(false);
      resetFinalizationProgress();
      return;
    }

    beginFinalizationUiLock("induccion-operativa");
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
      const requestHash = buildInduccionOperativaRequestHash(pendingSubmitValues);
      let responsePayload: { sheetLink: string; pdfLink?: string };

      if (retryAction === "submit") {
        updateFinalizationStage("preparando_envio");
        const requestBody = JSON.stringify({
          empresa,
          formData: pendingSubmitValues,
          finalization_identity: finalizationIdentity,
        });
        updateFinalizationStage("enviando_al_servidor");
        const responsePromise = fetch("/api/formularios/induccion-operativa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        updateFinalizationStage("esperando_respuesta");
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "induccion-operativa",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
          responsePromise,
        });
      } else {
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "induccion-operativa",
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
      clearFinalizationUiLock("induccion-operativa");
      try {
        await clearDraftAfterSuccess();
      } catch (cleanupError) {
        console.error(
          "[induccion-operativa.finalization_cleanup] failed (non-fatal)",
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

  function onInvalid(nextErrors: FieldErrors<InduccionOperativaValues>) {
    const validationTarget = getInduccionOperativaValidationTarget(nextErrors);
    resetFinalizationProgress();
    navigateToValidationTarget(validationTarget);

    if (!validationTarget || !isDocumentEditable || !empresa) {
      return;
    }

    const nextValues = normalizeInduccionOperativaValues(getValues(), empresa);

    checkpointInvalidSubmission({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          getInduccionOperativaCompatStepForSection(validationTarget.sectionId),
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
            "induccion-operativa",
            "invalid_submission_promotion"
          )
        ) {
          return;
        }

        markRouteHydrated(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("induccion-operativa", {
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
    clearFinalizationUiLock("induccion-operativa");
    resumeDraftLifecycle();
    setServerError(null);
    resetFinalizationProgress();
    reset(getDefaultInduccionOperativaValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_INDUCCION_OPERATIVA_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("induccion-operativa", { isNewDraft: true }));
  }

  if (finalizedSuccess) {
    return {
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: (
          <>
            La induccion operativa para{" "}
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
          serverError ?? "No fue posible reconstruir la empresa asociada a este borrador.",
        onBackToDrafts: () => router.push("/hub?panel=drafts"),
      },
    };
  }

  return {
    mode: "editing",
    presenterProps: {
      shell: {
        title: "Induccion Operativa",
        companyName: empresa?.nombre_empresa,
        onBack: handleReturnToHub,
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as InduccionOperativaSectionId),
        serverError,
        finalizationFeedback:
          finalizationProgress.phase === "processing" ||
          finalizationProgress.phase === "error" ? (
            <LongFormFinalizationStatus progress={finalizationProgress} />
          ) : null,
        finalizationFeedbackRef,
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
          isDocumentEditable,
          register,
          setValue,
          errors,
          linkedPerson: vinculado,
          loadedSnapshot: loadedVinculadoSnapshot,
          onLoadedSnapshotChange: setLoadedVinculadoSnapshot,
          collapsed: collapsedSections.vinculado,
          status: sectionStatuses.vinculado,
          sectionRef: vinculadoRef,
          onToggle: () => toggleSection("vinculado"),
          onFocusCapture: () => setActiveSectionId("vinculado"),
        },
        development: {
          isDocumentEditable,
          register,
          setValue,
          errors,
          values: section3,
          collapsed: collapsedSections.development,
          status: sectionStatuses.development,
          sectionRef: developmentRef,
          onToggle: () => toggleSection("development"),
          onFocusCapture: () => setActiveSectionId("development"),
        },
        socioemotional: {
          isDocumentEditable,
          register,
          setValue,
          errors,
          values: section4,
          collapsed: collapsedSections.socioemotional,
          status: sectionStatuses.socioemotional,
          sectionRef: socioemotionalRef,
          onToggle: () => toggleSection("socioemotional"),
          onFocusCapture: () => setActiveSectionId("socioemotional"),
        },
        support: {
          isDocumentEditable,
          register,
          setValue,
          errors,
          values: section5,
          collapsed: collapsedSections.support,
          status: sectionStatuses.support,
          sectionRef: supportRef,
          onToggle: () => toggleSection("support"),
          onFocusCapture: () => setActiveSectionId("support"),
        },
        adjustments: {
          isDocumentEditable,
          register,
          getValues,
          setValue,
          errors,
          value: ajustesRequeridos,
          fieldName: "ajustes_requeridos",
          label: "Ajustes razonables requeridos",
          collapsed: collapsedSections.adjustments,
          status: sectionStatuses.adjustments,
          sectionRef: adjustmentsRef,
          onToggle: () => toggleSection("adjustments"),
          onFocusCapture: () => setActiveSectionId("adjustments"),
        },
        followup: {
          isDocumentEditable,
          register,
          errors,
          value: fechaPrimerSeguimiento,
          collapsed: collapsedSections.followup,
          status: sectionStatuses.followup,
          sectionRef: followupRef,
          onToggle: () => toggleSection("followup"),
          onFocusCapture: () => setActiveSectionId("followup"),
        },
        observations: {
          isDocumentEditable,
          register,
          getValues,
          setValue,
          errors,
          value: observacionesRecomendaciones,
          fieldName: "observaciones_recomendaciones",
          label: "Observaciones y recomendaciones",
          required: false,
          collapsed: collapsedSections.observations,
          status: sectionStatuses.observations,
          sectionRef: observationsRef,
          onToggle: () => toggleSection("observations"),
          onFocusCapture: () => setActiveSectionId("observations"),
        },
        attendees: {
          isDocumentEditable,
          control,
          register,
          setValue,
          errors,
          profesionalAsignado: empresa?.profesional_asignado,
          profesionales,
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

          clearFinalizationUiLock("induccion-operativa");
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
