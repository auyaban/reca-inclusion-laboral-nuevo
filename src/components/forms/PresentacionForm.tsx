"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import { PresentacionAgreementsSection } from "@/components/forms/presentacion/PresentacionAgreementsSection";
import { PresentacionEmpresaSection } from "@/components/forms/presentacion/PresentacionEmpresaSection";
import {
  PresentacionSectionCard,
  type PresentacionSectionStatus,
} from "@/components/forms/presentacion/PresentacionSectionCard";
import {
  PresentacionSectionNav,
  type PresentacionSectionNavItem,
} from "@/components/forms/presentacion/PresentacionSectionNav";
import { PresentacionMotivacionSection } from "@/components/forms/presentacion/PresentacionMotivacionSection";
import { PresentacionVisitSection } from "@/components/forms/presentacion/PresentacionVisitSection";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import {
  FormCompletionActions,
  type FormCompletionLinks,
} from "@/components/forms/shared/FormCompletionActions";
import { useFormDraftLifecycle } from "@/hooks/useFormDraftLifecycle";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { normalizeAsesorAgenciaAsistentes } from "@/lib/asistentes";
import { returnToHubTab } from "@/lib/actaTabs";
import { findPersistedDraftIdForSession } from "@/lib/drafts";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import {
  getDefaultPresentacionValues,
  normalizePresentacionValues,
} from "@/lib/presentacion";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { startInvalidSubmissionCheckpoint } from "@/lib/invalidSubmissionDraft";
import { getPresentacionValidationTarget } from "@/lib/presentacionValidationNavigation";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  presentacionSchema,
  type PresentacionValues,
} from "@/lib/validations/presentacion";
import { cn } from "@/lib/utils";

type PresentacionContentSectionId =
  | "visit"
  | "motivation"
  | "agreements"
  | "attendees";

type PresentacionSectionId = "company" | PresentacionContentSectionId;

type CollapsedSectionsState = Record<PresentacionSectionId, boolean>;

const STEP_TO_SECTION_ID: Record<number, PresentacionContentSectionId> = {
  0: "visit",
  1: "motivation",
  2: "agreements",
  3: "attendees",
};

const SECTION_TO_STEP: Record<PresentacionContentSectionId, number> = {
  visit: 0,
  motivation: 1,
  agreements: 2,
  attendees: 3,
};

const INITIAL_COLLAPSED_SECTIONS: CollapsedSectionsState = {
  company: false,
  visit: false,
  motivation: false,
  agreements: false,
  attendees: false,
};

const SECTION_LABELS: Record<PresentacionSectionId, string> = {
  company: "Empresa",
  visit: "Datos de la visita",
  motivation: "Motivación",
  agreements: "Acuerdos y observaciones",
  attendees: "Asistentes",
};

function getSectionIdForStep(step: number): PresentacionContentSectionId {
  return STEP_TO_SECTION_ID[step] ?? "visit";
}

function isVisitSectionComplete(values: PresentacionValues) {
  return Boolean(
    values.tipo_visita &&
      values.fecha_visita &&
      values.modalidad &&
      values.nit_empresa.trim()
  );
}

function isMotivationSectionComplete(values: PresentacionValues) {
  return values.motivacion.length > 0;
}

function isAgreementsSectionComplete(values: PresentacionValues) {
  return values.acuerdos_observaciones.trim().length > 0;
}

function isAttendeesSectionComplete(values: PresentacionValues) {
  return (
    values.asistentes.length >= 2 &&
    values.asistentes.every((asistente) => asistente.nombre.trim().length > 0)
  );
}

