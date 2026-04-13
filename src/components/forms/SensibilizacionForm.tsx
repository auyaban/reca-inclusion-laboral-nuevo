"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useFormDraftLifecycle } from "@/hooks/useFormDraftLifecycle";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { FormWizard } from "@/components/layout/FormWizard";
import { FormField } from "@/components/ui/FormField";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { DictationButton } from "@/components/forms/shared/DictationButton";
import {
  FormCompletionActions,
  type FormCompletionLinks,
} from "@/components/forms/shared/FormCompletionActions";
import {
  normalizeAsesorAgenciaAsistentes,
} from "@/lib/asistentes";
import { returnToHubTab } from "@/lib/actaTabs";
import { findPersistedDraftIdForSession } from "@/lib/drafts";
import { buildFormEditorUrl, getFormTabLabel } from "@/lib/forms";
import { focusFieldByName, focusFieldByNameAfterPaint } from "@/lib/focusField";
import { startInvalidSubmissionCheckpoint } from "@/lib/invalidSubmissionDraft";
import {
  getDefaultSensibilizacionValues,
  normalizeSensibilizacionValues,
} from "@/lib/sensibilizacion";
import { getSensibilizacionValidationTarget } from "@/lib/sensibilizacionValidationNavigation";
import { cn } from "@/lib/utils";
import {
  MODALIDAD_OPTIONS,
  TEMAS_SENSIBILIZACION,
  STEP_FIELDS,
  sensibilizacionSchema,
  type SensibilizacionValues,
} from "@/lib/validations/sensibilizacion";

const STEPS = [
  { label: "Datos empresa" },
  { label: "Temas" },
  { label: "Observaciones" },
  { label: "Fotografico" },
  { label: "Asistentes" },
];

function ReadonlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "min-h-[38px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm",
          !value && "italic text-gray-400"
        )}
      >
        {value || "Sin informacion"}
      </p>
    </div>
  );
}

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
  const [isBootstrappingForm, setIsBootstrappingForm] = useState(true);
  const [resultLinks, setResultLinks] = useState<FormCompletionLinks | null>(
    null
  );
  const appliedAssignedCargoKeyRef = useRef<string | null>(null);
  const latestErrorsRef = useRef<FieldErrors<SensibilizacionValues>>({});
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
    flushAutosave,
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
    trigger,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SensibilizacionValues>({
    resolver: zodResolver(sensibilizacionSchema),
    defaultValues: getDefaultSensibilizacionValues(empresa),
  });

  const observaciones = watch("observaciones");
  const isReadonlyDraft = editingAuthorityState === "read_only";
  const formTabLabel = getFormTabLabel("sensibilizacion");

  useEffect(() => {
    latestErrorsRef.current = errors;
  }, [errors]);

  useEffect(() => {
    const companyName = empresa?.nombre_empresa?.trim();
    const baseTitle = companyName
      ? `${formTabLabel} | ${companyName}`
      : `${formTabLabel} | Nueva acta`;

    document.title = isReadonlyDraft ? `${baseTitle} | Solo lectura` : baseTitle;
  }, [empresa?.nombre_empresa, formTabLabel, isReadonlyDraft]);

  const applyFormState = useCallback(
    ({
      values,
      nextEmpresa,
      nextStep,
    }: {
      values: Partial<SensibilizacionValues> | Record<string, unknown>;
      nextEmpresa: Empresa;
      nextStep: number;
    }) => {
      appliedAssignedCargoKeyRef.current = null;
      setIsBootstrappingForm(true);
      setEmpresa(nextEmpresa);
      reset(normalizeSensibilizacionValues(values, nextEmpresa));
      setStep(nextStep);
      setSubmitted(false);
      setResultLinks(null);
      resumeDraftLifecycle();
      setServerError(null);
    },
    [reset, resumeDraftLifecycle, setEmpresa]
  );

  useEffect(() => {
    if (!restoringDraft) {
      setIsBootstrappingForm(false);
    }
  }, [restoringDraft]);

  const restoreFormState = useCallback(
    (
      values: Partial<SensibilizacionValues>,
      nextEmpresa: Empresa,
      nextStep: number
    ) => {
      applyFormState({
        values,
        nextEmpresa,
        nextStep,
      });
    },
    [applyFormState]
  );

  const resolveLocalEmpresa = useCallback(
    (localEmpresa: Empresa | null) => localEmpresa ?? empresa ?? null,
    [empresa]
  );

  useEffect(() => {
    const asignado = empresa?.profesional_asignado ?? "";
    if (!asignado || isBootstrappingForm) return;

    const empresaIdentity = empresa?.id || empresa?.nit_empresa || "";
    const cargoAutofillKey = `${empresaIdentity}:${asignado.toLowerCase()}`;
    if (appliedAssignedCargoKeyRef.current === cargoAutofillKey) {
      return;
    }

    if (getValues("asistentes.0.cargo")) {
      appliedAssignedCargoKeyRef.current = cargoAutofillKey;
      return;
    }

    const match = profesionales.find(
      (profesional) =>
        profesional.nombre_profesional.toLowerCase() === asignado.toLowerCase()
    );

    if (match?.cargo_profesional) {
      setValue("asistentes.0.cargo", match.cargo_profesional, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      appliedAssignedCargoKeyRef.current = cargoAutofillKey;
    }
  }, [empresa?.id, empresa?.nit_empresa, empresa?.profesional_asignado, getValues, isBootstrappingForm, profesionales, setValue]);

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
          if (cancelled) return;
          restoreFormState(
            localDraft.data as Partial<SensibilizacionValues>,
            localEmpresa,
            localDraft.step
          );
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

        restoreFormState(
          result.draft.data as Partial<SensibilizacionValues>,
          result.empresa,
          result.draft.step
        );
        markRouteHydrated(routeKey);
        setRestoringDraft(false);
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      if (!empresa && !hasSessionParam) {
        setRestoringDraft(false);
        return;
      }

      const sessionId = sessionParam?.trim() || localDraftSessionId;
      const routeKey = `session:${sessionId}:${explicitNewDraft ? "new" : "default"}`;

      if (!sessionParam?.trim()) {
        router.replace(buildFormEditorUrl("sensibilizacion", { sessionId }));
      }

      const persistedDraftId = findPersistedDraftIdForSession(
        "sensibilizacion",
        sessionId
      );
      if (persistedDraftId) {
        router.replace(
          buildFormEditorUrl("sensibilizacion", {
            draftId: persistedDraftId,
          })
        );
        return;
      }

      if (hasSessionParam) {
        const localDraft = await loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);

        if (localDraft && localEmpresa) {
          if (cancelled) return;
          restoreFormState(
            localDraft.data as Partial<SensibilizacionValues>,
            localEmpresa,
            localDraft.step
          );
          markRouteHydrated(routeKey);
          setRestoringDraft(false);
          return;
        }
      }

      if (!empresa) {
        setRestoringDraft(false);
        return;
      }

      if (isRouteHydrated(routeKey)) {
        setRestoringDraft(false);
        return;
      }

      applyFormState({
        values: getDefaultSensibilizacionValues(empresa),
        nextEmpresa: empresa,
        nextStep: 0,
      });
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
    applyFormState,
    explicitNewDraft,
    loadLocal,
    loadDraft,
    resolveLocalEmpresa,
    restoreFormState,
    router,
    sessionParam,
    isRouteHydrated,
    markRouteHydrated,
    setRestoringDraft,
    localDraftSessionId,
  ]);

  useEffect(() => {
    if (!empresa || restoringDraft || draftLifecycleSuspended || isBootstrappingForm) {
      return;
    }

    const subscription = watch((values) => {
      autosave(step, values as Record<string, unknown>);
    });

    return () => subscription.unsubscribe();
  }, [watch, autosave, draftLifecycleSuspended, empresa, isBootstrappingForm, restoringDraft, step]);

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
      })
    );
  }, [
    activeDraftId,
    draftParam,
    isBootstrappingForm,
    draftLifecycleSuspended,
    markRouteHydrated,
    restoringDraft,
    router,
    sessionParam,
  ]);

  if ((draftParam && (restoringDraft || loadingDraft)) || (!draftParam && !empresa && restoringDraft)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-reca" />
          <p className="text-sm text-gray-600">Cargando borrador...</p>
        </div>
      </div>
    );
  }

  if (!empresa && !draftParam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">No hay empresa seleccionada</p>
          <button
            type="button"
            onClick={() => router.push("/formularios/sensibilizacion")}
            className="mt-4 text-sm font-semibold text-reca hover:underline"
          >
            Volver a buscar empresa
          </button>
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">No se pudo abrir el borrador</p>
          <p className="mt-2 text-sm text-gray-500">
            {serverError ?? "No fue posible reconstruir la empresa asociada a este borrador."}
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

  async function goNext() {
    if (!isDraftEditable) return;

    const fields = STEP_FIELDS[step] as FieldPath<SensibilizacionValues>[];
    const valid = fields.length === 0 ? true : await trigger(fields);

    if (!valid) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const validationTarget = getSensibilizacionValidationTarget(
            latestErrorsRef.current
          );
          if (validationTarget?.step === step) {
            focusFieldByName(validationTarget.fieldName, {
              scroll: true,
            });
          }
        });
      });
      return;
    }

    autosave(step, getValues() as Record<string, unknown>);
    setStep((current) => current + 1);
  }

  function goBack() {
    if (!isDraftEditable) return;

    if (step === 0) {
      void flushAutosave();
      router.push("/formularios/sensibilizacion");
      return;
    }

    autosave(step, getValues() as Record<string, unknown>);
    setStep((current) => current - 1);
  }

  async function handleSaveDraft() {
    if (!isDraftEditable) return;

    const values = normalizeSensibilizacionValues(getValues(), empresa);
    const normalizedValues: SensibilizacionValues = {
      ...values,
      asistentes: normalizeAsesorAgenciaAsistentes(values.asistentes),
    };

    reset(normalizedValues);
    const result = await saveDraft(step, normalizedValues as Record<string, unknown>);
    if (!result.ok) {
      setServerError(result.error ?? "No se pudo guardar el borrador. Intenta de nuevo.");
      return;
    }

    setServerError(null);
    if (result.draftId && draftParam !== result.draftId) {
      markRouteHydrated(`draft:${result.draftId}`);
      router.replace(
        buildFormEditorUrl("sensibilizacion", {
          draftId: result.draftId,
        })
      );
    }
  }

  async function onSubmit(data: SensibilizacionValues) {
    if (!isDraftEditable) return;

    setServerError(null);

    const normalizedData: SensibilizacionValues = {
      ...data,
      asistentes: normalizeAsesorAgenciaAsistentes(data.asistentes),
    };

    try {
      const response = await fetch("/api/formularios/sensibilizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...normalizedData, empresa }),
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
      router.replace(buildFormEditorUrl("sensibilizacion"));
      setSubmitted(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Error al guardar el formulario."
      );
    }
  }

  function onInvalid(nextErrors: FieldErrors<SensibilizacionValues>) {
    const validationTarget = getSensibilizacionValidationTarget(nextErrors);
    if (!validationTarget) {
      setServerError("Revisa los campos resaltados antes de finalizar.");
      return;
    }

    setServerError("Revisa los campos resaltados antes de finalizar.");
    setStep(validationTarget.step);
    focusFieldByNameAfterPaint(validationTarget.fieldName, {
      scroll: true,
    });

    if (!isDraftEditable || !empresa) {
      return;
    }

    const values = normalizeSensibilizacionValues(getValues(), empresa);
    const normalizedValues: SensibilizacionValues = {
      ...values,
      asistentes: normalizeAsesorAgenciaAsistentes(values.asistentes),
    };

    startInvalidSubmissionCheckpoint({
      currentDraftId: activeDraftId,
      checkpoint: () =>
        checkpointDraft(
          validationTarget.step,
          normalizedValues as Record<string, unknown>,
          "interval"
        ),
      onPromoteDraft: (nextDraftId) => {
        markRouteHydrated(`draft:${nextDraftId}`);
        router.replace(
          buildFormEditorUrl("sensibilizacion", {
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
    markRouteHydrated(null);
    router.replace(buildFormEditorUrl("sensibilizacion", { isNewDraft: true }));
  }

  if (submitted && empresa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">Formulario guardado</h2>
          <p className="mb-6 text-sm text-gray-500">
            La sensibilización para{" "}
            <span className="font-semibold text-gray-700">{empresa.nombre_empresa}</span>{" "}
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
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            disabled={!isDraftEditable}
            className="mb-3 flex items-center gap-1.5 text-sm text-reca-200 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {step === 0 ? "Cambiar empresa" : "Paso anterior"}
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">
                Sensibilizacion
              </h1>
              <p className="mt-0.5 truncate text-sm text-reca-200">
                {empresa.nombre_empresa}
              </p>
            </div>

            <div className="w-full max-w-[320px] shrink-0">
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
                saveDisabled={savingDraft || !isDraftEditable}
                tone="dark"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <FormWizard steps={STEPS} currentStep={step} />
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
          {isReadonlyDraft && (
            <DraftLockBanner
              className="mb-6"
              onTakeOver={handleTakeOverDraft}
              onBackToDrafts={() => router.push("/hub?panel=drafts")}
            />
          )}

          <fieldset disabled={!isDraftEditable} className="space-y-0">
          {step === 0 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 font-semibold text-gray-900">Datos de la visita</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Fecha de la visita"
                    htmlFor="fecha_visita"
                    required
                    error={errors.fecha_visita?.message}
                  >
                    <input
                      id="fecha_visita"
                      type="date"
                      {...register("fecha_visita")}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                        errors.fecha_visita ? "border-red-400 bg-red-50" : "border-gray-200"
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Modalidad"
                    htmlFor="modalidad"
                    required
                    error={errors.modalidad?.message}
                  >
                    <select
                      id="modalidad"
                      {...register("modalidad")}
                      className={cn(
                        "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                        errors.modalidad ? "border-red-400" : "border-gray-200"
                      )}
                    >
                      {MODALIDAD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    label="NIT de la empresa"
                    htmlFor="nit_empresa"
                    required
                    error={errors.nit_empresa?.message}
                  >
                    <input
                      id="nit_empresa"
                      type="text"
                      {...register("nit_empresa")}
                      placeholder="Ej: 900123456-1"
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                        errors.nit_empresa ? "border-red-400 bg-red-50" : "border-gray-200"
                      )}
                    />
                  </FormField>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 font-semibold text-gray-900">Datos de la empresa</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ReadonlyField label="Nombre de la empresa" value={empresa.nombre_empresa} />
                  <ReadonlyField label="Ciudad / Municipio" value={empresa.ciudad_empresa} />
                  <ReadonlyField label="Direccion" value={empresa.direccion_empresa} />
                  <ReadonlyField label="Correo electronico" value={empresa.correo_1} />
                  <ReadonlyField label="Telefono" value={empresa.telefono_empresa} />
                  <ReadonlyField label="Persona que atiende la visita" value={empresa.contacto_empresa} />
                  <ReadonlyField label="Cargo" value={empresa.cargo} />
                  <ReadonlyField label="Asesor" value={empresa.asesor} />
                  <ReadonlyField
                    label="Sede Compensar"
                    value={empresa.sede_empresa ?? empresa.zona_empresa}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 font-semibold text-gray-900">
                Presentacion de los temas de la sensibilizacion
              </h2>
              <p className="mb-5 text-xs text-gray-500">
                Este paso replica el contenido fijo del template original.
              </p>

              <div className="space-y-3">
                {TEMAS_SENSIBILIZACION.map((tema, index) => (
                  <div
                    key={tema}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-reca-50 text-sm font-semibold text-reca">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700">{tema}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 font-semibold text-gray-900">Observaciones</h2>
              <p className="mb-5 text-xs text-gray-500">
                Registra observaciones generales de la jornada de sensibilizacion.
              </p>

              <FormField
                label="Observaciones"
                htmlFor="observaciones"
                required
                error={errors.observaciones?.message}
              >
                <div className="space-y-2">
                  <textarea
                    id="observaciones"
                    rows={10}
                    {...register("observaciones")}
                    placeholder="Describe los temas tratados, reacciones del equipo, acuerdos o alertas relevantes."
                    className={cn(
                      "w-full resize-y rounded-xl border px-3.5 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                      errors.observaciones ? "border-red-400 bg-red-50" : "border-gray-200"
                    )}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <DictationButton
                      onTranscript={(text) => {
                        const current = getValues("observaciones");
                        setValue("observaciones", current ? `${current} ${text}` : text, {
                          shouldValidate: true,
                        });
                      }}
                    />
                    <span className="text-xs text-gray-400">
                      {observaciones?.length ?? 0} caracteres
                    </span>
                  </div>
                </div>
              </FormField>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-reca-50 p-3 text-reca">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Registro fotografico</h2>
                  <p className="text-xs text-gray-500">
                    Esta seccion se conserva para registro fotografico en el acta.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600">
                No hay captura de datos en este paso. El template deja este espacio reservado
                para el registro fotografico de la actividad.
              </div>
            </div>
          )}

          {step === 4 && (
            <AsistentesSection
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              profesionales={profesionales}
              profesionalAsignado={empresa.profesional_asignado}
            />
          )}

          {serverError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="mt-6 flex justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={!isDraftEditable}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 0 ? "Cambiar empresa" : "Anterior"}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!isDraftEditable}
                className="flex items-center gap-2 rounded-xl bg-reca px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !isDraftEditable}
                className={cn(
                  "flex items-center gap-2 rounded-xl bg-reca px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark",
                  "disabled:cursor-not-allowed disabled:opacity-60"
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
            )}
          </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}








