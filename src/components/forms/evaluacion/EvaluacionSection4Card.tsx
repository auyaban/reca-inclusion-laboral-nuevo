"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import type { EvaluacionAccessibilitySummary } from "@/lib/evaluacion";
import { EVALUACION_SECTION_4_OPTIONS } from "@/lib/evaluacionSections";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

const SELECT_CLASS =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";
const READONLY_TEXTAREA_CLASS =
  "min-h-[10rem] w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700";

type EvaluacionSection4CardProps = {
  values: EvaluacionValues["section_4"];
  summary: EvaluacionAccessibilitySummary;
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
};

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function getFieldError(
  errors: FieldErrors<EvaluacionValues>,
  fieldName: "section_4.nivel_accesibilidad" | "section_4.descripcion"
) {
  const fieldKey = fieldName.split(".")[1] as keyof EvaluacionValues["section_4"];
  const candidate = errors.section_4?.[fieldKey];
  return typeof candidate?.message === "string" ? candidate.message : undefined;
}

export function EvaluacionSection4Card({
  values,
  summary,
  register,
  errors,
}: EvaluacionSection4CardProps) {
  const totalQuestions =
    summary.counts.si + summary.counts.no + summary.counts.parcial;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Resumen de accesibilidad
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            El concepto se recalcula desde las respuestas activas de las
            secciones `2.1` a `3`.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              Total evaluado
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {totalQuestions}
            </p>
          </div>

          {[
            {
              label: "Si",
              count: summary.counts.si,
              percentage: summary.percentages.si,
              accent: "text-emerald-700",
            },
            {
              label: "No",
              count: summary.counts.no,
              percentage: summary.percentages.no,
              accent: "text-rose-700",
            },
            {
              label: "Parcial",
              count: summary.counts.parcial,
              percentage: summary.percentages.parcial,
              accent: "text-amber-700",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                {item.label}
              </p>
              <p className={cn("mt-1 text-2xl font-semibold", item.accent)}>
                {item.count}
              </p>
              <p className="text-xs text-gray-500">
                {formatPercentage(item.percentage)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-reca-100 bg-reca-50 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-reca">
          Nivel sugerido
        </p>
        <p
          className="mt-1 text-lg font-semibold text-gray-900"
          data-testid="evaluacion-section-4-suggestion"
        >
          {summary.suggestion || "Aun sin suficiente informacion"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Puedes ajustar el nivel manualmente si la lectura profesional lo
          requiere. La descripcion se mantiene derivada.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField
          label="Nivel de accesibilidad"
          htmlFor="section_4.nivel_accesibilidad"
          required
          error={getFieldError(errors, "section_4.nivel_accesibilidad")}
        >
          <select
            id="section_4.nivel_accesibilidad"
            data-testid="section_4.nivel_accesibilidad"
            {...register("section_4.nivel_accesibilidad")}
            className={cn(
              SELECT_CLASS,
              errors.section_4?.nivel_accesibilidad
                ? "border-red-400"
                : "border-gray-200"
            )}
          >
            <option value="">Selecciona una opcion</option>
            {EVALUACION_SECTION_4_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Descripcion"
          htmlFor="section_4.descripcion"
          required
          error={getFieldError(errors, "section_4.descripcion")}
        >
          <textarea
            id="section_4.descripcion"
            data-testid="section_4.descripcion"
            value={values.descripcion}
            readOnly
            aria-readonly="true"
            className={READONLY_TEXTAREA_CLASS}
          />
        </FormField>
      </div>
    </div>
  );
}