export default function PresentacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const clearEmpresa = useEmpresaStore((state) => state.clearEmpresa);
  const draftParam = searchParams.get("draft");
  const sessionParam = searchParams.get("session");
  const explicitNewDraft = searchParams.get("new") === "1";
  const [step, setStep] = useState(0);
  const [activeSectionId, setActiveSectionId] =
    useState<PresentacionSectionId>("company");
  const [collapsedSections, setCollapsedSections] = useState(
    INITIAL_COLLAPSED_SECTIONS
  );
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resultLinks, setResultLinks] = useState<FormCompletionLinks | null>(
    null
  );
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
  const companyRef = useRef<HTMLElement | null>(null);
  const visitRef = useRef<HTMLElement | null>(null);
  const motivationRef = useRef<HTMLElement | null>(null);
  const agreementsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const activeSectionIdRef = useRef<PresentacionSectionId>("company");
  const { profesionales } = useProfesionalesCatalog();

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
    slug: "presentacion",
    empresa,
    initialDraftId: draftParam,
    initialLocalDraftSessionId: sessionParam,
  });

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

  const values = watch();
  const motivacion = watch("motivacion");
  const acuerdos = watch("acuerdos_observaciones");
  const formTabLabel = getFormTabLabel("presentacion");
  const isReadonlyDraft = editingAuthorityState === "read_only";
  const hasEmpresa = Boolean(empresa);
  const isDocumentEditable = hasEmpresa && isDraftEditable;

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

  const sectionStatuses = useMemo<
    Record<PresentacionSectionId, PresentacionSectionStatus>
  >(() => {
    const visitComplete = isVisitSectionComplete(values);
    const motivationComplete = isMotivationSectionComplete(values);
    const agreementsComplete = isAgreementsSectionComplete(values);
    const attendeesComplete = isAttendeesSectionComplete(values);
    const errorSectionId = getPresentacionValidationTarget(errors)?.sectionId ?? null;

    function getStatus(
      id: PresentacionSectionId,
      options?: { completed?: boolean; disabled?: boolean }
    ): PresentacionSectionStatus {
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
  }, [activeSectionId, errors, hasEmpresa, values]);

  const navItems = useMemo<PresentacionSectionNavItem[]>(
    () => [
      { id: "company", label: SECTION_LABELS.company, shortLabel: "Empresa", status: sectionStatuses.company },
      { id: "visit", label: SECTION_LABELS.visit, shortLabel: "Visita", status: sectionStatuses.visit },
      { id: "motivation", label: SECTION_LABELS.motivation, shortLabel: "Motivación", status: sectionStatuses.motivation },
      { id: "agreements", label: SECTION_LABELS.agreements, shortLabel: "Acuerdos", status: sectionStatuses.agreements },
      { id: "attendees", label: SECTION_LABELS.attendees, shortLabel: "Asistentes", status: sectionStatuses.attendees },
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

  const scrollToSection = useCallback(
    (sectionId: PresentacionSectionId) => {
      const element = sectionRefs[sectionId].current;
      if (!element) {
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSectionId(sectionId);

      if (sectionId !== "company") {
        setStep(SECTION_TO_STEP[sectionId]);
      }
    },
    [sectionRefs]
  );

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
    [scrollToSection]
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
      const nextSectionId = getSectionIdForStep(nextStep);

      setEmpresa(nextEmpresa);
      reset(normalizedValues);
      setStep(nextStep);
      setActiveSectionId(nextSectionId);
      setCollapsedSections(INITIAL_COLLAPSED_SECTIONS);
      resumeDraftLifecycle();
      setSubmitted(false);
      setResultLinks(null);
      setServerError(null);

      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [reset, resumeDraftLifecycle, setEmpresa]
  );

  const resolveLocalEmpresa = useCallback(
    (localEmpresa: Empresa | null) => localEmpresa ?? empresa ?? null,
    [empresa]
  );

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
      if (draftParam) {
        const routeKey = `draft:${draftParam}`;
        if (isRouteHydrated(routeKey)) {
          setRestoringDraft(false);
          return;
        }

        setRestoringDraft(true);
        const localDraft = await loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);

        if (localDraft && localEmpresa) {
          if (cancelled) {
            return;
          }

          restoreFormState(localDraft.data, localEmpresa, localDraft.step);
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
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      if (!hasSessionParam) {
        markRouteHydrated(null);
        setRestoringDraft(false);
        if (!empresa) {
          reset(getDefaultPresentacionValues(null));
          setStep(0);
          setActiveSectionId("company");
          setCollapsedSections(INITIAL_COLLAPSED_SECTIONS);
          setServerError(null);
        }
        return;
      }

      const sessionId = sessionParam?.trim() ?? null;
      const routeKey = `session:${sessionId}:${explicitNewDraft ? "new" : "default"}`;
      if (isRouteHydrated(routeKey)) {
        setRestoringDraft(false);
        return;
      }

      setRestoringDraft(true);

      if (sessionId) {
        const persistedDraftId = findPersistedDraftIdForSession(
          "presentacion",
          sessionId
        );
        if (persistedDraftId) {
          router.replace(
            buildFormEditorUrl("presentacion", {
              draftId: persistedDraftId,
            })
          );
          return;
        }
      }

      const localDraft = await loadLocal();
      const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);

      if (localDraft && localEmpresa) {
        if (cancelled) {
          return;
        }

        restoreFormState(localDraft.data, localEmpresa, localDraft.step);
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      if (empresa) {
        reset(
          normalizePresentacionValues(
            getDefaultPresentacionValues(empresa),
            empresa
          )
        );
        setStep(0);
        setActiveSectionId("visit");
        setCollapsedSections(INITIAL_COLLAPSED_SECTIONS);
        setServerError(null);
      } else {
        reset(getDefaultPresentacionValues(null));
        setStep(0);
        setActiveSectionId("company");
        setCollapsedSections(INITIAL_COLLAPSED_SECTIONS);
      }

      markRouteHydrated(routeKey);
      setRestoringDraft(false);
    }

    void hydrateRoute();

    return () => {
      cancelled = true;
    };
  }, [
    draftParam,
    empresa,
    explicitNewDraft,
    loadDraft,
    loadLocal,
    reset,
    resolveLocalEmpresa,
    restoreFormState,
    sessionParam,
    isRouteHydrated,
    markRouteHydrated,
    router,
    setRestoringDraft,
  ]);

  useEffect(() => {
    if (
      !activeDraftId ||
      draftParam ||
      !sessionParam?.trim() ||
      restoringDraft ||
      draftLifecycleSuspended
    ) {
      return;
    }

    markRouteHydrated(`draft:${activeDraftId}`);
    router.replace(
      buildFormEditorUrl("presentacion", {
        draftId: activeDraftId,
      })
    );
  }, [
    activeDraftId,
    draftParam,
    draftLifecycleSuspended,
    markRouteHydrated,
    restoringDraft,
    router,
    sessionParam,
  ]);

  useEffect(() => {
    if (draftParam || sessionParam?.trim() || !empresa) {
      return;
    }

    const nextSessionId = localDraftSessionId;
    markRouteHydrated(`session:${nextSessionId}:${explicitNewDraft ? "new" : "default"}`);
    router.replace(
      buildFormEditorUrl("presentacion", {
        sessionId: nextSessionId,
        isNewDraft: explicitNewDraft,
      })
    );
  }, [
    draftParam,
    empresa,
    draftLifecycleSuspended,
    explicitNewDraft,
    localDraftSessionId,
    markRouteHydrated,
    router,
    sessionParam,
  ]);

  useEffect(() => {
    activeSectionIdRef.current = activeSectionId;
  }, [activeSectionId]);

  useEffect(() => {
    const refs = [
      { id: "company" as const, ref: companyRef },
      { id: "visit" as const, ref: visitRef },
      { id: "motivation" as const, ref: motivationRef },
      { id: "agreements" as const, ref: agreementsRef },
      { id: "attendees" as const, ref: attendeesRef },
    ];

    let frame = 0;

    function updateActiveSectionFromScroll() {
      frame = 0;

      let nextSectionId: PresentacionSectionId = activeSectionIdRef.current;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const item of refs) {
        const element = item.ref.current;
        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const distance = Math.abs(rect.top - 148);
        if (rect.bottom <= 120) {
          continue;
        }

        if (distance < closestDistance) {
          closestDistance = distance;
          nextSectionId = item.id;
        }
      }

      setActiveSectionId((current) =>
        current === nextSectionId
          ? current
          : ((activeSectionIdRef.current = nextSectionId), nextSectionId)
      );
    }

    function handleScrollOrResize() {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(updateActiveSectionFromScroll);
    }

    handleScrollOrResize();
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  useEffect(() => {
    if (activeSectionId === "company") {
      return;
    }

    setStep((currentStep) => {
      const nextStep = SECTION_TO_STEP[activeSectionId];
      return currentStep === nextStep ? currentStep : nextStep;
    });
  }, [activeSectionId]);

  function toggleSection(sectionId: PresentacionSectionId) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

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
    setCollapsedSections(INITIAL_COLLAPSED_SECTIONS);
    resumeDraftLifecycle();
    setSubmitted(false);
    setResultLinks(null);
    setServerError(null);
    markRouteHydrated(
      `session:${nextSessionId}:${explicitNewDraft ? "new" : "default"}`
    );

    router.replace(nextRoute);
    window.setTimeout(() => {
      scrollToSection("visit");
    }, 0);
  }

  function handleSectionSelect(sectionId: PresentacionSectionId) {
    if (sectionId !== "company" && !hasEmpresa) {
      return;
    }

    if (collapsedSections[sectionId]) {
      setCollapsedSections((current) => ({
        ...current,
        [sectionId]: false,
      }));
    }

    scrollToSection(sectionId);
  }

  async function handleSaveDraft() {
    if (!isDocumentEditable) {
      return false;
    }

    const normalizedValues = normalizePresentacionValues(getValues(), empresa);
    const nextValues: PresentacionValues = {
      ...normalizedValues,
      asistentes: normalizeAsesorAgenciaAsistentes(normalizedValues.asistentes),
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
        buildFormEditorUrl("presentacion", {
          draftId: result.draftId,
        })
      );
    }

    return true;
  }

  async function onSubmit(data: PresentacionValues) {
    if (!isDocumentEditable || !empresa) {
      return;
    }

    setServerError(null);

    const normalizedValues = normalizePresentacionValues(data, empresa);
    const normalizedData: PresentacionValues = {
      ...normalizedValues,
      asistentes: normalizeAsesorAgenciaAsistentes(normalizedValues.asistentes),
    };

    try {
      const response = await fetch("/api/formularios/presentacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...normalizedData, empresa }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Error al guardar");
      }

      setResultLinks({ sheetLink: json.sheetLink, pdfLink: json.pdfLink });
      suspendDraftLifecycle();
      await clearDraft(activeDraftId ?? undefined, {
        sessionId: localDraftSessionId,
      });
      markRouteHydrated(null);
      router.replace(buildFormEditorUrl("presentacion"));
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Error al guardar el formulario."
      );
    }
  }

  function onInvalid(nextErrors: FieldErrors<PresentacionValues>) {
    const validationTarget = getPresentacionValidationTarget(nextErrors);
    navigateToValidationTarget(validationTarget);

    if (!validationTarget || !isDocumentEditable || !empresa) {
      return;
    }

    const normalizedValues = normalizePresentacionValues(getValues(), empresa);
    const nextValues: PresentacionValues = {
      ...normalizedValues,
      asistentes: normalizeAsesorAgenciaAsistentes(normalizedValues.asistentes),
    };

    startInvalidSubmissionCheckpoint({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          SECTION_TO_STEP[validationTarget.sectionId],
          nextValues as Record<string, unknown>,
          "interval"
        ),
      onPromoteDraft: (nextDraftId) => {
        markRouteHydrated(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("presentacion", {
            draftId: nextDraftId,
          })
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

  function handleStartNewForm() {
    startNewDraftSession();
    clearEmpresa();
    setSubmitted(false);
    resumeDraftLifecycle();
    setResultLinks(null);
    setServerError(null);
    reset(getDefaultPresentacionValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_COLLAPSED_SECTIONS);
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("presentacion", { isNewDraft: true }));
  }

  function handleReturnToHub() {
    void returnToHubTab("/hub");
  }

  if (
    (draftParam && (restoringDraft || loadingDraft)) ||
    (sessionParam && restoringDraft)
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
            ¡Formulario guardado!
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            La presentación del programa para{" "}
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
            onClick={() => router.push("/hub")}
            className="mb-3 flex items-center gap-1.5 text-sm text-reca-200 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al menú
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">
                Presentación / Reactivación del Programa
              </h1>
              <p className="mt-0.5 text-sm text-reca-200">
                {empresa?.nombre_empresa ?? "Nueva acta"}
              </p>
            </div>

          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <PresentacionSectionNav
            items={navItems}
            activeSectionId={activeSectionId}
            onSelect={(sectionId) =>
              handleSectionSelect(sectionId as PresentacionSectionId)
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
                saveDisabled={savingDraft || !isDocumentEditable}
              />
            }
          />

          <div className="space-y-6">
            {isReadonlyDraft && (
              <DraftLockBanner
                onTakeOver={handleTakeOverDraft}
                onBackToDrafts={() => router.push("/hub?panel=drafts")}
              />
            )}

            {serverError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <PresentacionSectionCard
              id="company"
              title="Empresa"
              description="Busca y confirma la empresa sobre la que se diligencia esta acta."
              status={sectionStatuses.company}
              collapsed={collapsedSections.company}
              onToggle={() => toggleSection("company")}
              sectionRef={companyRef}
              onFocusCapture={() => setActiveSectionId("company")}
            >
              <PresentacionEmpresaSection
                empresa={empresa}
                onSelectEmpresa={handleSelectEmpresa}
              />
            </PresentacionSectionCard>

            <PresentacionSectionCard
              id="visit"
              title="Datos de la visita"
              description="Información general de la visita, fecha y modalidad."
              status={sectionStatuses.visit}
              collapsed={collapsedSections.visit}
              onToggle={() => toggleSection("visit")}
              sectionRef={visitRef}
              onFocusCapture={() => setActiveSectionId("visit")}
            >
              <fieldset disabled={!isDocumentEditable}>
                <PresentacionVisitSection
                  register={register}
                  errors={errors}
                />
              </fieldset>
            </PresentacionSectionCard>

            <PresentacionSectionCard
              id="motivation"
              title="Motivación"
              description="Razones por las que la empresa participa en el programa."
              status={sectionStatuses.motivation}
              collapsed={collapsedSections.motivation}
              onToggle={() => toggleSection("motivation")}
              sectionRef={motivationRef}
              onFocusCapture={() => setActiveSectionId("motivation")}
            >
              <fieldset disabled={!isDocumentEditable}>
                <PresentacionMotivacionSection
                  register={register}
                  errors={errors}
                  motivacion={motivacion ?? []}
                />
              </fieldset>
            </PresentacionSectionCard>

            <PresentacionSectionCard
              id="agreements"
              title="Acuerdos y observaciones"
              description="Registro narrativo de compromisos, observaciones y acuerdos."
              status={sectionStatuses.agreements}
              collapsed={collapsedSections.agreements}
              onToggle={() => toggleSection("agreements")}
              sectionRef={agreementsRef}
              onFocusCapture={() => setActiveSectionId("agreements")}
            >
              <fieldset disabled={!isDocumentEditable}>
                <PresentacionAgreementsSection
                  register={register}
                  errors={errors}
                  acuerdos={acuerdos ?? ""}
                  getValues={getValues}
                  setValue={setValue}
                />
              </fieldset>
            </PresentacionSectionCard>

            <PresentacionSectionCard
              id="attendees"
              title="Asistentes"
              description="Participantes de la visita y asesoría involucrada."
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
                  profesionalAsignado={empresa?.profesional_asignado}
                />
              </fieldset>
            </PresentacionSectionCard>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit(onSubmit, onInvalid)}
                disabled={isSubmitting || !isDocumentEditable}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-reca px-6 py-2.5 text-sm font-semibold text-white transition-colors",
                  "hover:bg-reca-dark disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
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
        </div>
      </main>
    </div>
  );
}
