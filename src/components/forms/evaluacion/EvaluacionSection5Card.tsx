"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import { EVALUACION_SECTION_5_ITEMS } from "@/lib/evaluacionSections";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

const SELECT_CLASS =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";
const TEXTAREA_BASE_CLASS =
  "min-h-[6rem] w-full rounded-xl border px-3.5 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";
const READONLY_TEXTAREA_CLASS = `${TEXTAREA_BASE_CLASS} border-gray-200 bg-gray-50 text-gray-700`;
const NOTE_PLACEHOLDER =
  "Describe la condición observada para esta discapacidad (accesibilidad real, barreras, ajustes posibles).";

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
    <div className="space-y-4">
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
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-reca">
                Ajuste {index + 1}
              </p>
              <h3 className="mt-1 text-sm font-semibold leading-6 text-gray-900">
                {item.label}
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {item.codes}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_240px_minmax(0,1.4fr)]">
              <FormField
                label="Nota"
                htmlFor={noteFieldId}
                required
                error={noteError}
              >
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
              </FormField>

              <FormField
                label="Aplica"
                htmlFor={applyFieldId}
                required
                error={applyError}
              >
                <select
                  id={applyFieldId}
                  data-testid={applyFieldId}
                  {...register(`section_5.${item.id}.aplica`)}
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
              </FormField>

              <FormField
                label="Ajustes"
                htmlFor={ajustesFieldId}
                required
                error={ajustesError}
              >
                <textarea
                  id={ajustesFieldId}
                  data-testid={ajustesFieldId}
                  value={itemValues?.ajustes ?? ""}
                  readOnly
                  aria-readonly="true"
                  className={READONLY_TEXTAREA_CLASS}
                />
              </FormField>
            </div>
          </section>
        );
      })}
    </div>
  );
}
