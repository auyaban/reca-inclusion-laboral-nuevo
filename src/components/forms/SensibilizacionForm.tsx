"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Save,
} from "lucide-react";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { FormWizard } from "@/components/layout/FormWizard";
import { FormField } from "@/components/ui/FormField";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import {
  ASESOR_AGENCIA_CARGO,
  normalizeAsesorAgenciaAsistentes,
} from "@/lib/asistentes";
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

function getDefaultValues(empresa?: Empresa | null): SensibilizacionValues {
  return {
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    observaciones: "",
    asistentes: [
      { nombre: empresa?.profesional_asignado ?? "", cargo: "" },
      { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
    ],
  };
}

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

function DictationButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function toggle() {
    setError(null);

    if (recording) {
      mediaRef.current?.stop();
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Sin acceso al microfono");
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setLoading(true);

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Sin sesion activa");
        }

        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const formData = new FormData();
        formData.append("audio_file", blob, "dictation.webm");
        formData.append("language", "es");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dictate-transcribe`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );

        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error?.message ?? "Error al transcribir");
        }

        onTranscript(payload.text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al transcribir");
      } finally {
        setLoading(false);
      }
    };

    mediaRecorder.start();
    mediaRef.current = mediaRecorder;
    setRecording(true);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        title={recording ? "Detener y transcribir" : "Dictar con OpenAI Whisper"}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          recording
            ? "animate-pulse bg-red-100 text-red-600 hover:bg-red-200"
            : loading
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : recording ? (
          <MicOff className="h-3.5 w-3.5" />
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
        {loading ? "Transcribiendo..." : recording ? "Detener" : "Dictar"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export default function SensibilizacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((state) => state.empresa);
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);
  const draftParam = searchParams.get("draft");
  const sessionParam = searchParams.get("session");
  const explicitNewDraft = searchParams.get("new") === "1";
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resultLinks, setResultLinks] = useState<{
    sheetLink?: string;
    pdfLink?: string;
  } | null>(null);
  const { profesionales } = useProfesionalesCatalog();
  const [restoringDraft, setRestoringDraft] = useState(
    Boolean(draftParam || sessionParam?.trim())
  );
  const hydratedRouteRef = useRef<string | null>(null);

  const {
    activeDraftId,
    loadingDraft,
    savingDraft,
    draftSavedAt,
    localDraftSavedAt,
    remoteIdentityState,
    editingAuthorityState,
    isDraftEditable,
    hasPendingAutosave,
    autosave,
    loadLocal,
    flushAutosave,
    saveDraft,
    clearDraft,
    loadDraft,
    ensureDraftIdentity,
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
    defaultValues: getDefaultValues(empresa),
  });

  const observaciones = watch("observaciones");
  const isReadonlyDraft = editingAuthorityState === "read_only";

  const restoreFormState = useCallback(
    (
      values: Partial<SensibilizacionValues>,
      nextEmpresa: Empresa,
      nextStep: number
    ) => {
      setEmpresa(nextEmpresa);
      reset(values);
      setStep(nextStep);
      setServerError(null);
    },
    [reset, setEmpresa]
  );

  const resolveLocalEmpresa = useCallback(
    (localEmpresa: Empresa | null) => localEmpresa ?? empresa ?? null,
    [empresa]
  );

  useEffect(() => {
    if (!empresa || draftParam || activeDraftId) return;

    if (!getValues("nit_empresa") && empresa.nit_empresa) {
      setValue("nit_empresa", empresa.nit_empresa);
    }
    if (!getValues("asistentes.0.nombre") && empresa.profesional_asignado) {
      setValue("asistentes.0.nombre", empresa.profesional_asignado);
    }
  }, [activeDraftId, draftParam, empresa, getValues, setValue]);

  useEffect(() => {
    const asignado = empresa?.profesional_asignado ?? "";
    if (!asignado || getValues("asistentes.0.cargo")) return;

    const match = profesionales.find(
      (profesional) =>
        profesional.nombre_profesional.toLowerCase() === asignado.toLowerCase()
    );

    if (match?.cargo_profesional) {
      setValue("asistentes.0.cargo", match.cargo_profesional);
    }
  }, [empresa?.profesional_asignado, getValues, profesionales, setValue]);

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
        const localDraft = loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);

        if (localDraft && localEmpresa) {
          if (cancelled) return;
          restoreFormState(
            localDraft.data as Partial<SensibilizacionValues>,
            localEmpresa,
            localDraft.step
          );
          hydratedRouteRef.current = routeKey;
          setRestoringDraft(false);
          return;
        }

        const result = await loadDraft(draftParam);
        if (cancelled) return;

        if (!result.draft || !result.empresa) {
          setServerError(result.error ?? "No se pudo cargar el borrador.");
          hydratedRouteRef.current = routeKey;
          setRestoringDraft(false);
          return;
        }

        restoreFormState(
          result.draft.data as Partial<SensibilizacionValues>,
          result.empresa,
          result.draft.step
        );
        hydratedRouteRef.current = routeKey;
        setRestoringDraft(false);
        return;
      }

      const hasSessionParam = Boolean(sessionParam?.trim());
      if (!empresa && !hasSessionParam) {
        setRestoringDraft(false);
        return;
      }

      const sessionId = sessionParam?.trim() || startNewDraftSession();
      const routeKey = `session:${sessionId}:${explicitNewDraft ? "new" : "default"}`;

      if (!sessionParam?.trim()) {
        router.replace(`/formularios/sensibilizacion/seccion-2?session=${sessionId}`);
      }

      if (hasSessionParam) {
        const localDraft = loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);

        if (localDraft && localEmpresa) {
          if (cancelled) return;
          restoreFormState(
            localDraft.data as Partial<SensibilizacionValues>,
            localEmpresa,
            localDraft.step
          );
          hydratedRouteRef.current = routeKey;
          setRestoringDraft(false);
          return;
        }
      }

      if (!empresa) {
        setRestoringDraft(false);
        return;
      }

      if (hydratedRouteRef.current === routeKey) {
        setRestoringDraft(false);
        return;
      }

      reset(getDefaultValues(empresa));
      setStep(0);
      setServerError(null);
      hydratedRouteRef.current = routeKey;
      setRestoringDraft(false);
    }

    hydrateRoute();

    return () => {
      cancelled = true;
    };
  }, [
    draftParam,
    empresa,
    explicitNewDraft,
    loadLocal,
    loadDraft,
    reset,
    resolveLocalEmpresa,
    restoreFormState,
    router,
    sessionParam,
    setEmpresa,
    startNewDraftSession,
  ]);

  useEffect(() => {
    if (!empresa || restoringDraft) return;

    const subscription = watch((values) => {
      autosave(step, values as Record<string, unknown>);
    });

    return () => subscription.unsubscribe();
  }, [watch, autosave, empresa, restoringDraft, step]);

  useEffect(() => {
    if (
      restoringDraft ||
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
      router.replace(`/formularios/sensibilizacion/seccion-2?draft=${result.draftId}`);
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
    restoringDraft,
    router,
    step,
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
            onClick={() => router.push("/hub/borradores")}
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

    if (!valid) return;

    autosave(step, getValues() as Record<string, unknown>);
    setStep((current) => current + 1);
  }

  function goBack() {
    if (!isDraftEditable) return;

    if (step === 0) {
      flushAutosave();
      router.push("/formularios/sensibilizacion");
      return;
    }

    autosave(step, getValues() as Record<string, unknown>);
    setStep((current) => current - 1);
  }

  async function handleSaveDraft() {
    if (!isDraftEditable) return;

    const values = getValues();
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
      hydratedRouteRef.current = `draft:${result.draftId}`;
      router.replace(`/formularios/sensibilizacion/seccion-2?draft=${result.draftId}`);
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
      await clearDraft(activeDraftId ?? undefined);
      setSubmitted(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Error al guardar el formulario."
      );
    }
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

  if (submitted && empresa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">Formulario guardado</h2>
          <p className="mb-6 text-sm text-gray-500">
            La sensibilizacion para{" "}
            <span className="font-semibold text-gray-700">{empresa.nombre_empresa}</span>{" "}
            fue registrada correctamente.
          </p>

          {resultLinks && (
            <div className="mb-4 flex flex-col gap-2">
              {resultLinks.sheetLink && (
                <a
                  href={resultLinks.sheetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Ver acta en Google Sheets
                </a>
              )}
              {resultLinks.pdfLink && (
                <a
                  href={resultLinks.pdfLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <FileText className="h-4 w-4" />
                  Ver PDF en Drive
                </a>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push("/hub")}
              className="w-full rounded-xl bg-reca py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
            >
              Volver al menu
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setResultLinks(null);
                setStep(0);
              }}
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

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || !isDraftEditable}
              title="Guardar borrador"
              className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5">
                {savingDraft ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {savingDraft ? "Guardando..." : "Borrador"}
              </span>
            </button>
          </div>

          <DraftPersistenceStatus
            savingDraft={savingDraft}
            remoteIdentityState={remoteIdentityState}
            hasPendingAutosave={hasPendingAutosave}
            localDraftSavedAt={localDraftSavedAt}
            draftSavedAt={draftSavedAt}
            className="mt-1 text-xs text-reca-200"
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <FormWizard steps={STEPS} currentStep={step} />
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {isReadonlyDraft && (
            <DraftLockBanner
              className="mb-6"
              onTakeOver={handleTakeOverDraft}
              onBackToDrafts={() => router.push("/hub/borradores")}
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
              watch={watch}
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








