"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Save,
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
import { useFormDraft } from "@/hooks/useFormDraft";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { normalizeAsesorAgenciaAsistentes } from "@/lib/asistentes";
import { returnToHubTab } from "@/lib/actaTabs";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import {
  getDefaultPresentacionValues,
  normalizePresentacionValues,
} from "@/lib/presentacion";
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

function getSectionIdForErrors(
  errors: FieldErrors<PresentacionValues>
): PresentacionContentSectionId | null {
  if (
    errors.tipo_visita ||
    errors.fecha_visita ||
    errors.modalidad ||
    errors.nit_empresa
  ) {
    return "visit";
  }

  if (errors.motivacion) {
    return "motivation";
  }

  if (errors.acuerdos_observaciones) {
    return "agreements";
  }

  if (errors.asistentes) {
    return "attendees";
  }

  return null;
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
  const [draftLifecycleSuspended, setDraftLifecycleSuspended] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resultLinks, setResultLinks] = useState<{
    sheetLink?: string;
    pdfLink?: string;
  } | null>(null);
  const [restoringDraft, setRestoringDraft] = useState(
    Boolean(draftParam || sessionParam?.trim())
  );
  const hydratedRouteRef = useRef<string | null>(null);
  const companyRef = useRef<HTMLElement | null>(null);
  const visitRef = useRef<HTMLElement | null>(null);
  const motivationRef = useRef<HTMLElement | null>(null);
  const agreementsRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);
  const { profesionales } = useProfesionalesCatalog();

  const {
    activeDraftId,
    loadingDraft,
    savingDraft,
    draftSavedAt,
    localDraftSavedAt,
    remoteIdentityState,
    remoteSyncState,
    editingAuthorityState,
    isDraftEditable,
    hasPendingAutosave,
    hasPendingRemoteSync,
    autosave,
    loadLocal,
    saveDraft,
    clearDraft,
    loadDraft,
    ensureDraftIdentity,
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
    const errorSectionId = getSectionIdForErrors(errors);

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
      setDraftLifecycleSuspended(false);
      setSubmitted(false);
      setResultLinks(null);
      setServerError(null);

      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [reset, setEmpresa]
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
        if (hydratedRouteRef.current === routeKey) {
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
          hydratedRouteRef.current = routeKey;
          setRestoringDraft(false);
          return;
        }

        const result = await loadDraft(draftParam);
        if (cancelled) {
          return;
        }

        if (!result.draft || !result.empresa) {
          setServerError(result.error ?? "No se pudo cargar el borrador.");
          hydratedRouteRef.current = routeKey;
          setRestoringDraft(false);
          return;
        }

        restoreFormState(result.draft.data, result.empresa, result.draft.step);
        hydratedRouteRef.current = routeKey;
        setRestoringDraft(false);
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      if (!hasSessionParam) {
        hydratedRouteRef.current = null;
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
      if (hydratedRouteRef.current === routeKey) {
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
        hydratedRouteRef.current = routeKey;
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

      hydratedRouteRef.current = routeKey;
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
  ]);

  useEffect(() => {
    if (
      restoringDraft ||
      draftLifecycleSuspended ||
      !empresa ||
      draftParam ||
      activeDraftId ||
      remoteIdentityState !== "idle"
    ) {
      return;
    }

    let cancelled = false;

    async function prepareRemoteDraft() {
      const result = await ensureDraftIdentity(
        step,
        getValues() as Record<string, unknown>
      );

      if (cancelled || !result.ok || !result.draftId) {
        return;
      }

      hydratedRouteRef.current = `draft:${result.draftId}`;
      router.replace(
        buildFormEditorUrl("presentacion", {
          draftId: result.draftId,
        })
      );
    }

    void prepareRemoteDraft();

    return () => {
      cancelled = true;
    };
  }, [
    activeDraftId,
    draftParam,
    empresa,
    ensureDraftIdentity,
    getValues,
    remoteIdentityState,
    draftLifecycleSuspended,
    restoringDraft,
    router,
    step,
  ]);

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

      let nextSectionId: PresentacionSectionId = activeSectionId;
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
        current === nextSectionId ? current : nextSectionId
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
  }, [activeSectionId]);

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
    setDraftLifecycleSuspended(false);
    setSubmitted(false);
    setResultLinks(null);
    setServerError(null);
    hydratedRouteRef.current = `session:${nextSessionId}:${explicitNewDraft ? "new" : "default"}`;

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
      return;
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
      return;
    }

    setServerError(null);
    if (result.draftId && draftParam !== result.draftId) {
      hydratedRouteRef.current = `draft:${result.draftId}`;
      router.replace(
        buildFormEditorUrl("presentacion", {
          draftId: result.draftId,
        })
      );
    }
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
      setDraftLifecycleSuspended(true);
      await clearDraft(activeDraftId ?? undefined);
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
    const errorSectionId = getSectionIdForErrors(nextErrors);
    if (!errorSectionId) {
      setServerError("Revisa los campos resaltados antes de finalizar.");
      return;
    }

    setCollapsedSections((current) => ({
      ...current,
      [errorSectionId]: false,
    }));
    setServerError("Revisa los campos resaltados antes de finalizar.");
    scrollToSection(errorSectionId);
  }

  function handleTakeOverDraft() {
    const didTakeOver = takeOverDraft();
    if (!didTakeOver) {
      setServerError(
        "No se pudo tomar el control del borrador. Inténtalo de nuevo en unos segundos."
      );
      return;
    }

    setServerError(null);
  }

  function handleStartNewForm() {
    startNewDraftSession();
    clearEmpresa();
    setSubmitted(false);
    setDraftLifecycleSuspended(false);
    setResultLinks(null);
    setServerError(null);
    reset(getDefaultPresentacionValues(null));
    setStep(0);
    setActiveSectionId("company");
    setCollapsedSections(INITIAL_COLLAPSED_SECTIONS);
    hydratedRouteRef.current = null;
    router.replace(buildFormEditorUrl("presentacion", { isNewDraft: true }));
  }

  function closeCompletedTab() {
    window.setTimeout(() => {
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.focus();
        } catch {
          // ignore
        }
      }

      window.close();
    }, 50);
  }

  function handleOpenBothResults() {
    if (!resultLinks?.sheetLink || !resultLinks?.pdfLink) {
      return;
    }

    window.open(resultLinks.sheetLink, "_blank", "noopener,noreferrer");
    window.open(resultLinks.pdfLink, "_blank", "noopener,noreferrer");
    closeCompletedTab();
  }

  function handleOpenSheetResult() {
    if (!resultLinks?.sheetLink) {
      return;
    }

    window.open(resultLinks.sheetLink, "_blank", "noopener,noreferrer");
    closeCompletedTab();
  }

  function handleOpenPdfResult() {
    if (!resultLinks?.pdfLink) {
      return;
    }

    window.open(resultLinks.pdfLink, "_blank", "noopener,noreferrer");
    closeCompletedTab();
  }

  function handleReturnToHub() {
    returnToHubTab("/hub");
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

          {resultLinks && (
            <div className="mb-4 flex flex-col gap-2">
              {resultLinks.sheetLink && resultLinks.pdfLink && (
                <button
                  type="button"
                  onClick={handleOpenBothResults}
                  className="flex w-full items-center gap-2 rounded-xl border border-reca-200 bg-reca-50 px-4 py-2.5 text-sm font-semibold text-reca transition-colors hover:bg-reca-100"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Abrir acta y PDF
                </button>
              )}
              {resultLinks.sheetLink && (
                <button
                  type="button"
                  onClick={handleOpenSheetResult}
                  className="flex w-full items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Ver acta en Google Sheets
                </button>
              )}
              {resultLinks.pdfLink && (
                <button
                  type="button"
                  onClick={handleOpenPdfResult}
                  className="flex w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <FileText className="h-4 w-4" />
                  Ver PDF en Drive
                </button>
              )}
            </div>
          )}

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

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || !isDocumentEditable}
              title="Guardar borrador"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              {savingDraft ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {savingDraft ? "Guardando..." : "Borrador"}
            </button>
          </div>

          <DraftPersistenceStatus
            savingDraft={savingDraft}
            remoteIdentityState={remoteIdentityState}
            remoteSyncState={remoteSyncState}
            hasPendingAutosave={hasPendingAutosave}
            hasPendingRemoteSync={hasPendingRemoteSync}
            localDraftSavedAt={localDraftSavedAt}
            draftSavedAt={draftSavedAt}
            className="mt-1 text-xs text-reca-200"
          />
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
                  watch={watch}
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
