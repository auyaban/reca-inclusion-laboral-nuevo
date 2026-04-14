"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import { SensibilizacionCompanySection } from "@/components/forms/sensibilizacion/SensibilizacionCompanySection";
import { SensibilizacionObservationsSection } from "@/components/forms/sensibilizacion/SensibilizacionObservationsSection";
import { SensibilizacionVisitSection } from "@/components/forms/sensibilizacion/SensibilizacionVisitSection";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import {
  FormCompletionActions,
  type FormCompletionLinks,
} from "@/components/forms/shared/FormCompletionActions";
import {
  FormSubmitConfirmDialog,
} from "@/components/forms/shared/FormSubmitConfirmDialog";
import {
  LongFormSectionCard,
  type LongFormSectionStatus,
} from "@/components/forms/shared/LongFormSectionCard";
import {
  LongFormSectionNav,
  type LongFormSectionNavItem,
} from "@/components/forms/shared/LongFormSectionNav";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useFormDraftLifecycle } from "@/hooks/useFormDraftLifecycle";
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
import { startInvalidSubmissionCheckpoint } from "@/lib/invalidSubmissionDraft";
import {
  buildSensibilizacionSessionRouteKey,
  resolveSensibilizacionDraftHydration,
  resolveSensibilizacionSessionHydration,
} from "@/lib/sensibilizacionHydration";
import {
  getDefaultSensibilizacionValues,
  normalizeSensibilizacionValues,
} from "@/lib/sensibilizacion";
import {
  getSensibilizacionCompatStepForSection,
  getSensibilizacionSectionIdForStep,
  INITIAL_SENSIBILIZACION_COLLAPSED_SECTIONS,
  isSensibilizacionAttendeesSectionComplete,
  isSensibilizacionObservationsSectionComplete,
  isSensibilizacionVisitSectionComplete,
  SENSIBILIZACION_SECTION_LABELS,
  type SensibilizacionSectionId,
} from "@/lib/sensibilizacionSections";
import { getSensibilizacionValidationTarget } from "@/lib/sensibilizacionValidationNavigation";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  sensibilizacionSchema,
  type SensibilizacionValues,
} from "@/lib/validations/sensibilizacion";
import { cn } from "@/lib/utils";

