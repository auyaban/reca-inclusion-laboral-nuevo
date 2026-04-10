"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";
import {
  presentacionSchema,
  type PresentacionValues,
  MOTIVACION_OPTIONS,
  STEP_FIELDS,
} from "@/lib/validations/presentacion";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { FormWizard } from "@/components/layout/FormWizard";
import { FormField } from "@/components/ui/FormField";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { useFormDraft } from "@/hooks/useFormDraft";
import {
  ASESOR_AGENCIA_CARGO,
  normalizeAsesorAgenciaAsistentes,
} from "@/lib/asistentes";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ArrowRight, Plus, Loader2, CheckCircle2,
  Building2, FileSpreadsheet, FileText, Mic, MicOff, Save, ClipboardPaste,
} from "lucide-react";
import type { Profesional } from "@/components/forms/shared/ProfesionalCombobox";

const STEPS = [
  { label: "Datos empresa" },
  { label: "Motivación" },
  { label: "Acuerdos" },
  { label: "Asistentes" },
];

// ── Templates de texto para Acuerdos y Observaciones ─────────────────────
const ACUERDOS_TEMPLATES: { key: string; label: string; text: string }[] = [
  {
    key: "objetivo_y_participantes",
    label: "Objetivo y participantes",
    text: `Se llevó a cabo una reunión virtual con el objetivo de dar a conocer Ruta de inclusión ante las iniciativas de inclusión laboral en la empresa bajo el cumplimiento Normativo.

En el encuentro participó representante clave del área de Gestión Humana, Asesora desde Agencia de Empleo y Fomento Empresarial Compensar, y desde RECA Coordinación de Empleo Inclusivo.

El espacio inicia con presentación de representante de la empresa, el cual dialoga sobre el interés de conocer la ruta y acompañamiento ante iniciativas de vinculación de personas con discapacidad.`,
  },
  {
    key: "roles_proceso_seleccion",
    label: "Roles y selección",
    text: `Seguidamente la Asesora de la Agencia clarificó que la Agencia es la entidad encargada de la selección y envío de candidatos que se ajusten a los perfiles requeridos y el proceso de envío de hojas de vida y la evaluación por competencias será ejecutado por la analista de la Agencia, y se informa el rol de RECA como operador del programa de inclusión siendo este brindar acompañamiento técnico y especializado durante todo el proceso de inclusión, sin costo alguno para la empresa.

Se informa tiempo de respuesta en el envío de candidatos siendo de 4 días hábiles a partir de la publicación de la vacante y la importancia de la flexibilización del perfil, y la no creación de un cargo en específico para población con discapacidad.`,
  },
  {
    key: "certificado_discapacidad",
    label: "Certificado",
    text: `Se reitera que la Agencia no realiza el envío del Certificado de Discapacidad, no obstante, desde Compensar, la psicóloga encargada verifica durante el contacto con el candidato si este cuenta con dicho documento siendo este proceso de preselección, posteriormente, en el proceso de firma de contrato, corresponde a la empresa validar el certificado emitido por la Secretaría de Salud.`,
  },
  {
    key: "acompanamiento_reca",
    label: "Acompañamiento RECA",
    text: `Seguidamente desde RECA se comunica los procesos a ejecutar, los cuales no tienen costo al estar con la caja Compensar:
* Evaluación accesibilidad
* Revisión de la vacante
* Acompañamiento en procesos de entrevistas
* Acompañamiento a firma de contrato
* Inducción organizacional
* Inducción operativa
* Sensibilización
* Seguimiento a cada vinculado se realizarán seis (6) de manera individual tanto con el nuevo colaborador como con su jefe directo para asegurar una adaptación exitosa, se reitera el acompañamiento al proceso a candidatos exclusivamente remitidos por la agencia, y en el caso de la empresa tener candidatos estos deberán ser remitido al asesor de la Agencia vía correo electrónico para asi ingresar a la ruta de la Agencia y ejecutar el acompañamiento desde RECA.`,
  },
  {
    key: "seguimiento_y_normativa",
    label: "Seguimiento y normativa",
    text: `Se reitera la importancia de contar con la retroalimentación vía correo electrónico a la Agencia con copia a RECA, ante procesos de entrevista en el caso de no pasar candidatos filtros de selección y solicitar nuevos candidatos; y firma de contrato.

Se dialoga de la nueva ley 2466 del 2025, en donde se orienta ante totalidad de colaboradores la vinculación de 2 personas con discapacidad, se informa beneficios tangibles y no tangibles bajo la ley 361 art. 31 deducción en la renta por vinculación de personas con discapacidad y el apoyo que está entregando la secretaria de desarrollo.

El Decreto 0223 de 2026 es explícito al indicar en el numeral 1 de su artículo 2.2.6.3.3.33. que:

"Los aprendices no integran la base de trabajadores de carácter permanente de la empresa, para efectos del cálculo de la cuota de empleo para personas en situación de discapacidad, prevista en el numeral 17 del artículo 57 del Código Sustantivo del Trabajo."

En consecuencia y a la luz de esta nueva norma, contratar aprendices con discapacidad no sirve para aumentar el número de personas con discapacidad computables dentro de la cuota de empleo exigida, por lo cual la cuota se calculará ahora sobre la base de trabajadores permanentes, y el decreto 0223 excluye a los aprendices de esa base.

Sin embargo, el Decreto genera un incentivo distinto en el numeral 2 del mismo artículo, donde establece que:

"La cuota de aprendices se reducirá en un 50% si las personas contratadas tienen una discapacidad comprobada no inferior al 25%", en cumplimiento del parágrafo del artículo 31 de la Ley 361 de 1997.

Es decir, que sí es posible contratar aprendices con discapacidad, pero el efecto jurídico directo es sobre la cuota de aprendices (Ley 789 de 2002), no sobre la cuota de empleo para personas con discapacidad (Ley 2466 de 2025 art. 57 num. 17 CST).`,
  },
  {
    key: "casos_alcance_cierre",
    label: "Casos, alcance y cierre",
    text: `Durante la reunión, se socializaron casos exitosos de inclusión y el apoyo de interprete lengua de señas en el caso de vincular personas con discapacidad auditiva.

Se reitera que el alcance operativo de la ruta de inclusión abarca Bogotá y Cundinamarca.

Se agradece espacio, se informa envío de presentación y se estará a la espera de contacto para dar continuidad a la ruta.

Se finaliza reunión sin novedad`,
  },
];

