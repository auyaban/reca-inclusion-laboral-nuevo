"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { ContratacionFormPresenterProps } from "@/components/forms/contratacion/ContratacionFormPresenter";
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
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { returnToHubTab } from "@/lib/actaTabs";
import {
  getMeaningfulAsistentes,
  normalizePersistedAsistentesForMode,
} from "@/lib/asistentes";
import { normalizeContratacionValues, getDefaultContratacionValues } from "@/lib/contratacion";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import { findPersistedDraftIdForSession } from "@/lib/drafts";
import {
  FinalizationConfirmationError,
  waitForFinalizationConfirmation,
} from "@/lib/finalization/finalizationConfirmation";
import { buildContratacionRequestHash } from "@/lib/finalization/idempotency";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
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
  type LongFormFinalizationRetryAction,
  type LongFormFinalizationProgress,
} from "@/lib/longFormFinalization";
import {
  buildContratacionManualTestValues,
  isManualTestFillEnabled,
} from "@/lib/manualTestFill";
import {
  buildContratacionSessionRouteKey,
  resolveContratacionDraftHydration,
  resolveContratacionSessionHydration,
} from "@/lib/contratacionHydration";
import {
  CONTRATACION_SECTION_LABELS,
  getContratacionCompatStepForSection,
  getContratacionSectionIdForStep,
  INITIAL_CONTRATACION_COLLAPSED_SECTIONS,
  isContratacionActivitySectionComplete,
  isContratacionAttendeesSectionComplete,
  isContratacionCompanySectionComplete,
  isContratacionRecommendationsSectionComplete,
  isContratacionVinculadosSectionComplete,
  type ContratacionSectionId,
} from "@/lib/contratacionSections";
import { getContratacionValidationTarget } from "@/lib/contratacionValidationNavigation";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  contratacionSchema,
  type ContratacionValues,
} from "@/lib/validations/contratacion";

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
  presenterProps: ContratacionFormPresenterProps;
};

export type ContratacionFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

type UseContratacionFormStateOptions = {
  initialDraftResolution?: InitialDraftResolution;
};

