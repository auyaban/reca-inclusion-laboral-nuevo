"use client";

import { useEffect } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type Path,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from "react-hook-form";
import { RepeatedPeopleSection } from "@/components/forms/shared/RepeatedPeopleSection";
import { FormField } from "@/components/ui/FormField";
import {
  calculateInterpreteLscSumatoria,
  calculateInterpreteLscTotalTiempo,
  countMeaningfulInterpreteLscInterpretes,
  createEmptyInterpreteLscInterpreteRow,
  normalizeInterpreteLscTime,
} from "@/lib/interpreteLsc";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";
import { cn } from "@/lib/utils";
import type { InterpreteCatalogItem } from "@/hooks/useInterpretesCatalog";
import { InterpreteCombobox } from "./InterpreteCombobox";

type Props = {
  control: Control<InterpreteLscValues>;
  register: UseFormRegister<InterpreteLscValues>;
  setValue: UseFormSetValue<InterpreteLscValues>;
  errors: FieldErrors<InterpreteLscValues>;
  interpretesCatalog: InterpreteCatalogItem[];
  interpretesCatalogError?: string | null;
  creatingName?: string | null;
  onCreateInterprete: (nombre: string) => Promise<InterpreteCatalogItem>;
};

function getFieldError(
  errors: FieldErrors<InterpreteLscValues>,
  index: number,
  fieldName: keyof InterpreteLscValues["interpretes"][number]
) {
  const rowErrors = errors.interpretes;
  if (!Array.isArray(rowErrors)) {
    return undefined;
  }

  const candidate = rowErrors[index];
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const fieldError = (
    candidate as Record<string, { message?: string }>
  )[fieldName];
  return fieldError?.message;
}

