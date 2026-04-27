"use client";

import { useEffect, useRef } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldValues,
  type UseFormGetValues,
  type Path,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { ProfesionalCombobox, type Profesional } from "@/components/forms/shared/ProfesionalCombobox";
import { cn } from "@/lib/utils";

type AsistenteValues = {
  nombre: string;
  cargo: string;
};

type FormValuesWithAsistentes = FieldValues & {
  asistentes: AsistenteValues[];
};

type AsistenteFieldError = {
  nombre?: { message?: string };
  cargo?: { message?: string };
};

type AsistentesErrorsShape = {
  [key: string]:
    | AsistenteFieldError
    | { message?: string }
    | string
    | undefined;
  root?: { message?: string };
  message?: string;
};

const INPUT_CLASS =
  "w-full rounded-lg border px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";

type FixedAsistentesSectionProps<TValues extends FormValuesWithAsistentes> = {
  control: Control<TValues>;
  register: UseFormRegister<TValues>;
  getValues: UseFormGetValues<TValues>;
  setValue: UseFormSetValue<TValues>;
  errors: FieldErrors<TValues>;
  rowsCount: number;
  initialAsistentes?: AsistenteValues[];
  profesionalAsignado?: string | null;
  profesionales?: Profesional[];
  modifiedFieldIds?: ReadonlySet<string>;
  readOnly?: boolean;
  title?: string;
  summaryText?: string;
  helperText?: string;
};

