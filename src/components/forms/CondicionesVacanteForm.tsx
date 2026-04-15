"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import { CondicionesVacanteCompanySection } from "@/components/forms/condicionesVacante/CondicionesVacanteCompanySection";
import { CondicionesVacanteDisabilitiesSection } from "@/components/forms/condicionesVacante/CondicionesVacanteDisabilitiesSection";
import {
  CondicionesVacanteCapabilitiesSection,
  CondicionesVacanteEducationSection,
  CondicionesVacantePosturesSection,
  CondicionesVacanteRecommendationsSection,
  CondicionesVacanteRisksSection,
  CondicionesVacanteVacancySection,
} from "@/components/forms/condicionesVacante/CondicionesVacanteMainSections";
import {
  CONDICIONES_COMPANY_SECTION_DESCRIPTION,
} from "@/components/forms/condicionesVacante/config";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { LongFormDisabledSectionState } from "@/components/forms/shared/LongFormDisabledSectionState";
import type { FormCompletionLinks } from "@/components/forms/shared/FormCompletionActions";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import {
  LongFormDraftErrorState,
  LongFormFinalizeButton,
  LongFormLoadingState,
  LongFormShell,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import {
  LongFormSectionCard,
  type LongFormSectionStatus,
} from "@/components/forms/shared/LongFormSectionCard";
import { type LongFormSectionNavItem } from "@/components/forms/shared/LongFormSectionNav";
import { useCondicionesVacanteCatalogs } from "@/hooks/useCondicionesVacanteCatalogs";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useFormDraftLifecycle } from "@/hooks/useFormDraftLifecycle";
import { useLongFormSections } from "@/hooks/useLongFormSections";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { openActaTab, returnToHubTab } from "@/lib/actaTabs";
import { normalizePersistedAsistentesForMode } from "@/lib/asistentes";
import {
  deriveCondicionesVacanteCompetencias,
  getDefaultCondicionesVacanteValues,
  normalizeCondicionesVacanteValues,
} from "@/lib/condicionesVacante";
import { findPersistedDraftIdForSession } from "@/lib/drafts";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import { startInvalidSubmissionCheckpoint } from "@/lib/invalidSubmissionDraft";
import {
  buildCondicionesVacanteSessionRouteKey,
  resolveCondicionesVacanteDraftHydration,
  resolveCondicionesVacanteSessionHydration,
} from "@/lib/condicionesVacanteHydration";
import {
  CONDICIONES_VACANTE_SECTION_IDS,
  CONDICIONES_VACANTE_SECTION_LABELS,
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

function getCondicionesVacanteSuccessNoticeError(error: string | null) {
  if (error === "Borrador no encontrado") {
    return null;
  }

  return error;
}

type CondicionesVacanteSubmittedSnapshot = {
  empresa: Empresa;
  formData: CondicionesVacanteValues;
  step: number;
};

export default function CondicionesVacanteForm() {
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
    useState<CondicionesVacanteValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const [resultLinks, setResultLinks] = useState<FormCompletionLinks | null>(null);
  const [lastSubmittedSnapshot, setLastSubmittedSnapshot] =
    useState<CondicionesVacanteSubmittedSnapshot | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const vacancyRef = useRef<HTMLElement | null>(null);
  const educationRef = useRef<HTMLElement | null>(null);
  const capabilitiesRef = useRef<HTMLElement | null>(null);
  const posturesRef = useRef<HTMLElement | null>(null);
  const risksRef = useRef<HTMLElement | null>(null);
  const disabilitiesRef = useRef<HTMLElement | null>(null);
  const recommendationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();
  const {
    catalogs,
    error: catalogError,
    status: catalogStatus,
    retry: retryCatalog,
  } = useCondicionesVacanteCatalogs();
  const {
    draftLifecycleSuspended,
    restoringDraft,
    setRestoringDraft,
    isRouteHydrated,
    markRouteHydrated,
    suspendDraftLifecycle,
    resumeDraftLifecycle,
    takeOverDraftWithFeedback,
  } = useFormDraftLifecycle({
    initialRestoring: Boolean(draftParam || sessionParam?.trim()),
  });
  const {
    activeDraftId,
    localDraftSessionId,
    loadingDraft,
    savingDraft,
    draftSavedAt,
    localDraftSavedAt,
    localPersistenceState,
    localPersistenceMessage,
    remoteIdentityState,
    remoteSyncState,
    editingAuthorityState,
    isDraftEditable,
    hasPendingAutosave,
    hasLocalDirtyChanges,
    hasPendingRemoteSync,
    autosave,
    flushAutosave,
    loadLocal,
    checkpointDraft,
    saveDraft,
    clearDraft,
    loadDraft,
    takeOverDraft,
    duplicateDraft,
    startNewDraftSession,
  } = useFormDraft({
    slug: "condiciones-vacante",
    empresa,
    initialDraftId: draftParam,
    initialLocalDraftSessionId: sessionParam,
  });
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
    resolver: zodResolver(condicionesVacanteSchema),
    defaultValues: getDefaultCondicionesVacanteValues(empresa, catalogs ?? undefined),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const watchedValues = useWatch({ control });
  const values = (watchedValues ?? getValues()) as CondicionesVacanteValues;
  const isReadonlyDraft = editingAuthorityState === "read_only";
  const formTabLabel = getFormTabLabel("condiciones-vacante");
  const duplicateLandingStep =
    getCondicionesVacanteCompatStepForSection("vacancy");
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const successNoticeError = getCondicionesVacanteSuccessNoticeError(serverError);
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
    (validationTarget: ReturnType<typeof getCondicionesVacanteValidationTarget>) => {
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
          catalogs ?? undefined
        )
      );
      setStep(nextStep);
      setActiveSectionId(getCondicionesVacanteSectionIdForStep(nextStep));
      setCollapsedSections(INITIAL_CONDICIONES_VACANTE_COLLAPSED_SECTIONS);
      setSubmitted(false);
      setResultLinks(null);
      resumeDraftLifecycle();
      setServerError(null);
      setIsBootstrappingForm(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [
      catalogs,
      reset,
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
    let cancelled = false;

    async function hydrateRoute() {
      if (draftParam) {
        const routeKey = `draft:${draftParam}`;
        setRestoringDraft(true);
        const localDraft = await loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
        const draftHydrationAction = resolveCondicionesVacanteDraftHydration({
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

      const hasSessionParam = Boolean(sessionParam?.trim());
      const sessionId = sessionParam?.trim() || localDraftSessionId;
      const routeKey = buildCondicionesVacanteSessionRouteKey(
        sessionId,
        explicitNewDraft
      );

      if (!empresa && !hasSessionParam) {
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

      const persistedDraftId = findPersistedDraftIdForSession(
        "condiciones-vacante",
        sessionId
      );
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
      const sessionHydrationAction = resolveCondicionesVacanteSessionHydration({
        hasEmpresa: Boolean(empresa),
        hasSessionParam,
        persistedDraftId,
        hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        isRouteHydrated: isRouteHydrated(routeKey),
      });

      if (sessionHydrationAction === "redirect_to_draft" && persistedDraftId) {
        router.replace(
          buildFormEditorUrl("condiciones-vacante", {
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

      applyFormState(
        getDefaultCondicionesVacanteValues(empresa, catalogs ?? undefined),
        empresa,
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
    catalogs,
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
    markRouteHydrated,
    restoringDraft,
    router,
    sessionParam,
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
      setSubmitted(false);
      setResultLinks(null);
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

    function getStatus(
      sectionId: CondicionesVacanteSectionId,
      options?: { completed?: boolean; disabled?: boolean }
    ): LongFormSectionStatus {
      if (activeSectionId === sectionId) {
        return "active";
      }

      if (options?.disabled) {
        return "disabled";
      }

      if (errorSectionId === sectionId) {
        return "error";
      }

      if (options?.completed) {
        return "completed";
      }

      return "idle";
    }

    return {
      company: getStatus("company", {
        completed: isCondicionesVacanteCompanySectionComplete({
          hasEmpresa,
          fecha_visita: values.fecha_visita,
          modalidad: values.modalidad,
          nit_empresa: values.nit_empresa,
        }),
      }),
      vacancy: getStatus("vacancy", {
        completed:
          hasEmpresa && isCondicionesVacanteVacancySectionComplete(values),
        disabled: !hasEmpresa,
      }),
      education: getStatus("education", {
        completed:
          hasEmpresa && isCondicionesVacanteEducationSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      capabilities: getStatus("capabilities", {
        completed:
          hasEmpresa && isCondicionesVacanteCapabilitiesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      postures: getStatus("postures", {
        completed:
          hasEmpresa && isCondicionesVacantePosturesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      risks: getStatus("risks", {
        completed: hasEmpresa && isCondicionesVacanteRisksSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      disabilities: getStatus("disabilities", {
        completed:
          hasEmpresa && isCondicionesVacanteDisabilitiesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      recommendations: getStatus("recommendations", {
        completed:
          hasEmpresa &&
          isCondicionesVacanteRecommendationsSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      attendees: getStatus("attendees", {
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
    if (result.draftId && draftParam !== result.draftId) {
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
    getValues,
    isDocumentEditable,
    markRouteHydrated,
    reset,
    router,
    saveDraft,
    step,
  ]);

  const handlePrepareSubmit = useCallback(
    (data: CondicionesVacanteValues) => {
      if (!isDocumentEditable) {
        return;
      }

      setServerError(null);
      setPendingSubmitValues(buildPersistedValues(data, empresa, catalogs));
      setSubmitConfirmOpen(true);
    },
    [catalogs, empresa, isDocumentEditable]
  );

  const confirmSubmit = useCallback(async () => {
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
      const response = await fetch("/api/formularios/condiciones-vacante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa,
          formData: pendingSubmitValues,
          finalization_identity: {
            draft_id: activeDraftId ?? undefined,
            local_draft_session_id: localDraftSessionId,
          },
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
      setLastSubmittedSnapshot({
        empresa,
        formData: pendingSubmitValues,
        step: duplicateLandingStep,
      });
      suspendDraftLifecycle();
      await clearDraft(activeDraftId ?? undefined, {
        sessionId: localDraftSessionId,
      });
      markRouteHydrated(null);
      setSubmitConfirmOpen(false);
      setPendingSubmitValues(null);
      setSubmitted(true);
      window.history.replaceState(
        window.history.state,
        "",
        buildFormEditorUrl("condiciones-vacante")
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
  }, [
    activeDraftId,
    clearDraft,
    duplicateLandingStep,
    empresa,
    isDocumentEditable,
    localDraftSessionId,
    markRouteHydrated,
    pendingSubmitValues,
    suspendDraftLifecycle,
  ]);

  const onInvalid = useCallback(
    (nextErrors: FieldErrors<CondicionesVacanteValues>) => {
      const validationTarget = getCondicionesVacanteValidationTarget(nextErrors);
      navigateToValidationTarget(validationTarget);

      if (!validationTarget || !isDocumentEditable || !empresa) {
        return;
      }

      const checkpointStep =
        validationTarget.sectionId === "company"
          ? 0
          : getCondicionesVacanteCompatStepForSection(validationTarget.sectionId);
      const nextValues = buildPersistedValues(getValues(), empresa, catalogs);

      startInvalidSubmissionCheckpoint({
        currentDraftId: activeDraftId,
        checkpoint: () =>
          checkpointDraft(
            checkpointStep,
            nextValues as Record<string, unknown>,
            "interval"
          ),
        onPromoteDraft: (nextDraftId) => {
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
            "Revisa los campos resaltados antes de finalizar. Ademas, no se pudo guardar el borrador automaticamente."
          );
        },
      });
    },
    [
      activeDraftId,
      catalogs,
      checkpointDraft,
      empresa,
      getValues,
      isDocumentEditable,
      markRouteHydrated,
      navigateToValidationTarget,
      router,
    ]
  );

  const handleTakeOverDraft = useCallback(() => {
    takeOverDraftWithFeedback(takeOverDraft, setServerError);
  }, [takeOverDraft, takeOverDraftWithFeedback]);

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
        error instanceof Error
          ? error.message
          : "No se pudo duplicar el borrador."
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
        error instanceof Error
          ? error.message
          : "No se pudo duplicar el borrador."
      );
    } finally {
      setIsDuplicating(false);
    }
  }, [duplicateDraft, lastSubmittedSnapshot, openDuplicatedDraftTab]);

  const handleStartNewForm = useCallback(() => {
    startNewDraftSession();
    clearEmpresa();
    setIsBootstrappingForm(true);
    setSubmitted(false);
    resumeDraftLifecycle();
    setResultLinks(null);
    setLastSubmittedSnapshot(null);
    setServerError(null);
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
    startNewDraftSession,
  ]);

  if (
    (draftParam && (restoringDraft || loadingDraft)) ||
    (!draftParam && !empresa && restoringDraft)
  ) {
    return (
      <LongFormLoadingState
      />
    );
  }

  if (draftParam && !empresa && !restoringDraft) {
    return (
      <LongFormDraftErrorState
        message={
          serverError ??
          "No fue posible reconstruir la empresa asociada a este borrador."
        }
        onBackToDrafts={() => router.push("/hub?panel=drafts")}
      />
    );
  }

  if (submitted && empresa) {
    return (
      <LongFormSuccessState
        title="Formulario guardado"
        message={
          <>
            Las condiciones de vacante para{" "}
            <span className="font-semibold text-gray-700">
              {empresa.nombre_empresa}
            </span>{" "}
            fueron registradas correctamente.
          </>
        }
        links={resultLinks}
        onReturnToHub={handleReturnToHub}
        onStartNewForm={handleStartNewForm}
        notice={
          successNoticeError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {successNoticeError}
            </div>
          ) : null
        }
        extraActions={
          lastSubmittedSnapshot ? (
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
          ) : null
        }
      />
    );
  }

  return (
    <LongFormShell
      title="Condiciones de la Vacante"
      companyName={empresa?.nombre_empresa}
      onBack={handleReturnToHub}
      navItems={navItems}
      activeSectionId={activeSectionId}
      onSectionSelect={(sectionId) =>
        handleSectionSelect(sectionId as CondicionesVacanteSectionId)
      }
      draftStatus={
        <DraftPersistenceStatus
          savingDraft={savingDraft}
          remoteIdentityState={remoteIdentityState}
          remoteSyncState={remoteSyncState}
          hasPendingAutosave={hasPendingAutosave}
          hasLocalDirtyChanges={hasLocalDirtyChanges}
          hasPendingRemoteSync={hasPendingRemoteSync}
          localDraftSavedAt={localDraftSavedAt}
          draftSavedAt={draftSavedAt}
          localPersistenceState={localPersistenceState}
          localPersistenceMessage={localPersistenceMessage}
          onSave={handleSaveDraft}
          saveDisabled={savingDraft || isFinalizing || !isDocumentEditable}
        />
      }
      notice={
        isReadonlyDraft ? (
          <DraftLockBanner
            onTakeOver={handleTakeOverDraft}
            onBackToDrafts={() => router.push("/hub?panel=drafts")}
          />
        ) : null
      }
      serverError={serverError}
      submitAction={
        <div className="flex flex-wrap justify-end gap-3">
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
      }
      formProps={{
        onSubmit: handleSubmit(handlePrepareSubmit, onInvalid),
        noValidate: true,
      }}
    >
      <LongFormSectionCard
        id="company"
        title="Empresa"
        description={CONDICIONES_COMPANY_SECTION_DESCRIPTION}
        status={sectionStatuses.company}
        collapsed={collapsedSections.company}
        onToggle={() => toggleSection("company")}
        sectionRef={companyRef}
        onFocusCapture={() => setActiveSectionId("company")}
      >
        <CondicionesVacanteCompanySection
          empresa={empresa}
          fechaVisita={values.fecha_visita}
          modalidad={values.modalidad}
          nitEmpresa={values.nit_empresa}
          register={register}
          errors={errors}
          onSelectEmpresa={handleSelectEmpresa}
          disabled={hasEmpresa && !isDocumentEditable}
        />
      </LongFormSectionCard>

      <LongFormSectionCard
        id="vacancy"
        title="Características de la vacante"
        description="Define el perfil base del cargo y revisa las competencias derivadas."
        status={sectionStatuses.vacancy}
        collapsed={collapsedSections.vacancy}
        onToggle={() => toggleSection("vacancy")}
        sectionRef={vacancyRef}
        onFocusCapture={() => setActiveSectionId("vacancy")}
      >
        {hasEmpresa ? (
          <fieldset disabled={!isDocumentEditable}>
            <CondicionesVacanteVacancySection
              register={register}
              errors={errors}
              competencias={values.competencias}
            />
          </fieldset>
        ) : (
          <LongFormDisabledSectionState />
        )}
      </LongFormSectionCard>

      <LongFormSectionCard
        id="education"
        title="Formación, horarios y experiencia"
        description="Agrupa requisitos académicos, horarios, experiencia y herramientas del cargo."
        status={sectionStatuses.education}
        collapsed={collapsedSections.education}
        onToggle={() => toggleSection("education")}
        sectionRef={educationRef}
        onFocusCapture={() => setActiveSectionId("education")}
      >
        {hasEmpresa ? (
          <fieldset disabled={!isDocumentEditable}>
            <CondicionesVacanteEducationSection
              register={register}
              errors={errors}
              values={values}
              getValues={getValues}
              setValue={setValue}
            />
          </fieldset>
        ) : (
          <LongFormDisabledSectionState />
        )}
      </LongFormSectionCard>

      <LongFormSectionCard
        id="capabilities"
        title="Habilidades y capacidades"
        description="Evalúa capacidades cognitivas, motrices y transversales requeridas para el cargo."
        status={sectionStatuses.capabilities}
        collapsed={collapsedSections.capabilities}
        onToggle={() => toggleSection("capabilities")}
        sectionRef={capabilitiesRef}
        onFocusCapture={() => setActiveSectionId("capabilities")}
      >
        {hasEmpresa ? (
          <fieldset disabled={!isDocumentEditable}>
            <CondicionesVacanteCapabilitiesSection
              register={register}
              errors={errors}
              values={values}
              getValues={getValues}
              setValue={setValue}
            />
          </fieldset>
        ) : (
          <LongFormDisabledSectionState />
        )}
      </LongFormSectionCard>

      <LongFormSectionCard
        id="postures"
        title="Posturas y movimientos"
        description="Registra tiempos y frecuencias para cada postura o movimiento del rol."
        status={sectionStatuses.postures}
        collapsed={collapsedSections.postures}
        onToggle={() => toggleSection("postures")}
        sectionRef={posturesRef}
        onFocusCapture={() => setActiveSectionId("postures")}
      >
        {hasEmpresa ? (
          <fieldset disabled={!isDocumentEditable}>
            <CondicionesVacantePosturesSection
              register={register}
              errors={errors}
            />
          </fieldset>
        ) : (
          <LongFormDisabledSectionState />
        )}
      </LongFormSectionCard>

      <LongFormSectionCard
        id="risks"
        title="Peligros y riesgos"
        description="Consolida los factores de riesgo del entorno laboral y sus observaciones."
        status={sectionStatuses.risks}
        collapsed={collapsedSections.risks}
        onToggle={() => toggleSection("risks")}
        sectionRef={risksRef}
        onFocusCapture={() => setActiveSectionId("risks")}
      >
        {hasEmpresa ? (
          <fieldset disabled={!isDocumentEditable}>
            <CondicionesVacanteRisksSection
              register={register}
              errors={errors}
              values={values}
              getValues={getValues}
              setValue={setValue}
            />
          </fieldset>
        ) : (
          <LongFormDisabledSectionState />
        )}
      </LongFormSectionCard>

      <LongFormSectionCard
        id="disabilities"
        title="Discapacidades compatibles"
        description="Gestiona las filas dinámicas de compatibilidad y ajustes razonables."
        status={sectionStatuses.disabilities}
        collapsed={collapsedSections.disabilities}
        onToggle={() => toggleSection("disabilities")}
        sectionRef={disabilitiesRef}
        onFocusCapture={() => setActiveSectionId("disabilities")}
      >
        {hasEmpresa ? (
          <fieldset disabled={!isDocumentEditable}>
            <CondicionesVacanteDisabilitiesSection
              control={control}
              errors={errors}
              setValue={setValue}
              catalogs={catalogs ?? undefined}
              catalogError={catalogError}
              catalogStatus={catalogStatus}
              onRetryCatalog={retryCatalog}
            />
          </fieldset>
        ) : (
          <LongFormDisabledSectionState />
        )}
      </LongFormSectionCard>

      <LongFormSectionCard
        id="recommendations"
        title="Observaciones y recomendaciones"
        description="Incluye el cierre narrativo del perfil y el template del proceso de vacante."
        status={sectionStatuses.recommendations}
        collapsed={collapsedSections.recommendations}
        onToggle={() => toggleSection("recommendations")}
        sectionRef={recommendationsRef}
        onFocusCapture={() => setActiveSectionId("recommendations")}
      >
        {hasEmpresa ? (
          <fieldset disabled={!isDocumentEditable}>
            <CondicionesVacanteRecommendationsSection
              register={register}
              errors={errors}
              recommendations={values.observaciones_recomendaciones}
              getValues={getValues}
              setValue={setValue}
            />
          </fieldset>
        ) : (
          <LongFormDisabledSectionState />
        )}
      </LongFormSectionCard>

      <LongFormSectionCard
        id="attendees"
        title="Asistentes"
        description="Mantiene el modo RECA + Asesor Agencia con fila intermedia libre."
        status={sectionStatuses.attendees}
        collapsed={collapsedSections.attendees}
        onToggle={() => toggleSection("attendees")}
        sectionRef={attendeesRef}
        onFocusCapture={() => setActiveSectionId("attendees")}
      >
        {hasEmpresa ? (
          <fieldset disabled={!isDocumentEditable}>
            <AsistentesSection
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              profesionales={profesionales}
              mode="reca_plus_agency_advisor"
              profesionalAsignado={empresa?.profesional_asignado}
              helperText="Fila 0 profesional RECA, fila intermedia libre y última fila para Asesor Agencia."
              intermediateCargoPlaceholder="Cargo del asistente"
            />
          </fieldset>
        ) : (
          <LongFormDisabledSectionState />
        )}
      </LongFormSectionCard>

      <FormSubmitConfirmDialog
        open={submitConfirmOpen}
        description="Esta acción publicará el acta en Google Sheets. Confirma solo cuando hayas revisado toda la información."
        loading={isFinalizing}
        onCancel={() => {
          if (isFinalizing) {
            return;
          }

          setSubmitConfirmOpen(false);
          setPendingSubmitValues(null);
        }}
        onConfirm={() => {
          void confirmSubmit();
        }}
      />
    </LongFormShell>
  );
}
