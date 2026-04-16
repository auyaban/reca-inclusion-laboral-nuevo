"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  type ArrayPath,
  type Control,
  Controller,
  type FieldErrors,
  type Path,
  type UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import {
  CONDICIONES_DISABLED_SECTION_MESSAGE,
  CONDICIONES_DISABILITIES_INTRO,
} from "@/components/forms/condicionesVacante/config";
import { FormField } from "@/components/ui/FormField";
import type {
  CondicionesVacanteCatalogsStatus,
} from "@/hooks/useCondicionesVacanteCatalogs";
import {
  normalizeCondicionesVacanteCatalogKey,
  type CondicionesVacanteCatalogs,
} from "@/lib/condicionesVacante";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";
import { cn } from "@/lib/utils";

type DiscapacidadRowError = {
  discapacidad?: { message?: string };
  descripcion?: { message?: string };
};

type DiscapacidadesErrorsShape = {
  [key: string]:
    | DiscapacidadRowError
    | { message?: string }
    | string
    | undefined;
  root?: { message?: string };
  message?: string;
};

const EMPTY_DISCAPACIDADES: CondicionesVacanteValues["discapacidades"] = [];

function getDerivedDescription(
  discapacidad: string,
  currentDescription: string,
  descriptionLookup: Map<string, string>
) {
  if (!discapacidad.trim()) {
    return "";
  }

  return (
    descriptionLookup.get(
      normalizeCondicionesVacanteCatalogKey(discapacidad)
    ) ?? currentDescription
  );
}

function ReadonlyAutoGrowTextarea({
  id,
  value,
  error,
  placeholder,
}: {
  id: string;
  value: string;
  error?: string;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      id={id}
      ref={textareaRef}
      rows={1}
      readOnly
      value={value}
      className={cn(
        "min-h-[7rem] w-full overflow-hidden rounded-xl border bg-gray-50 px-3.5 py-3 text-sm text-gray-700",
        error ? "border-red-400 bg-red-50" : "border-gray-200"
      )}
      placeholder={placeholder}
    />
  );
}