export default function SensibilizacionForm() {
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
    useState<SensibilizacionValues | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const [resultLinks, setResultLinks] = useState<FormCompletionLinks | null>(null);
  const appliedAssignedCargoKeyRef = useRef<string | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const visitRef = useRef<HTMLElement | null>(null);
  const observationsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();
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
    loadLocal,
    checkpointDraft,
    saveDraft,
    clearDraft,
    loadDraft,
    takeOverDraft,
    startNewDraftSession,
  } = useFormDraft({
    slug: "sensibilizacion",
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
  } = useForm<SensibilizacionValues>({
    resolver: zodResolver(sensibilizacionSchema),
    defaultValues: getDefaultSensibilizacionValues(empresa),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const values = watch();
  const observaciones = watch("observaciones") ?? "";
  const isReadonlyDraft = editingAuthorityState === "read_only";
  const formTabLabel = getFormTabLabel("sensibilizacion");
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;
  const sectionRefs = useMemo(
    () => ({
      company: companyRef,
      visit: visitRef,
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
  } = useLongFormSections<SensibilizacionSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_SENSIBILIZACION_COLLAPSED_SECTIONS,
    sectionRefs,
  });

  const sectionStatuses = useMemo<
    Record<SensibilizacionSectionId, LongFormSectionStatus>
  >(() => {
    const errorSectionId =
      getSensibilizacionValidationTarget(errors)?.sectionId ?? null;

    function getStatus(
      id: SensibilizacionSectionId,
      options?: { completed?: boolean; disabled?: boolean }
    ): LongFormSectionStatus {
      if (activeSectionId === id) return "active";
      if (options?.disabled) return "disabled";
      if (errorSectionId === id) return "error";
      if (options?.completed) return "completed";
      return "idle";
    }

    return {
      company: getStatus("company", { completed: hasEmpresa }),
      visit: getStatus("visit", {
        completed: hasEmpresa && isSensibilizacionVisitSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      observations: getStatus("observations", {
        completed:
          hasEmpresa && isSensibilizacionObservationsSectionComplete(values),
        disabled: !hasEmpresa,
      }),
      attendees: getStatus("attendees", {
        completed: hasEmpresa && isSensibilizacionAttendeesSectionComplete(values),
        disabled: !hasEmpresa,
      }),
    };
  }, [activeSectionId, errors, hasEmpresa, values]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () => [
      {
        id: "company",
        label: SENSIBILIZACION_SECTION_LABELS.company,
        shortLabel: "Empresa",
        status: sectionStatuses.company,
      },
      {
        id: "visit",
        label: SENSIBILIZACION_SECTION_LABELS.visit,
        shortLabel: "Visita",
        status: sectionStatuses.visit,
      },
      {
        id: "observations",
        label: SENSIBILIZACION_SECTION_LABELS.observations,
        shortLabel: "Observaciones",
        status: sectionStatuses.observations,
      },
      {
        id: "attendees",
        label: SENSIBILIZACION_SECTION_LABELS.attendees,
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
    (validationTarget: ReturnType<typeof getSensibilizacionValidationTarget>) => {
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
      valuesToRestore: Partial<SensibilizacionValues> | Record<string, unknown>,
      nextEmpresa: Empresa,
      nextStep: number
    ) => {
      appliedAssignedCargoKeyRef.current = null;
      setIsBootstrappingForm(true);
      setEmpresa(nextEmpresa);
      reset(normalizeSensibilizacionValues(valuesToRestore, nextEmpresa));
      setStep(nextStep);
      setActiveSectionId(getSensibilizacionSectionIdForStep(nextStep));
      setCollapsedSections(INITIAL_SENSIBILIZACION_COLLAPSED_SECTIONS);
      setSubmitted(false);
      setResultLinks(null);
      resumeDraftLifecycle();
      setServerError(null);
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [reset, resumeDraftLifecycle, setEmpresa, setCollapsedSections, setActiveSectionId]
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
        const draftHydrationAction = resolveSensibilizacionDraftHydration({
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
      const routeKey = buildSensibilizacionSessionRouteKey(
        sessionId,
        explicitNewDraft
      );

      if (!empresa && !hasSessionParam) {
        setRestoringDraft(false);
        setActiveSectionId("company");
        return;
      }

      if (!hasSessionParam) {
        router.replace(buildFormEditorUrl("sensibilizacion", { sessionId }), {
          scroll: false,
        });
      }

      const persistedDraftId = findPersistedDraftIdForSession(
        "sensibilizacion",
        sessionId
      );
      const localDraft = hasSessionParam ? await loadLocal() : null;
      const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);
      const sessionHydrationAction = resolveSensibilizacionSessionHydration({
        hasEmpresa: Boolean(empresa),
        hasSessionParam,
        persistedDraftId,
        hasRestorableLocalDraft: Boolean(localDraft && localEmpresa),
        isRouteHydrated: isRouteHydrated(routeKey),
      });

      if (sessionHydrationAction === "redirect_to_draft" && persistedDraftId) {
        router.replace(
          buildFormEditorUrl("sensibilizacion", {
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

      applyFormState(getDefaultSensibilizacionValues(empresa), empresa, 0);
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
      buildFormEditorUrl("sensibilizacion", {
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

    const nextStep = getSensibilizacionCompatStepForSection(activeSectionId);
    if (nextStep !== step) {
      setStep(nextStep);
    }
  }, [activeSectionId, step]);

  const handleSelectEmpresa = useCallback(
    (nextEmpresa: Empresa) => {
      const nextSessionId = sessionParam?.trim() || startNewDraftSession();
      const nextRoute = buildFormEditorUrl("sensibilizacion", {
        sessionId: nextSessionId,
        isNewDraft: explicitNewDraft,
      });

      setEmpresa(nextEmpresa);
      reset(getDefaultSensibilizacionValues(nextEmpresa));
      setStep(0);
      setActiveSectionId("visit");
      setCollapsedSections(INITIAL_SENSIBILIZACION_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setSubmitted(false);
      setResultLinks(null);
      setServerError(null);
      markRouteHydrated(
        `session:${nextSessionId}:${explicitNewDraft ? "new" : "default"}`
      );
      router.replace(nextRoute, { scroll: false });
      window.setTimeout(() => {
        scrollToSection("visit");
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

  function handleSectionSelect(sectionId: SensibilizacionSectionId) {
    if (sectionId !== "company" && !hasEmpresa) {
      return;
    }

    selectSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) {
      return false;
    }

    const normalizedValues = normalizeSensibilizacionValues(getValues(), empresa);
    const nextValues: SensibilizacionValues = {
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
    if (result.draftId && draftParam !== result.draftId) {
      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("sensibilizacion", {
          draftId: result.draftId,
        }),
        { scroll: false }
      );
    }

    return true;
  }

  function handlePrepareSubmit(data: SensibilizacionValues) {
    if (!isDocumentEditable) {
      return;
    }

    const normalizedData: SensibilizacionValues = {
      ...data,
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
      const asistentes = getMeaningfulAsistentes(
        normalizePersistedAsistentesForMode(pendingSubmitValues.asistentes, {
          mode: "reca_plus_generic_attendees",
          profesionalAsignado: empresa?.profesional_asignado,
        })
      );
      const response = await fetch("/api/formularios/sensibilizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingSubmitValues,
          asistentes,
          empresa,
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
          buildFormEditorUrl("sensibilizacion")
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

  function onInvalid(nextErrors: FieldErrors<SensibilizacionValues>) {
    const validationTarget = getSensibilizacionValidationTarget(nextErrors);
    navigateToValidationTarget(validationTarget);

    if (!validationTarget || !isDocumentEditable || !empresa) {
      return;
    }

    const normalizedValues = normalizeSensibilizacionValues(getValues(), empresa);
    const nextValues: SensibilizacionValues = {
      ...normalizedValues,
      asistentes: normalizePersistedAsistentesForMode(
        normalizedValues.asistentes,
        {
          mode: "reca_plus_generic_attendees",
          profesionalAsignado: empresa?.profesional_asignado,
        }
      ),
    };

    startInvalidSubmissionCheckpoint({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          getSensibilizacionCompatStepForSection(validationTarget.sectionId),
          nextValues as Record<string, unknown>,
          "interval"
        ),
      onPromoteDraft: (nextDraftId) => {
        markRouteHydrated(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("sensibilizacion", {
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

  function handleTakeOverDraft() {
    takeOverDraftWithFeedback(takeOverDraft, setServerError);
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
    reset(getDefaultSensibilizacionValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_SENSIBILIZACION_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("sensibilizacion", { isNewDraft: true }));
  }

  if (
    (draftParam && (restoringDraft || loadingDraft)) ||
    (!draftParam && !empresa && restoringDraft)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-reca" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Recuperando acta
            </p>
            <p className="text-sm text-gray-500">
              Estamos reconstruyendo el documento guardado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (draftParam && !empresa && !restoringDraft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">
            No se pudo abrir el borrador
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {serverError ??
              "No fue posible reconstruir la empresa asociada a este borrador."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/hub?panel=drafts")}
            className="mt-4 rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
          >
            Volver a borradores
          </button>
        </div>
      </div>
    );
  }

  if (submitted && empresa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Formulario guardado
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            La sensibilización para{" "}
            <span className="font-semibold text-gray-700">
              {empresa.nombre_empresa}
            </span>{" "}
            fue registrada correctamente.
          </p>

          <FormCompletionActions links={resultLinks} className="mb-4" />

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleReturnToHub}
              className="w-full rounded-xl bg-reca py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
            >
              Volver al menú
            </button>
            <button
              type="button"
              onClick={handleStartNewForm}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Nuevo formulario
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={handleReturnToHub}
            className="mb-3 flex items-center gap-1.5 text-sm text-reca-200 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al menú
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">
                Sensibilización
              </h1>
              <p className="mt-0.5 text-sm text-reca-200">
                {empresa?.nombre_empresa ?? "Nueva acta"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <form
          onSubmit={handleSubmit(handlePrepareSubmit, onInvalid)}
          noValidate
          className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"
        >
          <LongFormSectionNav
            items={navItems}
            activeSectionId={activeSectionId}
            onSelect={(sectionId) =>
              handleSectionSelect(sectionId as SensibilizacionSectionId)
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
          />

          <div className="space-y-6">
            {isReadonlyDraft ? (
              <DraftLockBanner
                onTakeOver={handleTakeOverDraft}
                onBackToDrafts={() => router.push("/hub?panel=drafts")}
              />
            ) : null}

            {serverError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            ) : null}

            <LongFormSectionCard
              id="company"
              title="Empresa"
              description="Busca y confirma la empresa sobre la que se diligencia esta acta."
              status={sectionStatuses.company}
              collapsed={collapsedSections.company}
              onToggle={() => toggleSection("company")}
              sectionRef={companyRef}
              onFocusCapture={() => setActiveSectionId("company")}
            >
              <SensibilizacionCompanySection
                empresa={empresa}
                onSelectEmpresa={handleSelectEmpresa}
              />
            </LongFormSectionCard>

            <LongFormSectionCard
              id="visit"
              title="Datos de la visita"
              description="Información base de la jornada realizada con la empresa."
              status={sectionStatuses.visit}
              collapsed={collapsedSections.visit}
              onToggle={() => toggleSection("visit")}
              sectionRef={visitRef}
              onFocusCapture={() => setActiveSectionId("visit")}
            >
              <fieldset disabled={!isDocumentEditable}>
                <SensibilizacionVisitSection
                  register={register}
                  errors={errors}
                />
              </fieldset>
            </LongFormSectionCard>

            <LongFormSectionCard
              id="observations"
              title="Observaciones"
              description="Registro narrativo de la jornada, acuerdos y hallazgos."
              status={sectionStatuses.observations}
              collapsed={collapsedSections.observations}
              onToggle={() => toggleSection("observations")}
              sectionRef={observationsRef}
              onFocusCapture={() => setActiveSectionId("observations")}
            >
              <fieldset disabled={!isDocumentEditable}>
                <SensibilizacionObservationsSection
                  register={register}
                  errors={errors}
                  observaciones={observaciones}
                  getValues={getValues}
                  setValue={setValue}
                />
              </fieldset>
            </LongFormSectionCard>

            <LongFormSectionCard
              id="attendees"
              title="Asistentes"
              description="Participantes de la jornada."
              status={sectionStatuses.attendees}
              collapsed={collapsedSections.attendees}
              onToggle={() => toggleSection("attendees")}
              sectionRef={attendeesRef}
              onFocusCapture={() => setActiveSectionId("attendees")}
            >
              <fieldset disabled={!isDocumentEditable}>
                <AsistentesSection
                  control={control}
                  register={register}
                  setValue={setValue}
                  errors={errors}
                  profesionales={profesionales}
                  mode="reca_plus_generic_attendees"
                  profesionalAsignado={empresa?.profesional_asignado}
                  helperText="Si agregas una fila, diligencia nombre y cargo."
                  intermediateCargoPlaceholder="Cargo"
                />
              </fieldset>
            </LongFormSectionCard>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isFinalizing || !isDocumentEditable}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-reca px-6 py-2.5 text-sm font-semibold text-white transition-colors",
                  "hover:bg-reca-dark disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isSubmitting || isFinalizing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isFinalizing ? "Enviando..." : "Validando..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Finalizar
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      <FormSubmitConfirmDialog
        open={submitConfirmOpen}
        description="Esta acción publicará el acta en Google Sheets. Confirma solo cuando hayas revisado la información."
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
    </div>
  );
}