export function useContratacionFormState({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: UseContratacionFormStateOptions = {}): ContratacionFormState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const clearEmpresa = useEmpresaStore((state) => state.clearEmpresa);
  const draftParam = searchParams.get("draft");
  const sessionParam = searchParams.get("session");
  const explicitNewDraft = searchParams.get("new") === "1";
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] =
    useState<ContratacionValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationProgress, setFinalizationProgress] =
    useState<LongFormFinalizationProgress>(
      getInitialLongFormFinalizationProgress
    );
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const [resultLinks, setResultLinks] = useState<{
    sheetLink: string;
    pdfLink?: string;
  } | null>(null);
  const appliedAssignedCargoKeyRef = useRef<string | null>(null);
  const finalizationFeedbackRef = useRef<HTMLDivElement | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const activityRef = useRef<HTMLElement | null>(null);
  const vinculadosRef = useRef<HTMLElement | null>(null);
  const recommendationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();

  const draftController = useLongFormDraftController({
    slug: "contratacion",
    empresa,
    initialDraftId: draftParam,
    initialLocalDraftSessionId: sessionParam,
    initialRestoring: Boolean(draftParam || sessionParam?.trim()),
  });

  const {
    activeDraftId,
    localDraftSessionId,
    loadingDraft,
    savingDraft,
    isDraftEditable,
    autosave,
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
    resumeDraftLifecycle,
    buildDraftStatusProps,
    buildDraftLockBannerProps,
    checkpointInvalidSubmission,
    clearDraftAfterSuccess,
    isReadonlyDraft,
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
  } = useForm<ContratacionValues>({
    resolver: zodResolver(contratacionSchema),
    defaultValues: getDefaultContratacionValues(empresa),
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
      "vinculados",
      "asistentes",
    ] as const,
  });
  const [
    watchedFechaVisita,
    watchedModalidad,
    watchedNitEmpresa,
    watchedDesarrolloActividad,
    watchedAjustesRecomendaciones,
    watchedVinculados,
    watchedAsistentes,
  ] = watchedValues as [
    ContratacionValues["fecha_visita"] | undefined,
    ContratacionValues["modalidad"] | undefined,
    ContratacionValues["nit_empresa"] | undefined,
    ContratacionValues["desarrollo_actividad"] | undefined,
    ContratacionValues["ajustes_recomendaciones"] | undefined,
    ContratacionValues["vinculados"] | undefined,
    ContratacionValues["asistentes"] | undefined,
  ];
  const values = useMemo<ContratacionValues>(
    () => ({
      fecha_visita: watchedFechaVisita ?? getValues("fecha_visita"),
      modalidad: watchedModalidad ?? getValues("modalidad"),
      nit_empresa: watchedNitEmpresa ?? getValues("nit_empresa"),
      desarrollo_actividad:
        watchedDesarrolloActividad ?? getValues("desarrollo_actividad"),
      ajustes_recomendaciones:
        watchedAjustesRecomendaciones ?? getValues("ajustes_recomendaciones"),
      vinculados: watchedVinculados ?? getValues("vinculados"),
      asistentes: watchedAsistentes ?? getValues("asistentes"),
    }),
    [
      getValues,
      watchedAjustesRecomendaciones,
      watchedAsistentes,
      watchedDesarrolloActividad,
      watchedFechaVisita,
      watchedModalidad,
      watchedNitEmpresa,
      watchedVinculados,
    ]
  );
  const {
    fecha_visita: fechaVisita,
    modalidad,
    nit_empresa: nitEmpresa,
    desarrollo_actividad: desarrolloActividad,
    ajustes_recomendaciones: ajustesRecomendaciones,
  } = values;

  const formTabLabel = getFormTabLabel("contratacion");
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const showTestFillAction = isManualTestFillEnabled();

  const sectionRefs = useMemo(
    () => ({
      company: companyRef,
      activity: activityRef,
      vinculados: vinculadosRef,
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
  } = useLongFormSections<ContratacionSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_CONTRATACION_COLLAPSED_SECTIONS,
    sectionRefs,
  });
  const activeSectionIdRef = useRef<ContratacionSectionId>("company");
  const collapsedSectionsRef = useRef(INITIAL_CONTRATACION_COLLAPSED_SECTIONS);

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
    return buildContratacionSessionRouteKey(sessionId, explicitNewDraft);
  }, [draftParam, explicitNewDraft, localDraftSessionId, sessionParam]);

  const sectionStatuses = useMemo(() => {
    const errorSectionId =
      getContratacionValidationTarget(errors)?.sectionId ?? null;

    function getStatus(
      id: ContratacionSectionId,
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
        completed: hasEmpresa && isContratacionCompanySectionComplete(values),
      }),
      activity: getStatus("activity", {
        completed: hasEmpresa && isContratacionActivitySectionComplete(values),
        disabled: !hasEmpresa,
      }),
      vinculados: getStatus("vinculados", {
        completed: hasEmpresa && isContratacionVinculadosSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      recommendations: getStatus("recommendations", {
        completed:
          hasEmpresa && isContratacionRecommendationsSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      attendees: getStatus("attendees", {
        completed: hasEmpresa && isContratacionAttendeesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
    };
  }, [activeSectionId, errors, hasEmpresa, values]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () => [
      {
        id: "company",
        label: CONTRATACION_SECTION_LABELS.company,
        shortLabel: "Empresa",
        status: sectionStatuses.company,
      },
      {
        id: "activity",
        label: CONTRATACION_SECTION_LABELS.activity,
        shortLabel: "Actividad",
        status: sectionStatuses.activity,
      },
      {
        id: "vinculados",
        label: CONTRATACION_SECTION_LABELS.vinculados,
        shortLabel: "Vinculados",
        status: sectionStatuses.vinculados,
      },
      {
        id: "recommendations",
        label: CONTRATACION_SECTION_LABELS.recommendations,
        shortLabel: "Ajustes",
        status: sectionStatuses.recommendations,
      },
      {
        id: "attendees",
        label: CONTRATACION_SECTION_LABELS.attendees,
        shortLabel: "Asistentes",
        status: sectionStatuses.attendees,
      },
    ],
    [sectionStatuses]
  );

  useEffect(() => {
    const companyName = empresa?.nombre_empresa?.trim();
    const baseTitle = companyName
      ? `${formTabLabel} | ${companyName}`
      : `${formTabLabel} | Nueva acta`;
    document.title = isReadonlyDraft ? `${baseTitle} | Solo lectura` : baseTitle;
  }, [empresa?.nombre_empresa, formTabLabel, isReadonlyDraft]);

  const navigateToValidationTarget = useCallback(
    (validationTarget: ReturnType<typeof getContratacionValidationTarget>) => {
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
        slug: "contratacion",
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
      valuesToRestore: Partial<ContratacionValues> | Record<string, unknown>,
      nextEmpresa: Empresa,
      nextStep: number,
      intent: LongFormHydrationIntent,
      routeKey: string
    ) => {
      const normalizedValues = normalizeContratacionValues(valuesToRestore, nextEmpresa);
      const nextSectionId = getContratacionSectionIdForStep(nextStep);
      const storedViewState = loadLongFormViewState<ContratacionSectionId>({
        slug: "contratacion",
        routeKey,
      });
      const currentViewState: LongFormStoredViewState<ContratacionSectionId> = {
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
      setStep(nextStep);
      setActiveSectionId(restoredViewState?.activeSectionId ?? nextSectionId);
      setCollapsedSections(
        restoredViewState?.collapsedSections ?? INITIAL_CONTRATACION_COLLAPSED_SECTIONS
      );
      setSubmitted(false);
      setResultLinks(null);
      resumeDraftLifecycle();
      setServerError(null);
      resetFinalizationProgress();

      if (intent === "new_form" || intent === "post_finalize") {
        restoreLongFormScroll({ scrollY: 0 });
        return;
      }

      restoreLongFormScroll({
        scrollY: restoredViewState?.scrollY,
        sectionElement: sectionRefs[
          restoredViewState?.activeSectionId ?? nextSectionId
        ].current,
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
    if (submitted) {
      return;
    }

    let cancelled = false;

    async function hydrateRoute() {
      if (draftParam) {
        const routeKey = `draft:${draftParam}`;
        setRestoringDraft(true);
        const localDraft = await loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
        const draftHydrationAction = resolveContratacionDraftHydration({
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
          if (!cancelled) {
            applyFormState(
              draftSource.draft.data,
              draftSource.empresa,
              draftSource.draft.step,
              "explicit_restore",
              routeKey
            );
            markRouteHydrated(routeKey);
            setRestoringDraft(false);
          }
          return;
        }

        if (draftSource.action === "restore_prefetched") {
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
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      const sessionId = sessionParam?.trim() || localDraftSessionId;
      const routeKey = buildContratacionSessionRouteKey(sessionId, explicitNewDraft);

      if (!empresa && !hasSessionParam) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      if (!hasSessionParam) {
        router.replace(buildFormEditorUrl("contratacion", { sessionId }), {
          scroll: false,
        });
      }

      const persistedDraftId = findPersistedDraftIdForSession(
        "contratacion",
        sessionId
      );
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
      const sessionHydrationAction = resolveContratacionSessionHydration({
        hasEmpresa: Boolean(empresa),
        hasSessionParam,
        persistedDraftId,
        hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        isRouteHydrated: isRouteHydrated(routeKey),
      });

      if (sessionHydrationAction === "redirect_to_draft" && persistedDraftId) {
        router.replace(
          buildFormEditorUrl("contratacion", {
            draftId: persistedDraftId,
          }),
          { scroll: false }
        );
        return;
      }

      if (sessionHydrationAction === "show_company") {
        setRestoringDraft(false);
        setActiveSectionId("company");
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

      if (!empresa) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      applyFormState(
        getDefaultContratacionValues(empresa),
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
    draftParam,
    empresa,
    explicitNewDraft,
    initialDraftResolution,
    isRouteHydrated,
    loadDraft,
    loadLocal,
    localDraftSessionId,
    markRouteHydrated,
    resolveLocalEmpresa,
    router,
    sessionParam,
    setActiveSectionId,
    setRestoringDraft,
    submitted,
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
    if (!empresa || restoringDraft || draftLifecycleSuspended || isBootstrappingForm) {
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
    isBootstrappingForm,
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
      isBootstrappingForm
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("contratacion", {
        draftId: activeDraftId,
      }),
      { scroll: false }
    );
  }, [
    activeDraftId,
    draftLifecycleSuspended,
    draftParam,
    isBootstrappingForm,
    markRouteHydrated,
    restoringDraft,
    router,
    sessionParam,
  ]);

  useEffect(() => {
    if (activeSectionId === "company") return;

    const nextStep = getContratacionCompatStepForSection(activeSectionId);
    if (nextStep !== step) {
      setStep(nextStep);
    }
  }, [activeSectionId, step]);

  const handleSelectEmpresa = useCallback(
    (nextEmpresa: Empresa) => {
      const nextSessionId = sessionParam?.trim() || startNewDraftSession();
      const nextRoute = buildFormEditorUrl("contratacion", {
        sessionId: nextSessionId,
        isNewDraft: explicitNewDraft,
      });

      setEmpresa(nextEmpresa);
      reset(getDefaultContratacionValues(nextEmpresa));
      setStep(0);
      setActiveSectionId("activity");
      setCollapsedSections(INITIAL_CONTRATACION_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setSubmitted(false);
      setResultLinks(null);
      setServerError(null);
      resetFinalizationProgress();
      markRouteHydrated(
        buildContratacionSessionRouteKey(nextSessionId, explicitNewDraft)
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

  function handleSectionSelect(sectionId: ContratacionSectionId) {
    if (sectionId !== "company" && !hasEmpresa) {
      return;
    }

    selectSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) {
      return false;
    }

    const nextValues = normalizeContratacionValues(getValues(), empresa);
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
      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("contratacion", {
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

    const nextValues = buildContratacionManualTestValues(empresa, getValues());
    reset(nextValues);
    setServerError(null);
    void autosave(step, nextValues as Record<string, unknown>);
  }

  function handlePrepareSubmit(data: ContratacionValues) {
    if (!isDocumentEditable) {
      return;
    }

    const normalizedData: ContratacionValues = {
      ...normalizeContratacionValues(data, empresa),
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
      setSubmitConfirmOpen(false);
      resetFinalizationProgress();
      return;
    }

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
      const requestHash = buildContratacionRequestHash({
        ...pendingSubmitValues,
        asistentes: meaningfulAsistentes,
      });
      let responsePayload: { sheetLink: string; pdfLink?: string };

      if (retryAction === "submit") {
        updateFinalizationStage("preparando_envio");
        updateFinalizationStage("enviando_al_servidor");
        const responsePromise = fetch("/api/formularios/contratacion", {
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
          formSlug: "contratacion",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
          responsePromise,
        });
      } else {
        responsePayload = await waitForFinalizationConfirmation({
          formSlug: "contratacion",
          finalizationIdentity,
          requestHash,
          onStageChange: updateFinalizationStage,
          onStatusContextChange: updateFinalizationStatusContext,
        });
      }

      updateFinalizationStage("cerrando_borrador_local");
      setResultLinks({
        sheetLink: responsePayload.sheetLink,
        pdfLink: responsePayload.pdfLink,
      });
      clearLongFormViewState({
        slug: "contratacion",
        routeKey: currentRouteKey,
      });
      restoreLongFormScroll({ scrollY: 0 });
      await clearDraftAfterSuccess().catch(() => undefined);
      setFinalizationProgress((current) => ({
        ...current,
        phase: "completed",
        retryAction: "submit",
      }));
      setSubmitConfirmOpen(false);
      setPendingSubmitValues(null);
      setSubmitted(true);
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

  function onInvalid(nextErrors: FieldErrors<ContratacionValues>) {
    const validationTarget = getContratacionValidationTarget(nextErrors);
    resetFinalizationProgress();
    navigateToValidationTarget(validationTarget);

    if (!validationTarget || !isDocumentEditable || !empresa) {
      return;
    }

    const nextValues = normalizeContratacionValues(getValues(), empresa);

    checkpointInvalidSubmission({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          getContratacionCompatStepForSection(
            validationTarget.sectionId === "company"
              ? "activity"
              : validationTarget.sectionId
          ),
          nextValues as Record<string, unknown>,
          "interval"
        ),
      onPromoteDraft: (nextDraftId) => {
        markRouteHydrated(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("contratacion", {
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
      slug: "contratacion",
      routeKey: currentRouteKey,
    });
    startNewDraftSession();
    clearEmpresa();
    appliedAssignedCargoKeyRef.current = null;
    setIsBootstrappingForm(true);
    setSubmitted(false);
    resumeDraftLifecycle();
    setResultLinks(null);
    setServerError(null);
    resetFinalizationProgress();
    reset(getDefaultContratacionValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_CONTRATACION_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("contratacion", { isNewDraft: true }));
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

  if (submitted && empresa) {
    return {
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: (
          <>
            La contratacion para{" "}
            <span className="font-semibold text-gray-700">
              {empresa.nombre_empresa}
            </span>{" "}
            fue registrada correctamente.
          </>
        ),
        links: resultLinks,
        onReturnToHub: handleReturnToHub,
        onStartNewForm: handleStartNewForm,
      },
    };
  }

  return {
    mode: "editing",
    presenterProps: {
      shell: {
        title: "Contratacion Incluyente",
        companyName: empresa?.nombre_empresa,
        onBack: handleReturnToHub,
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as ContratacionSectionId),
        serverError,
        finalizationFeedback:
          finalizationProgress.phase === "processing" ||
          finalizationProgress.phase === "error" ? (
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
      notice: isReadonlyDraft ? (
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
        vinculados: {
          isDocumentEditable,
          control,
          register,
          setValue,
          errors,
          collapsed: collapsedSections.vinculados,
          status: sectionStatuses.vinculados,
          sectionRef: vinculadosRef,
          onToggle: () => toggleSection("vinculados"),
          onFocusCapture: () => setActiveSectionId("vinculados"),
        },
        recommendations: {
          isDocumentEditable,
          value: ajustesRecomendaciones,
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