export function InterpreteLscInterpretesSection({
  control,
  register,
  setValue,
  errors,
  interpretesCatalog,
  interpretesCatalogError,
  creatingName,
  onCreateInterprete,
}: Props) {
  const [interpretes = [], sabana = { activo: false, horas: 1 }, sumatoriaHoras = ""] =
    useWatch({
      control,
      name: ["interpretes", "sabana", "sumatoria_horas"],
    }) as [
      InterpreteLscValues["interpretes"] | undefined,
      InterpreteLscValues["sabana"] | undefined,
      InterpreteLscValues["sumatoria_horas"] | undefined,
    ];
  const meaningfulInterpretesCount = countMeaningfulInterpreteLscInterpretes(
    interpretes
  );
  const sabanaStatusLabel = sabana?.activo
    ? `${sabana.horas} horas adicionales activas`
    : "No aplica";

  useEffect(() => {
    const nextInterpretes = (interpretes ?? []).map((row) => ({
      ...row,
      total_tiempo: calculateInterpreteLscTotalTiempo(
        row.hora_inicial,
        row.hora_final
      ),
    }));

    nextInterpretes.forEach((row, index) => {
      if (row.total_tiempo === interpretes?.[index]?.total_tiempo) {
        return;
      }

      setValue(`interpretes.${index}.total_tiempo`, row.total_tiempo, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: Boolean(row.hora_inicial || row.hora_final),
      });
    });

    const nextSumatoria = calculateInterpreteLscSumatoria(
      nextInterpretes,
      sabana
    );
    if ((sumatoriaHoras ?? "") !== nextSumatoria) {
      setValue("sumatoria_horas", nextSumatoria, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [interpretes, sabana, setValue, sumatoriaHoras]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-sky-950">
              Referencia rapida de horas e interpretes
            </h3>
            <p className="mt-1 text-xs text-sky-900/80">
              Acepta formatos como 9, 930, 9:30, 9 30 am y 21:30. Si la hora
              final es menor que la inicial, el sistema asume cruce de
              medianoche.
            </p>
          </div>

          <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-xs text-sky-950 shadow-sm">
            <p className="font-semibold">
              Interpretes activos: {meaningfulInterpretesCount}
            </p>
            <p className="mt-1">Sabana: {sabanaStatusLabel}</p>
          </div>
        </div>
      </div>

      <RepeatedPeopleSection
        control={control}
        errors={errors}
        name="interpretes"
        title="Interpretes"
        helperText="Empieza con 1 interprete y agrega hasta 5. El total por fila y la sumatoria se calculan automaticamente."
        config={{
          itemLabelSingular: "Interprete",
          itemLabelPlural: "Interpretes",
          primaryNameField: "nombre",
          meaningfulFieldIds: ["nombre", "hora_inicial", "hora_final", "total_tiempo"],
          createEmptyRow: createEmptyInterpreteLscInterpreteRow,
          maxRows: 5,
          getCardSubtitle: (row) => {
            const horaInicial = row.hora_inicial.trim();
            const horaFinal = row.hora_final.trim();
            if (horaInicial && horaFinal) {
              return `${horaInicial} - ${horaFinal}`;
            }

            return horaInicial || horaFinal || null;
          },
        }}
        renderRow={({ index }) => {
          const nombreField = `interpretes.${index}.nombre` as Path<InterpreteLscValues>;
          const horaInicialField =
            `interpretes.${index}.hora_inicial` as Path<InterpreteLscValues>;
          const horaFinalField =
            `interpretes.${index}.hora_final` as Path<InterpreteLscValues>;
          const totalTiempoField =
            `interpretes.${index}.total_tiempo` as Path<InterpreteLscValues>;
          const horaInicialRegistration = register(horaInicialField);
          const horaFinalRegistration = register(horaFinalField);

          return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField
                label="Nombre del interprete"
                htmlFor={String(nombreField)}
                required
                error={getFieldError(errors, index, "nombre")}
              >
                <Controller
                  control={control}
                  name={nombreField}
                  render={({ field }) => (
                    <InterpreteCombobox
                      inputId={String(nombreField)}
                      inputName={field.name}
                      value={(field.value as string | undefined) ?? ""}
                      onChange={field.onChange}
                      onBlur={(nextValue) => {
                        if (nextValue !== field.value) {
                          field.onChange(nextValue);
                        }
                        field.onBlur();
                      }}
                      interpretes={interpretesCatalog}
                      onCreate={onCreateInterprete}
                      creatingName={creatingName}
                      error={getFieldError(errors, index, "nombre")}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Hora inicial"
                htmlFor={String(horaInicialField)}
                required
                error={getFieldError(errors, index, "hora_inicial")}
              >
                <input
                  id={String(horaInicialField)}
                  type="text"
                  name={horaInicialRegistration.name}
                  ref={horaInicialRegistration.ref}
                  placeholder="Ej: 8, 830, 8:30"
                  onChange={horaInicialRegistration.onChange}
                  onBlur={(event) => {
                    horaInicialRegistration.onBlur(event);
                    const normalized = normalizeInterpreteLscTime(event.target.value);
                    if (normalized) {
                      setValue(horaInicialField, normalized, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-sm",
                    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                    getFieldError(errors, index, "hora_inicial")
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200"
                  )}
                />
              </FormField>

              <FormField
                label="Hora final"
                htmlFor={String(horaFinalField)}
                required
                error={getFieldError(errors, index, "hora_final")}
              >
                <input
                  id={String(horaFinalField)}
                  type="text"
                  name={horaFinalRegistration.name}
                  ref={horaFinalRegistration.ref}
                  placeholder="Ej: 10, 1030, 10:30"
                  onChange={horaFinalRegistration.onChange}
                  onBlur={(event) => {
                    horaFinalRegistration.onBlur(event);
                    const normalized = normalizeInterpreteLscTime(event.target.value);
                    if (normalized) {
                      setValue(horaFinalField, normalized, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-sm",
                    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                    getFieldError(errors, index, "hora_final")
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200"
                  )}
                />
              </FormField>

              <FormField
                label="Total tiempo"
                htmlFor={String(totalTiempoField)}
                error={getFieldError(errors, index, "total_tiempo")}
                hint="Se calcula automaticamente."
              >
                <input
                  id={String(totalTiempoField)}
                  type="text"
                  readOnly
                  aria-readonly="true"
                  {...register(totalTiempoField)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-sm",
                    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                    "bg-gray-50 text-gray-600",
                    getFieldError(errors, index, "total_tiempo")
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200"
                  )}
                />
              </FormField>
            </div>
          );
        }}
      />

          {interpretesCatalogError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          {interpretesCatalogError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Sabana</h3>
              <p className="mt-1 text-xs text-gray-500">
                Usa este bloque solo cuando debas sumar horas adicionales al servicio.
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                sabana?.activo
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {sabana?.activo ? "Activa" : "No aplica"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr] md:items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                {...register("sabana.activo")}
                className="h-4 w-4 rounded border-gray-300 text-reca focus:ring-reca-400"
              />
              Activar Sabana
            </label>

            <FormField
              label="Horas Sabana"
              htmlFor="sabana.horas"
              error={errors.sabana?.horas?.message}
              hint="Puedes usar decimales, por ejemplo 1.5."
            >
              <input
                id="sabana.horas"
                type="number"
                min="0"
                step="0.5"
                disabled={!sabana?.activo}
                {...register("sabana.horas", {
                  setValueAs: (value) => {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : 0;
                  },
                })}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                  !sabana?.activo && "bg-gray-50 text-gray-500",
                  errors.sabana?.horas ? "border-red-400 bg-red-50" : "border-gray-200"
                )}
              />
            </FormField>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">
            Sumatoria de horas
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Resultado consolidado de interpretes y Sabana.
          </p>

          <FormField
            label="Total acumulado"
            htmlFor="sumatoria_horas"
            className="mt-4"
          >
            <input
              id="sumatoria_horas"
              type="text"
              readOnly
              aria-readonly="true"
              {...register("sumatoria_horas")}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-lg font-semibold text-gray-800"
            />
          </FormField>

          <p className="mt-3 text-xs text-gray-500">
            {sabana?.activo
              ? "La sumatoria ya incluye las horas adicionales de Sabana."
              : "La sumatoria refleja unicamente las horas cargadas por interprete."}
          </p>
        </div>
      </div>
    </div>
  );
}
