"use client";

import { useState } from "react";
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
} from "lucide-react";

const STEPS = [
  { label: "Datos empresa" },
  { label: "Motivación" },
  { label: "Acuerdos" },
  { label: "Asistentes" },
];

// Campo de solo lectura (viene de Supabase)
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

export default function PresentacionForm() {
  const router = useRouter();
  const empresa = useEmpresaStore((s) => s.empresa);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
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
      asistentes: [{ nombre: "", cargo: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "asistentes",
  });

  const motivacion = watch("motivacion");

  // Redirigir si no hay empresa seleccionada
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
      if (!res.ok) throw new Error("Error al guardar");
      setSubmitted(true);
    } catch {
      setServerError("Error al guardar el formulario. Intenta de nuevo.");
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
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/hub")}
              className="w-full py-2.5 rounded-xl bg-reca text-white text-sm font-semibold hover:bg-reca-dark transition-colors"
            >
              Volver al menú
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setStep(0);
              }}
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
              {/* Campos editables */}
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

          {/* ── PASO 2: Acuerdos y observaciones ── */}
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
                    onClick={() => append({ nombre: "", cargo: "" })}
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
                {fields.map((field, index) => (
                  <div key={field.id}
                    className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        label="Nombre completo"
                        htmlFor={`asistentes.${index}.nombre`}
                        required
                        error={errors.asistentes?.[index]?.nombre?.message}
                      >
                        <input
                          id={`asistentes.${index}.nombre`}
                          type="text"
                          {...register(`asistentes.${index}.nombre`)}
                          placeholder="Nombre del asistente"
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm",
                            "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                            errors.asistentes?.[index]?.nombre
                              ? "border-red-400 bg-red-50"
                              : "border-gray-200 bg-white"
                          )}
                        />
                      </FormField>
                      <FormField
                        label="Cargo"
                        htmlFor={`asistentes.${index}.cargo`}
                      >
                        <input
                          id={`asistentes.${index}.cargo`}
                          type="text"
                          {...register(`asistentes.${index}.cargo`)}
                          placeholder="Cargo (opcional)"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent"
                        />
                      </FormField>
                    </div>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)}
                        className="mt-6 p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
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