export function CondicionesVacanteDisabilitiesSection({
  control,
  errors,
  setValue,
  catalogs,
  catalogStatus,
  catalogError,
  onRetryCatalog,
  disabled = false,
}: {
  control: Control<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
  catalogs?: CondicionesVacanteCatalogs;
  catalogStatus: CondicionesVacanteCatalogsStatus;
  catalogError?: string | null;
  onRetryCatalog?: () => Promise<CondicionesVacanteCatalogs | null>;
  disabled?: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "discapacidades" as ArrayPath<CondicionesVacanteValues>,
  });
  const watchedRows =
    (useWatch({
      control,
      name: "discapacidades",
    }) as CondicionesVacanteValues["discapacidades"] | undefined) ??
    EMPTY_DISCAPACIDADES;
  const descriptionLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    Object.entries(catalogs?.disabilityDescriptions ?? {}).forEach(
      ([disability, description]) => {
        const normalizedKey = normalizeCondicionesVacanteCatalogKey(disability);
        const normalizedDescription = description.trim();
        if (!normalizedKey || !normalizedDescription) {
          return;
        }

        lookup.set(normalizedKey, normalizedDescription);
      }
    );

    return lookup;
  }, [catalogs?.disabilityDescriptions]);
  const disabilityOptions = useMemo(() => {
    const options = [...(catalogs?.disabilityOptions ?? [])];

    watchedRows.forEach((row) => {
      const discapacidad = row?.discapacidad?.trim();
      if (discapacidad && !options.includes(discapacidad)) {
        options.push(discapacidad);
      }
    });

    return options;
  }, [catalogs?.disabilityOptions, watchedRows]);
  const hasCatalogOptions = disabilityOptions.length > 0;
  const shouldShowInlineCatalogError =
    catalogStatus === "error" && !hasCatalogOptions && Boolean(catalogError);
  const shouldShowInlineCatalogLoading =
    catalogStatus === "loading" && !hasCatalogOptions;

  if (disabled) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
        {CONDICIONES_DISABLED_SECTION_MESSAGE}
      </div>
    );
  }

  const discapacidadesErrors = errors.discapacidades as
    | DiscapacidadesErrorsShape
    | undefined;
  const rootErrorMessage =
    discapacidadesErrors?.root?.message ?? discapacidadesErrors?.message;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-reca-100 bg-reca-50 px-4 py-4 text-sm text-gray-700">
        {CONDICIONES_DISABILITIES_INTRO}
      </div>

      {shouldShowInlineCatalogLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin text-reca" />
          Cargando catálogo maestro de discapacidades. Ya puedes diligenciar este
          bloque y el selector se actualizará cuando el catálogo termine de cargar.
        </div>
      ) : null}

      {shouldShowInlineCatalogError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>
            No se pudo cargar el catálogo maestro de discapacidades. Puedes seguir
            diligenciando este bloque; las descripciones restauradas se conservarán
            hasta que el catálogo vuelva a estar disponible.
          </p>
          <button
            type="button"
            onClick={() => {
              void onRetryCatalog?.();
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:border-amber-400 hover:bg-amber-100"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reintentar catálogo
          </button>
        </div>
      ) : null}

      <div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Discapacidades compatibles
          </p>
          <p className="text-xs text-gray-500">
            La descripción es informativa y se rellena desde el catálogo maestro
            cuando esté disponible.
          </p>
        </div>

      </div>

      {rootErrorMessage ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {rootErrorMessage}
        </p>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const fieldErrors = discapacidadesErrors?.[String(index)] as
            | DiscapacidadRowError
            | undefined;

          return (
            <div
              key={field.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Fila {index + 1}
                  </p>
                </div>

                {fields.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <FormField
                  label="Discapacidad"
                  htmlFor={`discapacidades.${index}.discapacidad`}
                  error={fieldErrors?.discapacidad?.message}
                >
                  <Controller
                    control={control}
                    name={`discapacidades.${index}.discapacidad` as Path<CondicionesVacanteValues>}
                    render={({ field: controllerField }) => {
                      const handleChange = (
                        discapacidad: string,
                        currentDescription: string
                      ) => {
                        controllerField.onChange(discapacidad);
                        setValue(
                          `discapacidades.${index}.descripcion` as Path<CondicionesVacanteValues>,
                          getDerivedDescription(
                            discapacidad,
                            currentDescription,
                            descriptionLookup
                          ) as never,
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          }
                        );
                      };

                      const currentDescription =
                        watchedRows[index]?.descripcion ?? "";

                      return hasCatalogOptions ? (
                        <select
                          id={`discapacidades.${index}.discapacidad`}
                          value={(controllerField.value as string | undefined) ?? ""}
                          onChange={(event) =>
                            handleChange(event.target.value, currentDescription)
                          }
                          onBlur={controllerField.onBlur}
                          className={cn(
                            "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                            fieldErrors?.discapacidad
                              ? "border-red-400"
                              : "border-gray-200"
                          )}
                        >
                          <option value="">Selecciona una discapacidad</option>
                          {disabilityOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`discapacidades.${index}.discapacidad`}
                          type="text"
                          value={(controllerField.value as string | undefined) ?? ""}
                          onChange={(event) =>
                            handleChange(event.target.value, currentDescription)
                          }
                          onBlur={controllerField.onBlur}
                          placeholder="Escribe la discapacidad compatible"
                          className={cn(
                            "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                            fieldErrors?.discapacidad
                              ? "border-red-400"
                              : "border-gray-200"
                          )}
                        />
                      );
                    }}
                  />
                </FormField>

                <FormField
                  label="Descripción sugerida"
                  htmlFor={`discapacidades.${index}.descripcion`}
                  error={fieldErrors?.descripcion?.message}
                  hint={
                    hasCatalogOptions
                      ? undefined
                      : shouldShowInlineCatalogLoading
                        ? "El catálogo maestro sigue cargando; si ya había una descripción restaurada, se conservará."
                        : "La descripción no bloquea el formulario y se recalculará cuando el catálogo maestro vuelva a estar disponible."
                  }
                >
                  <Controller
                    control={control}
                    name={`discapacidades.${index}.descripcion` as Path<CondicionesVacanteValues>}
                    render={({ field: controllerField }) => (
                      <ReadonlyAutoGrowTextarea
                        id={`discapacidades.${index}.descripcion`}
                        value={(controllerField.value as string | undefined) ?? ""}
                        error={fieldErrors?.descripcion?.message}
                        placeholder="Sin descripción sugerida por ahora."
                      />
                    )}
                  />
                </FormField>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-1">
        <button
          type="button"
          data-testid="condiciones-discapacidades-add-button"
          onClick={() => append({ discapacidad: "", descripcion: "" })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-reca transition-colors hover:text-reca-dark"
        >
          <Plus className="h-4 w-4" />
          Agregar fila
        </button>
      </div>
    </div>
  );
}
