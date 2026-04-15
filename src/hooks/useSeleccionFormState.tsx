"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import type { SeleccionFormPresenterProps } from "@/components/forms/seleccion/SeleccionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormFinalizeButton,
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
import { findPersistedDraftIdForSession } from "@/lib/drafts";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
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

export type SeleccionFormState =
  | LoadingState
  | DraftErrorState
  | SuccessState
  | EditingState;

export function useSeleccionFormState(): SeleccionFormState {
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
    useState<SeleccionValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const [resultLinks, setResultLinks] = useState<{
    sheetLink: string;
    pdfLink?: string;
  } | null>(null);
  const appliedAssignedCargoKeyRef = useRef<string | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const activityRef = useRef<HTMLElement | null>(null);
  const oferentesRef = useRef<HTMLElement | null>(null);
  const recommendationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();

  const draftController = useLongFormDraftController({
    slug: "seleccion",
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
      "oferentes",
      "asistentes",
    ] as const,
  });
  const [
    watchedFechaVisita,
    watchedModalidad,
    watchedNitEmpresa,
    watchedDesarrolloActividad,
    watchedAjustesRecomendaciones,
    watchedNota,
    watchedOferentes,
    watchedAsistentes,
  ] = watchedValues as [
    SeleccionValues["fecha_visita"] | undefined,
    SeleccionValues["modalidad"] | undefined,
    SeleccionValues["nit_empresa"] | undefined,
    SeleccionValues["desarrollo_actividad"] | undefined,
    SeleccionValues["ajustes_recomendaciones"] | undefined,
    SeleccionValues["nota"] | undefined,
    SeleccionValues["oferentes"] | undefined,
    SeleccionValues["asistentes"] | undefined,
  ];
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
      oferentes: watchedOferentes ?? getValues("oferentes"),
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
      watchedNota,
      watchedOferentes,
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
        completed: hasEmpresa && isSeleccionCompanySectionComplete(values),
      }),
      activity: getStatus("activity", {
        completed: hasEmpresa && isSeleccionActivitySectionComplete(values),
        disabled: !hasEmpresa,
      }),
      oferentes: getStatus("oferentes", {
        completed: hasEmpresa && isSeleccionOferentesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      recommendations: getStatus("recommendations", {
        completed: hasEmpresa && isSeleccionRecommendationsSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      attendees: getStatus("attendees", {
        completed: hasEmpresa && isSeleccionAttendeesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
    };
  }, [activeSectionId, errors, hasEmpresa, values]);

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

  const applyFormState = useCallback(
    (
      valuesToRestore: Partial<SeleccionValues> | Record<string, unknown>,
      nextEmpresa: Empresa,
      nextStep: number
    ) => {
      appliedAssignedCargoKeyRef.current = null;
      setIsBootstrappingForm(true);
      setEmpresa(nextEmpresa);
      reset(normalizeSeleccionValues(valuesToRestore, nextEmpresa));
      setStep(nextStep);
      setActiveSectionId(getSeleccionSectionIdForStep(nextStep));
      setCollapsedSections(INITIAL_SELECCION_COLLAPSED_SECTIONS);
      setSubmitted(false);
      setResultLinks(null);
      resumeDraftLifecycle();
      setServerError(null);
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [reset, resumeDraftLifecycle, setActiveSectionId, setCollapsedSections, setEmpresa]
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

        if (draftHydrationAction === "skip") {
          setRestoringDraft(false);
          return;
        }

        if (draftHydrationAction === "restore_local" && localDraft && localEmpresa) {
          if (!cancelled) {
            applyFormState(localDraft.data, localEmpresa, localDraft.step);
            markRouteHydrated(routeKey);
            setRestoringDraft(false);
          }
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
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
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

      const persistedDraftId = findPersistedDraftIdForSession(
        "seleccion",
        sessionId
      );
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
      const sessionHydrationAction = resolveSeleccionSessionHydration({
        hasEmpresa: Boolean(empresa),
        hasSessionParam,
        persistedDraftId,
        hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        isRouteHydrated: isRouteHydrated(routeKey),
      });

      if (sessionHydrationAction === "redirect_to_draft" && persistedDraftId) {
        router.replace(
          buildFormEditorUrl("seleccion", {
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
          applyFormState(localDraft.data, localEmpresa, localDraft.step);
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

      applyFormState(getDefaultSeleccionValues(empresa), empresa, 0);
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
  ]);

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
    markRouteHydrated,
    restoringDraft,
    router,
    sessionParam,
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
      reset(getDefaultSeleccionValues(nextEmpresa));
      setStep(0);
      setActiveSectionId("activity");
      setCollapsedSections(INITIAL_SELECCION_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setSubmitted(false);
      setResultLinks(null);
      setServerError(null);
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
    if (result.draftId && draftParam !== result.draftId) {
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
    setPendingSubmitValues(normalizedData);
    setSubmitConfirmOpen(true);
  }

  async function confirmSubmit() {
    if (!isDocumentEditable) {
      return;
    }

    if (!pendingSubmitValues || !empresa) {
      setSubmitConfirmOpen(false);
      return;
    }

    setServerError(null);
    setIsFinalizing(true);

    try {
      const meaningfulAsistentes = getMeaningfulAsistentes(
        pendingSubmitValues.asistentes
      );
      const finalizationIdentity = {
        local_draft_session_id: localDraftSessionId,
        ...(activeDraftId ? { draft_id: activeDraftId } : {}),
      };
      const response = await fetch("/api/formularios/seleccion", {
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

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Error al guardar");
      }

      setResultLinks({
        sheetLink: payload.sheetLink,
        pdfLink: payload.pdfLink,
      });
      await clearDraftAfterSuccess();
      setSubmitConfirmOpen(false);
      setPendingSubmitValues(null);
      setSubmitted(true);
      window.history.replaceState(
        window.history.state,
        "",
        buildFormEditorUrl("seleccion")
      );
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      setSubmitConfirmOpen(false);
      setServerError(
        error instanceof Error ? error.message : "Error al guardar el formulario."
      );
    } finally {
      setIsFinalizing(false);
    }
  }

  function onInvalid(nextErrors: FieldErrors<SeleccionValues>) {
    const validationTarget = getSeleccionValidationTarget(nextErrors);
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
    startNewDraftSession();
    clearEmpresa();
    appliedAssignedCargoKeyRef.current = null;
    setIsBootstrappingForm(true);
    setSubmitted(false);
    resumeDraftLifecycle();
    setResultLinks(null);
    setServerError(null);
    reset(getDefaultSeleccionValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_SELECCION_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("seleccion", { isNewDraft: true }));
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
            La seleccion para{" "}
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
        title: "Seleccion Incluyente",
        companyName: empresa?.nombre_empresa,
        onBack: handleReturnToHub,
        navItems,
        activeSectionId,
        onSectionSelect: (sectionId) =>
          handleSectionSelect(sectionId as SeleccionSectionId),
        serverError,
        submitAction: (
          <LongFormFinalizeButton
            disabled={isSubmitting || isFinalizing || !isDocumentEditable}
            isSubmitting={isSubmitting}
            isFinalizing={isFinalizing}
          />
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
        oferentes: {
          isDocumentEditable,
          control,
          register,
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
        open: submitConfirmOpen,
        description:
          "Esta accion publicara el acta en Google Sheets y generara el PDF final. Confirma solo cuando hayas revisado toda la informacion.",
        loading: isFinalizing,
        onCancel: () => {
          if (isFinalizing) {
            return;
          }

          setSubmitConfirmOpen(false);
          setPendingSubmitValues(null);
        },
        onConfirm: () => {
          void confirmSubmit();
        },
      },
    },
  };
}
