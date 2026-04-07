"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEmpresaStore } from "@/lib/store/empresaStore";
import {
  presentacionSchema,
  type PresentacionValues,
  MOTIVACION_OPTIONS,
  STEP_FIELDS,
} from "@/lib/validations/presentacion";
import { FormWizard } from "@/components/layout/FormWizard";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
  FileText,
  Mic,
  MicOff,
  ChevronDown,
} from "lucide-react";

type Profesional = { nombre_profesional: string; cargo_profesional: string | null };

const STEPS = [
  { label: "Datos empresa" },
  { label: "Motivación" },
  { label: "Acuerdos" },
  { label: "Asistentes" },
];

function ReadonlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={cn("text-sm px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 min-h-[38px]",
        !value && "text-gray-400 italic"
      )}>
        {value || "Sin información"}
      </p>
    </div>
  );
}

// ── Combobox de profesionales RECA ────────────────────────────────────────
function ProfesionalCombobox({
  value,
  onChange,
  onCargoChange,
  profesionales,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onCargoChange: (cargo: string) => void;
  profesionales: Profesional[];
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // Sincronizar query con value externo (ej. pre-llenado)
  useEffect(() => { setQuery(value); }, [value]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = query.trim()
    ? profesionales.filter(p =>
        p.nombre_profesional.toLowerCase().includes(query.toLowerCase())
      )
    : profesionales;

  function select(p: Profesional) {
    setQuery(p.nombre_profesional);
    onChange(p.nombre_profesional);
    onCargoChange(p.cargo_profesional ?? "");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar profesional RECA..."
          className={cn(
            "w-full rounded-lg border px-3 py-2 pr-8 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
            error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
          )}
        />
        <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.nombre_profesional}
              type="button"
              onMouseDown={() => select(p)}
              className="w-full text-left px-3 py-2.5 hover:bg-reca-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-800">{p.nombre_profesional}</p>
              {p.cargo_profesional && (
                <p className="text-xs text-gray-500">{p.cargo_profesional}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Botón de dictado (Web Speech API) ─────────────────────────────────────
function DictationButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  const supported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function toggle() {
    if (!supported) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec: SpeechRecognition = new SR();
    rec.lang = "es-CO";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .slice(e.resultIndex)
        .map(r => r[0].transcript)
        .join(" ");
      onTranscript(transcript);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Detener dictado" : "Dictar con micrófono"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
        listening
          ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
    >
      {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      {listening ? "Detener" : "Dictar"}
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

export default function PresentacionForm() {
  const router = useRouter();
  const empresa = useEmpresaStore((s) => s.empresa);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resultLinks, setResultLinks] = useState<{ sheetLink?: string; pdfLink?: string } | null>(null);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PresentacionValues>({
    resolver: zodResolver(presentacionSchema),
    defaultValues: {
      tipo_visita: "Presentación",
      fecha_visita: new Date().toISOString().split("T")[0],
      modalidad: "Presencial",
      nit_empresa: empresa?.nit_empresa ?? "",
      motivacion: [],
      acuerdos_observaciones: "",
      asistentes: [
        // Fila 1: profesional asignado (se rellena cargo cuando carguen los datos)
        { nombre: empresa?.profesional_asignado ?? "", cargo: "" },
        // Fila 2: asesor agencia (última fila, cargo fijo)
        { nombre: "", cargo: "Asesor Agencia" },
      ],
    },
  });

  const { fields, append, remove, insert } = useFieldArray({ control, name: "asistentes" });
  const motivacion = watch("motivacion");
  const acuerdos = watch("acuerdos_observaciones");

  // Cargar profesionales y auto-rellenar cargo del primero
  useEffect(() => {
    fetch("/api/profesionales")
      .then(r => r.json())
      .then((data: Profesional[]) => {
        if (!Array.isArray(data)) return;
        setProfesionales(data);
        // Auto-rellenar cargo del profesional asignado si coincide
        const nombreAsignado = empresa?.profesional_asignado ?? "";
        if (nombreAsignado) {
          const match = data.find(
            p => p.nombre_profesional.toLowerCase() === nombreAsignado.toLowerCase()
          );
          if (match?.cargo_profesional) {
            setValue("asistentes.0.cargo", match.cargo_profesional);
          }
        }
      })
      .catch(() => {});
  }, [empresa?.profesional_asignado, setValue]);

  if (!empresa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay empresa seleccionada</p>
          <button
            onClick={() => router.push("/formularios/presentacion")}
            className="mt-4 text-reca text-sm font-semibold hover:underline"
          >
            Volver a buscar empresa
          </button>
        </div>
      </div>
    );
  }

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[step] as any);
    if (valid) setStep((s) => s + 1);
  }

  function goBack() {
    if (step === 0) {
      router.push("/formularios/presentacion");
    } else {
      setStep((s) => s - 1);
    }
  }

  async function onSubmit(data: PresentacionValues) {
    setServerError(null);
    try {
      const res = await fetch("/api/formularios/presentacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, empresa }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      setResultLinks({ sheetLink: json.sheetLink, pdfLink: json.pdfLink });
      setSubmitted(true);
    } catch (e) {
      setServerError(
        e instanceof Error ? e.message : "Error al guardar el formulario."
      );
    }
  }

  // ── Pantalla de éxito ──────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            ¡Formulario guardado!
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            La presentación del programa para{" "}
            <span className="font-semibold text-gray-700">
              {empresa.nombre_empresa}
            </span>{" "}
            fue registrada correctamente.
          </p>
          {resultLinks && (
            <div className="flex flex-col gap-2 mb-4">
              {resultLinks.sheetLink && (
                <a href={resultLinks.sheetLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                  Ver acta en Google Sheets
                </a>
              )}
              {resultLinks.pdfLink && (
                <a href={resultLinks.pdfLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors">
                  <FileText className="w-4 h-4" />
                  Ver PDF en Drive
                </a>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/hub")}
              className="w-full py-2.5 rounded-xl bg-reca text-white text-sm font-semibold hover:bg-reca-dark transition-colors"
            >
              Volver al menú
            </button>
            <button
              onClick={() => { setSubmitted(false); setResultLinks(null); setStep(0); }}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
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
      {/* Header */}
      <div className="bg-reca shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-reca-200 hover:text-white text-sm mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {step === 0 ? "Cambiar empresa" : "Paso anterior"}
          </button>
          <h1 className="text-white font-bold text-lg leading-tight">
            Presentación / Reactivación del Programa
          </h1>
          <p className="text-reca-200 text-sm mt-0.5 truncate">
            {empresa.nombre_empresa}
          </p>
        </div>
      </div>

      {/* Wizard */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <FormWizard steps={STEPS} currentStep={step} />
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>

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

              {/* Datos readonly de Supabase */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-5">Datos de la empresa</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReadonlyField label="Nombre de la empresa" value={empresa.nombre_empresa} />
                  <ReadonlyField label="Ciudad / Municipio" value={empresa.ciudad_empresa} />
                  <ReadonlyField label="Dirección" value={empresa.direccion_empresa} />
                  <ReadonlyField label="Sede" value={empresa.sede_empresa ?? empresa.zona_empresa} />
                  <ReadonlyField label="Correo electrónico" value={empresa.correo_1} />
                  <ReadonlyField label="Teléfono" value={empresa.telefono_empresa} />
                  <ReadonlyField label="Contacto empresa" value={empresa.contacto_empresa} />
                  <ReadonlyField label="Cargo responsable" value={empresa.cargo} />
                  <ReadonlyField label="Caja de Compensación" value={empresa.caja_compensacion} />
                  <ReadonlyField label="Profesional RECA" value={empresa.profesional_asignado} />
                  <ReadonlyField label="Correo profesional" value={empresa.correo_profesional} />
                  <ReadonlyField label="Asesor fidelización" value={empresa.asesor} />
                  <ReadonlyField label="Correo asesor" value={empresa.correo_asesor} />
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 1: Motivación empresarial ── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">
                Motivación de la organización
              </h2>
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
                        checked
                          ? "border-reca bg-reca-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}>
                      <input type="checkbox"
                        value={opcion}
                        {...register("motivacion")}
                        className="mt-0.5 w-4 h-4 accent-reca-600 shrink-0"
                      />
                      <span className={cn(
                        "text-sm leading-snug",
                        checked ? "text-reca font-medium" : "text-gray-700"
                      )}>
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">
                Acuerdos y observaciones
              </h2>
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
                    rows={8}
                    {...register("acuerdos_observaciones")}
                    placeholder="Describe los acuerdos, compromisos y observaciones relevantes de la visita..."
                    className={cn(
                      "w-full rounded-xl border px-3.5 py-3 text-sm resize-none",
                      "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                      errors.acuerdos_observaciones
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200"
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
                    <span className="text-xs text-gray-400">
                      {acuerdos?.length ?? 0} caracteres
                    </span>
                  </div>
                </div>
              </FormField>
            </div>
          )}

          {/* ── PASO 3: Asistentes ── */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-gray-900">Asistentes</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mínimo 1, máximo 10 personas.
                  </p>
                </div>
                {fields.length < 10 && (
                  <button type="button"
                    onClick={() => {
                      // Insertar antes de la última fila (asesor agencia)
                      const insertAt = Math.max(1, fields.length - 1);
                      insert(insertAt, { nombre: "", cargo: "" });
                    }}
                    className="flex items-center gap-1.5 text-sm text-reca font-semibold hover:text-reca-dark transition-colors">
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                )}
              </div>

              {errors.asistentes?.root && (
                <p className="mb-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  ⚠ {errors.asistentes.root.message}
                </p>
              )}
              {errors.asistentes?.message && (
                <p className="mb-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  ⚠ {errors.asistentes.message}
                </p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const isFirst = index === 0;
                  const isLast = index === fields.length - 1;

                  return (
                    <div key={field.id}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border",
                        isFirst ? "border-reca-200 bg-reca-50" : "border-gray-100 bg-gray-50"
                      )}>
                      {isFirst && (
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-semibold text-reca bg-reca-100 px-2 py-0.5 rounded-full">
                              Profesional RECA
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField
                              label="Nombre"
                              htmlFor={`asistentes.0.nombre`}
                              required
                              error={errors.asistentes?.[0]?.nombre?.message}
                            >
                              <ProfesionalCombobox
                                value={watch("asistentes.0.nombre")}
                                onChange={v => setValue("asistentes.0.nombre", v, { shouldValidate: true })}
                                onCargoChange={c => setValue("asistentes.0.cargo", c)}
                                profesionales={profesionales}
                                error={errors.asistentes?.[0]?.nombre?.message}
                              />
                            </FormField>
                            <FormField label="Cargo" htmlFor={`asistentes.0.cargo`}>
                              <input
                                id="asistentes.0.cargo"
                                type="text"
                                {...register("asistentes.0.cargo")}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent"
                              />
                            </FormField>
                          </div>
                        </div>
                      )}

                      {!isFirst && (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {isLast && (
                            <div className="sm:col-span-2 flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                Asesor Agencia
                              </span>
                            </div>
                          )}
                          <FormField
                            label="Nombre completo"
                            htmlFor={`asistentes.${index}.nombre`}
                            required={isFirst}
                            error={errors.asistentes?.[index]?.nombre?.message}
                          >
                            <input
                              id={`asistentes.${index}.nombre`}
                              type="text"
                              {...register(`asistentes.${index}.nombre`)}
                              placeholder={isLast ? "Nombre del asesor agencia..." : "Nombre del asistente"}
                              className={cn(
                                "w-full rounded-lg border px-3 py-2 text-sm",
                                "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                                errors.asistentes?.[index]?.nombre
                                  ? "border-red-400 bg-red-50"
                                  : "border-gray-200 bg-white"
                              )}
                            />
                          </FormField>
                          <FormField label="Cargo" htmlFor={`asistentes.${index}.cargo`}>
                            <input
                              id={`asistentes.${index}.cargo`}
                              type="text"
                              {...register(`asistentes.${index}.cargo`)}
                              placeholder={isLast ? "Asesor Agencia" : "Cargo (opcional)"}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent"
                            />
                          </FormField>
                        </div>
                      )}

                      {!isFirst && fields.length > 2 && (
                        <button type="button" onClick={() => remove(index)}
                          className="mt-6 p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Error global ── */}
          {serverError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* ── Navegación ── */}
          <div className="mt-6 flex justify-between gap-3">
            <button type="button" onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? "Cambiar empresa" : "Anterior"}
            </button>

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-reca text-white text-sm font-semibold hover:bg-reca-dark transition-colors">
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl bg-reca text-white text-sm font-semibold",
                  "hover:bg-reca-dark transition-colors",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" />Finalizar</>
                )}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