export function FixedAsistentesSection<TValues extends FormValuesWithAsistentes>({
  control,
  register,
  getValues,
  setValue,
  errors,
  rowsCount,
  initialAsistentes = [],
  profesionalAsignado = null,
  profesionales = [],
  modifiedFieldIds = new Set<string>(),
  readOnly = false,
  title = "Asistentes",
  summaryText,
  helperText,
}: FixedAsistentesSectionProps<TValues>) {
  const asistentesErrors = errors?.asistentes as AsistentesErrorsShape | undefined;
  const rootErrorMessage =
    asistentesErrors?.root?.message ?? asistentesErrors?.message;
  const seededProfessionalNameRef = useRef<string | null>(null);
  const seededCargoNameRef = useRef<string | null>(null);
  const firstRowEditedManuallyRef = useRef(false);

  useEffect(() => {
    const normalizedSuggestedName = profesionalAsignado?.trim() ?? "";
    const firstNameFieldId = "asistentes.0.nombre" as Path<TValues>;
    const firstCargoFieldId = "asistentes.0.cargo" as Path<TValues>;
    const currentName = String(getValues(firstNameFieldId) ?? "").trim();
    const currentCargo = String(getValues(firstCargoFieldId) ?? "").trim();
    const initialFirstName =
      typeof initialAsistentes[0]?.nombre === "string"
        ? initialAsistentes[0].nombre.trim()
        : "";
    const initialFirstCargo =
      typeof initialAsistentes[0]?.cargo === "string"
        ? initialAsistentes[0].cargo.trim()
        : "";

    if (!currentName && initialFirstName) {
      setValue(firstNameFieldId, initialFirstName as never, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }

    if (!currentCargo && initialFirstCargo) {
      setValue(firstCargoFieldId, initialFirstCargo as never, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }

    if (
      firstRowEditedManuallyRef.current ||
      currentName ||
      initialFirstName ||
      !normalizedSuggestedName
    ) {
      return;
    }

    const matchedProfessional =
      profesionales.find(
        (profesional) =>
          profesional.nombre_profesional.toLocaleLowerCase("es-CO") ===
          normalizedSuggestedName.toLocaleLowerCase("es-CO")
      ) ?? null;

    if (seededProfessionalNameRef.current !== normalizedSuggestedName) {
      setValue(firstNameFieldId, normalizedSuggestedName as never, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      seededProfessionalNameRef.current = normalizedSuggestedName;
    }

    if (
      !currentCargo &&
      !initialFirstCargo &&
      matchedProfessional?.cargo_profesional &&
      seededCargoNameRef.current !== normalizedSuggestedName
    ) {
      setValue(firstCargoFieldId, matchedProfessional.cargo_profesional as never, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      seededCargoNameRef.current = normalizedSuggestedName;
    }
  }, [getValues, initialAsistentes, profesionalAsignado, profesionales, setValue]);

  useEffect(() => {
    const firstName = String(getValues("asistentes.0.nombre" as Path<TValues>) ?? "").trim();
    if (firstName) {
      seededProfessionalNameRef.current = firstName;
    }
  }, [getValues]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {summaryText ? (
          <p className="text-sm text-gray-500">{summaryText}</p>
        ) : null}
        {helperText ? (
          <p className="text-sm text-gray-500">{helperText}</p>
        ) : null}
      </div>

      {rootErrorMessage ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {rootErrorMessage}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
        <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <p>Asistente</p>
          <p>Cargo</p>
        </div>
        {Array.from({ length: rowsCount }, (_, index) => {
          const fieldErrors = asistentesErrors?.[String(index)] as
            | AsistenteFieldError
            | undefined;
          const nombreFieldId = `asistentes.${index}.nombre` as Path<TValues>;
          const cargoFieldId = `asistentes.${index}.cargo` as Path<TValues>;
          const isFirstRow = index === 0;

          return (
            <div
              key={`asistente-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_240px] gap-3 border-b border-gray-200 bg-white px-4 py-4 last:border-b-0"
            >
              <div>
                <label htmlFor={nombreFieldId} className="sr-only">
                  Asistente {index + 1}
                </label>
                {isFirstRow && !readOnly ? (
                  <Controller
                    control={control}
                    name={nombreFieldId}
                    defaultValue={
                      (initialAsistentes[index]?.nombre ?? "") as TValues[Path<TValues>]
                    }
                    render={({ field }) => (
                      <ProfesionalCombobox
                        inputId={nombreFieldId}
                        inputName={field.name}
                        value={(field.value as string | undefined) ?? ""}
                        onChange={(nextValue) => {
                          firstRowEditedManuallyRef.current = true;
                          field.onChange(nextValue);
                        }}
                        onBlur={(nextValue) => {
                          if (nextValue !== field.value) {
                            firstRowEditedManuallyRef.current = true;
                            field.onChange(nextValue);
                          }
                          field.onBlur();
                        }}
                        onCargoChange={(cargo) =>
                          setValue(cargoFieldId, cargo as never, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        profesionales={profesionales}
                        error={fieldErrors?.nombre?.message}
                        highlighted={modifiedFieldIds.has(String(nombreFieldId))}
                        placeholder="Buscar profesional RECA..."
                      />
                    )}
                  />
                ) : (
                  <input
                    id={nombreFieldId}
                    type="text"
                    readOnly={readOnly}
                    placeholder={
                      isFirstRow ? "Profesional RECA" : `Asistente ${index + 1}`
                    }
                    {...register(nombreFieldId)}
                    className={cn(
                      INPUT_CLASS,
                      readOnly ? "bg-gray-100 text-gray-700" : "bg-white",
                      fieldErrors?.nombre
                        ? "border-red-400 bg-red-50"
                        : modifiedFieldIds.has(String(nombreFieldId))
                          ? "border-amber-300 bg-amber-50"
                          : "border-gray-200"
                    )}
                  />
                )}
                {fieldErrors?.nombre?.message ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.nombre.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={cargoFieldId} className="sr-only">
                  Cargo asistente {index + 1}
                </label>
                <input
                  id={cargoFieldId}
                  type="text"
                  readOnly={readOnly}
                  placeholder="Cargo"
                  {...register(cargoFieldId)}
                  className={cn(
                    INPUT_CLASS,
                    readOnly ? "bg-gray-100 text-gray-700" : "bg-white",
                    fieldErrors?.cargo
                      ? "border-red-400 bg-red-50"
                      : modifiedFieldIds.has(String(cargoFieldId))
                        ? "border-amber-300 bg-amber-50"
                        : "border-gray-200"
                  )}
                />
                {fieldErrors?.cargo?.message ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.cargo.message}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
