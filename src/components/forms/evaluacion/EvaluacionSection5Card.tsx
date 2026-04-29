"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { cn } from "@/lib/utils";
import { EVALUACION_SECTION_5_ITEMS } from "@/lib/evaluacionSections";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

// Layout inspirado en el maestro:
//   columna 1 (Discapacidad) | columna 2 (Aplica) | columna 3 (Ajustes)
//   fila completa "NOTA:" debajo de cada item.
// En pantallas pequeñas el grid colapsa a una columna apilada.
const SELECT_CLASS =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";
const TEXTAREA_BASE_CLASS =
  "min-h-[6rem] w-full rounded-xl border px-3.5 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";
const READONLY_AJUSTES_CLASS =
  "min-h-[7.5rem] w-full whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm leading-6 text-gray-700";
const NOTE_PLACEHOLDER =
  "Describe la condición observada para esta discapacidad (accesibilidad real, barreras, ajustes posibles).";
const COLUMN_HEADER_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500";
const REQUIRED_MARK = (
  <span className="ml-1 text-red-500" aria-hidden="true">
    *
  </span>
);

type EvaluacionSection5CardProps = {
  values: EvaluacionValues["section_5"];
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
};

function getFieldError(
  errors: FieldErrors<EvaluacionValues>,
  itemId: string,
  fieldKey: "aplica" | "nota" | "ajustes"
) {
  const candidate = errors.section_5?.[
    itemId as keyof EvaluacionValues["section_5"]
  ] as
    | {
        aplica?: { message?: string };
        nota?: { message?: string };
        ajustes?: { message?: string };
      }
    | undefined;

  return typeof candidate?.[fieldKey]?.message === "string"
    ? candidate[fieldKey]?.message
    : undefined;
}

export function EvaluacionSection5Card({
  values,
  register,
  errors,
}: EvaluacionSection5CardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Cabecera de tabla (visible solo en pantallas grandes para evocar el maestro) */}
      <div className="hidden border-b border-gray-200 bg-reca-50 px-5 py-3 text-reca lg:grid lg:grid-cols-[minmax(0,1.1fr)_180px_minmax(0,1.6fr)] lg:gap-4">
        <span className={cn(COLUMN_HEADER_CLASS, "text-reca")}>
          Discapacidades
        </span>
        <span className={cn(COLUMN_HEADER_CLASS, "text-reca")}>Aplica</span>
        <span className={cn(COLUMN_HEADER_CLASS, "text-reca")}>
          Ajustes razonables
        </span>
      </div>

      <div className="divide-y divide-gray-200">
        {EVALUACION_SECTION_5_ITEMS.map((item, index) => {
          const itemValues = values[item.id];
          const applyFieldId = `section_5.${item.id}.aplica`;
          const noteFieldId = `section_5.${item.id}.nota`;
          const ajustesFieldId = `section_5.${item.id}.ajustes`;
          const applyError = getFieldError(errors, item.id, "aplica");
          const noteError = getFieldError(errors, item.id, "nota");
          const ajustesError = getFieldError(errors, item.id, "ajustes");

          return (
            <section
              key={item.id}
              className={cn(
                "px-5 py-5",
                index % 2 === 1 ? "bg-gray-50/40" : "bg-white"
              )}
              aria-label={`Ajuste razonable ${index + 1}: ${item.label}`}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_180px_minmax(0,1.6fr)]">
                {/* Columna 1: Discapacidad + códigos CIE-10 */}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-reca">
                    Ajuste {index + 1}
                  </p>
                  <h3 className="text-sm font-semibold leading-6 text-gray-900">
                    {item.label}
                  </h3>
                  <p className="text-xs leading-5 text-gray-500">
                    {item.codes}
                  </p>
                </div>

                {/* Columna 2: Aplica */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={applyFieldId}
                    className="block text-xs font-medium text-gray-600 lg:hidden"
                  >
                    Aplica{REQUIRED_MARK}
                  </label>
                  <select
                    id={applyFieldId}
                    data-testid={applyFieldId}
                    {...register(`section_5.${item.id}.aplica`)}
                    aria-label={`Aplica para ${item.label}`}
                    className={cn(
                      SELECT_CLASS,
                      applyError ? "border-red-400" : "border-gray-200"
                    )}
                  >
                    <option value="">Selecciona una opcion</option>
                    {item.fields[0]?.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {applyError ? (
                    <p className="text-xs text-red-600">{applyError}</p>
                  ) : null}
                </div>

                {/* Columna 3: Ajustes razonables (texto canónico read-only) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={ajustesFieldId}
                    className="block text-xs font-medium text-gray-600 lg:hidden"
                  >
                    Ajustes razonables
                  </label>
                  <div
                    id={ajustesFieldId}
                    data-testid={ajustesFieldId}
                    className={READONLY_AJUSTES_CLASS}
                  >
                    {itemValues?.ajustes ? (
                      itemValues.ajustes
                    ) : (
                      <span className="italic text-gray-400">
                        Selecciona Aplica para ver el texto institucional.
                      </span>
                    )}
                  </div>
                  {ajustesError ? (
                    <p className="text-xs text-red-600">{ajustesError}</p>
                  ) : null}
                </div>
              </div>

              {/* Fila NOTA: imitando la fila NOTA: del maestro */}
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Nota
                  </span>
                  {REQUIRED_MARK}
                </div>
                <textarea
                  id={noteFieldId}
                  data-testid={noteFieldId}
                  {...register(`section_5.${item.id}.nota`)}
                  placeholder={NOTE_PLACEHOLDER}
                  className={cn(
                    TEXTAREA_BASE_CLASS,
                    "bg-white",
                    noteError ? "border-red-400 bg-red-50" : "border-gray-200"
                  )}
                />
                {noteError ? (
                  <p className="mt-1 text-xs text-red-600">{noteError}</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