function getDefaultValues(empresa?: Empresa | null): PresentacionValues {
  return {
    tipo_visita: "Presentación",
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    motivacion: [],
    acuerdos_observaciones: "",
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
      <p className={cn(
        "text-sm px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 min-h-[38px]",
        !value && "text-gray-400 italic"
      )}>
        {value || "Sin información"}
      </p>
    </div>
  );
}

// ── Dictado con OpenAI Whisper (edge function existente) ──────────────────
function DictationButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function toggle() {
    setError(null);
    if (recording) { mediaRef.current?.stop(); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Sin acceso al micrófono");
      return;
    }
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      setRecording(false);
      setLoading(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sin sesión activa");
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const form = new FormData();
        form.append("audio_file", blob, "dictation.webm");
        form.append("language", "es");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dictate-transcribe`,
          { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: form }
        );
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error?.message ?? "Error al transcribir");
        onTranscript(json.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al transcribir");
      } finally { setLoading(false); }
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={toggle} disabled={loading}
        title={recording ? "Detener y transcribir" : "Dictar con OpenAI Whisper"}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
          recording ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
          : loading  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : recording ? <MicOff className="w-3.5 h-3.5" />
          : <Mic className="w-3.5 h-3.5" />}
        {loading ? "Transcribiendo…" : recording ? "Detener" : "Dictar"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

// ── Banner de borrador disponible ─────────────────────────────────────────
export default function PresentacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresa = useEmpresaStore((s) => s.empresa);
  const setEmpresa = useEmpresaStore((s) => s.setEmpresa);
  const draftParam = searchParams.get("draft");
  const sessionParam = searchParams.get("session");
  const explicitNewDraft = searchParams.get("new") === "1";
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resultLinks, setResultLinks] = useState<{ sheetLink?: string; pdfLink?: string } | null>(null);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
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
    slug: "presentacion",
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
  } = useForm<PresentacionValues>({
    resolver: zodResolver(presentacionSchema),
    defaultValues: getDefaultValues(empresa),
  });

  const motivacion = watch("motivacion");
  const acuerdos   = watch("acuerdos_observaciones");
  const isReadonlyDraft = editingAuthorityState === "read_only";

  const restoreFormState = useCallback(
    (
      values: Partial<PresentacionValues>,
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

  // Cargar profesionales
  useEffect(() => {
    fetch("/api/profesionales")
      .then(r => r.json())
      .then((data: Profesional[]) => {
        if (!Array.isArray(data)) return;
        setProfesionales(data);
        const asignado = empresa?.profesional_asignado ?? "";
        if (asignado && !getValues("asistentes.0.cargo")) {
          const match = data.find(
            p => p.nombre_profesional.toLowerCase() === asignado.toLowerCase()
          );
          if (match?.cargo_profesional) {
            setValue("asistentes.0.cargo", match.cargo_profesional);
          }
        }
      })
      .catch(() => {});
  }, [empresa?.profesional_asignado, getValues, setValue]);

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
            localDraft.data as Partial<PresentacionValues>,
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
          result.draft.data as Partial<PresentacionValues>,
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
        router.replace(`/formularios/presentacion/seccion-2?session=${sessionId}`);
      }

      if (hasSessionParam) {
        const localDraft = loadLocal();
        const localEmpresa = resolveLocalEmpresa(localDraft?.empresa ?? null);

        if (localDraft && localEmpresa) {
          if (cancelled) return;
          restoreFormState(
            localDraft.data as Partial<PresentacionValues>,
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

    const sub = watch((values) => {
      autosave(step, values as Record<string, unknown>);
    });
    return () => sub.unsubscribe();
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
      router.replace(`/formularios/presentacion/seccion-2?draft=${result.draftId}`);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-reca" />
          <p className="text-sm text-gray-600">Cargando borrador...</p>
        </div>
      </div>
    );
  }

  if (!empresa && !draftParam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay empresa seleccionada</p>
          <button onClick={() => router.push("/formularios/presentacion")}
            className="mt-4 text-reca text-sm font-semibold hover:underline">
            Volver a buscar empresa
          </button>
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
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

    const valid = await trigger(STEP_FIELDS[step] as FieldPath<PresentacionValues>[]);
    if (!valid) return;
    const nextStep = step + 1;
    // Autosave antes de avanzar
    autosave(step, getValues() as Record<string, unknown>);
    setStep(nextStep);
  }

  function goBack() {
    if (!isDraftEditable) return;

    if (step === 0) {
      flushAutosave();
      router.push("/formularios/presentacion");
    } else {
      autosave(step, getValues() as Record<string, unknown>);
      setStep((s) => s - 1);
    }
  }

  async function handleSaveDraft() {
    if (!isDraftEditable) return;

    const values = getValues();
    const normalizedValues: PresentacionValues = {
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
      router.replace(`/formularios/presentacion/seccion-2?draft=${result.draftId}`);
    }
  }

  async function onSubmit(data: PresentacionValues) {
    if (!isDraftEditable) return;

    setServerError(null);

    const normalizedData: PresentacionValues = {
      ...data,
      asistentes: normalizeAsesorAgenciaAsistentes(data.asistentes),
    };

    try {
      const res = await fetch("/api/formularios/presentacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...normalizedData, empresa }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      setResultLinks({ sheetLink: json.sheetLink, pdfLink: json.pdfLink });
      await clearDraft(activeDraftId ?? undefined);
      setSubmitted(true);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Error al guardar el formulario.");
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

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (submitted && empresa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Formulario guardado!</h2>
          <p className="text-gray-500 text-sm mb-6">
            La presentación del programa para{" "}
            <span className="font-semibold text-gray-700">{empresa.nombre_empresa}</span>{" "}
            fue registrada correctamente.
          </p>
          {resultLinks && (
            <div className="flex flex-col gap-2 mb-4">
              {resultLinks.sheetLink && (
                <a href={resultLinks.sheetLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />Ver acta en Google Sheets
                </a>
              )}
              {resultLinks.pdfLink && (
                <a href={resultLinks.pdfLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors">
                  <FileText className="w-4 h-4" />Ver PDF en Drive
                </a>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button onClick={() => router.push("/hub")}
              className="w-full py-2.5 rounded-xl bg-reca text-white text-sm font-semibold hover:bg-reca-dark transition-colors">
              Volver al menú
            </button>
            <button onClick={() => { const nextSessionId = startNewDraftSession(); setSubmitted(false); setResultLinks(null); reset(getDefaultValues(empresa)); setStep(0); hydratedRouteRef.current = `session:${nextSessionId}:new`; router.replace(`/formularios/presentacion/seccion-2?session=${nextSessionId}&new=1`); }}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Nuevo formulario
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-reca shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={goBack}
            disabled={!isDraftEditable}
            className="flex items-center gap-1.5 text-reca-200 hover:text-white text-sm mb-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {step === 0 ? "Cambiar empresa" : "Paso anterior"}
          </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                Presentación / Reactivación del Programa
              </h1>
              <p className="text-reca-200 text-sm mt-0.5 truncate">{empresa.nombre_empresa}</p>
            </div>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || !isDraftEditable}
              title="Guardar borrador"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
            >
              {savingDraft
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              {savingDraft ? "Guardando…" : "Borrador"}
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

      {/* Wizard progress */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <FormWizard steps={STEPS} currentStep={step} />
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {isReadonlyDraft && (
            <DraftLockBanner
              className="mb-6"
              onTakeOver={handleTakeOverDraft}
              onBackToDrafts={() => router.push("/hub/borradores")}
            />
          )}

          <fieldset disabled={!isDraftEditable} className="space-y-0">

          {/* ── PASO 0: Datos de la empresa ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-5">Datos de la visita</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Tipo de visita" htmlFor="tipo_visita" required
                    error={errors.tipo_visita?.message}>
                    <select id="tipo_visita" {...register("tipo_visita")}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-sm bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                        errors.tipo_visita ? "border-red-400" : "border-gray-200"
                      )}>
                      <option value="Presentación">Presentación</option>
                      <option value="Reactivación">Reactivación</option>
                    </select>
                  </FormField>
                  <FormField label="Fecha de la visita" htmlFor="fecha_visita" required
                    error={errors.fecha_visita?.message}>
                    <input id="fecha_visita" type="date" {...register("fecha_visita")}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                        errors.fecha_visita ? "border-red-400 bg-red-50" : "border-gray-200"
                      )} />
                  </FormField>
                  <FormField label="Modalidad" htmlFor="modalidad" required
                    error={errors.modalidad?.message}>
                    <select id="modalidad" {...register("modalidad")}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-sm bg-white",
                        "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                        errors.modalidad ? "border-red-400" : "border-gray-200"
                      )}>
                      <option value="Presencial">Presencial</option>
                      <option value="Virtual">Virtual</option>
                      <option value="Mixto">Mixto</option>
                      <option value="No aplica">No aplica</option>
                    </select>
                  </FormField>
                  <FormField label="NIT de la empresa" htmlFor="nit_empresa" required
                    error={errors.nit_empresa?.message}>
                    <input id="nit_empresa" type="text" {...register("nit_empresa")}
                      placeholder="Ej: 900123456-1"
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                        errors.nit_empresa ? "border-red-400 bg-red-50" : "border-gray-200"
                      )} />
                  </FormField>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-5">Datos de la empresa</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReadonlyField label="Nombre de la empresa"    value={empresa.nombre_empresa} />
                  <ReadonlyField label="Ciudad / Municipio"      value={empresa.ciudad_empresa} />
                  <ReadonlyField label="Dirección"               value={empresa.direccion_empresa} />
                  <ReadonlyField label="Sede"                    value={empresa.sede_empresa ?? empresa.zona_empresa} />
                  <ReadonlyField label="Correo electrónico"      value={empresa.correo_1} />
                  <ReadonlyField label="Teléfono"                value={empresa.telefono_empresa} />
                  <ReadonlyField label="Contacto empresa"        value={empresa.contacto_empresa} />
                  <ReadonlyField label="Cargo responsable"       value={empresa.cargo} />
                  <ReadonlyField label="Caja de Compensación"    value={empresa.caja_compensacion} />
                  <ReadonlyField label="Profesional RECA"        value={empresa.profesional_asignado} />
                  <ReadonlyField label="Correo profesional"      value={empresa.correo_profesional} />
                  <ReadonlyField label="Asesor fidelización"     value={empresa.asesor} />
                  <ReadonlyField label="Correo asesor"           value={empresa.correo_asesor} />
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 1: Motivación ── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Motivación de la organización</h2>
              <p className="text-xs text-gray-500 mb-5">
                Selecciona al menos una razón por la que la empresa participa en el programa.
              </p>
              {errors.motivacion && (
                <p className="mb-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  ⚠ {errors.motivacion.message}
                </p>
              )}
              <div className="space-y-3">
                {MOTIVACION_OPTIONS.map((opcion) => {
                  const checked = motivacion?.includes(opcion);
                  return (
                    <label key={opcion}
                      className={cn(
                        "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                        checked ? "border-reca bg-reca-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}>
                      <input type="checkbox" value={opcion} {...register("motivacion")}
                        className="mt-0.5 w-4 h-4 accent-reca-600 shrink-0" />
                      <span className={cn("text-sm leading-snug",
                        checked ? "text-reca font-medium" : "text-gray-700")}>
                        {opcion}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PASO 2: Acuerdos ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Botones de texto pre-establecido */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardPaste className="w-4 h-4 text-reca" />
                  <h3 className="text-sm font-semibold text-gray-700">Insertar texto pre-establecido</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Haz clic en cualquier bloque para añadirlo al campo de acuerdos.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACUERDOS_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => {
                        const current = getValues("acuerdos_observaciones");
                        setValue(
                          "acuerdos_observaciones",
                          current ? `${current}\n\n${tpl.text}` : tpl.text,
                          { shouldValidate: true }
                        );
                      }}
                      className={cn(
                        "flex items-start gap-2 text-left px-3 py-2.5 rounded-xl border text-xs font-medium",
                        "border-reca-200 bg-reca-50 text-reca hover:bg-reca-100 hover:border-reca",
                        "transition-colors leading-snug"
                      )}
                    >
                      <Plus className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea de acuerdos */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Acuerdos y observaciones</h2>
                <p className="text-xs text-gray-500 mb-5">
                  Registra los acuerdos, compromisos y observaciones de la reunión.
                </p>
                <FormField
                  label="Acuerdos y observaciones de la reunión"
                  htmlFor="acuerdos_observaciones"
                  required
                  error={errors.acuerdos_observaciones?.message}
                >
                  <div className="space-y-2">
                    <textarea
                      id="acuerdos_observaciones"
                      rows={12}
                      {...register("acuerdos_observaciones")}
                      placeholder="Describe los acuerdos, compromisos y observaciones relevantes de la visita... o usa los bloques de arriba para insertar texto pre-establecido."
                      className={cn(
                        "w-full rounded-xl border px-3.5 py-3 text-sm resize-y",
                        "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                        errors.acuerdos_observaciones ? "border-red-400 bg-red-50" : "border-gray-200"
                      )}
                    />
                    <div className="flex items-center justify-between">
                      <DictationButton
                        onTranscript={(text) => {
                          const current = getValues("acuerdos_observaciones");
                          setValue(
                            "acuerdos_observaciones",
                            current ? `${current} ${text}` : text,
                            { shouldValidate: true }
                          );
                        }}
                      />
                      <div className="flex items-center gap-3">
                        {acuerdos?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setValue("acuerdos_observaciones", "", { shouldValidate: true })}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Limpiar
                          </button>
                        )}
                        <span className="text-xs text-gray-400">{acuerdos?.length ?? 0} caracteres</span>
                      </div>
                    </div>
                  </div>
                </FormField>
              </div>
            </div>
          )}

          {/* ── PASO 3: Asistentes ── */}
          {step === 3 && (
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

          {/* Error global */}
          {serverError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Navegación */}
          <div className="mt-6 flex justify-between gap-3">
            <button type="button" onClick={goBack} disabled={!isDraftEditable}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? "Cambiar empresa" : "Anterior"}
            </button>

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext} disabled={!isDraftEditable}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-reca text-white text-sm font-semibold hover:bg-reca-dark transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting || !isDraftEditable}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl bg-reca text-white text-sm font-semibold",
                  "hover:bg-reca-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                )}>
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
                  : <><CheckCircle2 className="w-4 h-4" />Finalizar</>}
              </button>
            )}
          </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}
