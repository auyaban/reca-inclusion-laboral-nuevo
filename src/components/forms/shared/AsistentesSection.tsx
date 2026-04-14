"use client";

import { useEffect } from "react";
import {
  type ArrayPath,
  type Control,
  Controller,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/ui/FormField";
import {
  ASESOR_AGENCIA_CARGO,
  type AsistentesMode,
} from "@/lib/asistentes";
import { ProfesionalCombobox, type Profesional } from "./ProfesionalCombobox";
import { AsesorAgenciaCombobox } from "./AsesorAgenciaCombobox";

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

type Props<TValues extends FormValuesWithAsistentes> = {
  control: Control<TValues>;
  register: UseFormRegister<TValues>;
  setValue: UseFormSetValue<TValues>;
  errors: FieldErrors<TValues>;
  profesionales: Profesional[];
  mode: AsistentesMode;
  profesionalAsignado?: string | null;
  helperText?: string;
  intermediateCargoPlaceholder?: string;
};

const MAX = 10;

/**
 * Sección de asistentes reutilizable para todos los formularios.
 *
 * - Fila 0: combobox de profesionales RECA + cargo auto-llenado
 *           Pre-cargado con profesional_asignado de la empresa
 * - Filas intermedias: texto libre
 * - Última fila: asesor de agencia con combobox editable + cargo pre-llenado
 * - "Agregar" inserta antes de la última fila
 * - Mínimo 2 filas, máximo 10
 */
export function AsistentesSection<TValues extends FormValuesWithAsistentes>({
  control,
  register,
  setValue,
  errors,
  profesionales,
  mode,
  profesionalAsignado,
  helperText,
  intermediateCargoPlaceholder = "Cargo (opcional)",
}: Props<TValues>) {
  const { fields, remove, insert } = useFieldArray({
    control,
    name: "asistentes" as ArrayPath<TValues>,
  });
  const isAgencyAdvisorMode = mode === "reca_plus_agency_advisor";

  useEffect(() => {
    if (!profesionalAsignado || !profesionales.length) return;
    const match = profesionales.find(
      (profesional) =>
        profesional.nombre_profesional.toLowerCase() ===
        profesionalAsignado.toLowerCase()
    );

    if (match?.cargo_profesional) {
      setValue(
        "asistentes.0.cargo" as Path<TValues>,
        (match.cargo_profesional ?? "") as never
      );
    }
  }, [profesionalAsignado, profesionales, setValue]);

  const asistentesErrors = errors?.asistentes as AsistentesErrorsShape | undefined;
  const rootErrorMessage =
    asistentesErrors?.root?.message ?? asistentesErrors?.message;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Asistentes</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Mínimo 2 personas · Máximo {MAX}
          </p>
          {helperText ? (
            <p className="mt-1 text-xs text-gray-500">{helperText}</p>
          ) : null}
        </div>
        {fields.length < MAX ? (
          <button
            type="button"
            onClick={() =>
              insert(
                isAgencyAdvisorMode ? Math.max(1, fields.length - 1) : fields.length,
                {
                  nombre: "",
                  cargo: "",
                } as never
              )
            }
            className="flex items-center gap-1.5 text-sm font-semibold text-reca transition-colors hover:text-reca-dark"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        ) : null}
      </div>

      {rootErrorMessage ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          ⚠ {rootErrorMessage}
        </p>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const isFirst = index === 0;
          const isLast = index === fields.length - 1;
          const isAgencyAdvisorRow = isAgencyAdvisorMode && isLast && !isFirst;
          const fieldErrors = asistentesErrors?.[String(index)] as
            | AsistenteFieldError
            | undefined;

          return (
            <div
              key={field.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4",
                isFirst ? "border-reca-200 bg-reca-50" : "border-gray-100 bg-gray-50"
              )}
            >
              <div className="flex-1">
                {(isFirst || isAgencyAdvisorRow) ? (
                  <div className="mb-3">
                    {isFirst ? (
                      <span className="rounded-full bg-reca-100 px-2 py-0.5 text-xs font-semibold text-reca">
                        Profesional RECA
                      </span>
                    ) : null}
                    {isAgencyAdvisorRow ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Asesor Agencia
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    label="Nombre completo"
                    htmlFor={`asistentes.${index}.nombre`}
                    required={isFirst || isAgencyAdvisorRow}
                    error={fieldErrors?.nombre?.message}
                  >
                    {isFirst ? (
                      <Controller
                        control={control}
                        name={`asistentes.${index}.nombre` as Path<TValues>}
                        render={({ field: controllerField }) => (
                          <ProfesionalCombobox
                            inputId={`asistentes.${index}.nombre`}
                            inputName={controllerField.name}
                            value={
                              (controllerField.value as string | undefined) ?? ""
                            }
                            onChange={controllerField.onChange}
                            onBlur={(nextValue) => {
                              if (nextValue !== controllerField.value) {
                                controllerField.onChange(nextValue);
                              }
                              controllerField.onBlur();
                            }}
                            onCargoChange={(cargo) =>
                              setValue(
                                `asistentes.${index}.cargo` as Path<TValues>,
                                cargo as never,
                                { shouldDirty: true }
                              )
                            }
                            profesionales={profesionales}
                            error={fieldErrors?.nombre?.message}
                          />
                        )}
                      />
                    ) : isAgencyAdvisorRow ? (
                      <Controller
                        control={control}
                        name={`asistentes.${index}.nombre` as Path<TValues>}
                        render={({ field: controllerField }) => (
                          <AsesorAgenciaCombobox
                            inputId={`asistentes.${index}.nombre`}
                            inputName={controllerField.name}
                            value={
                              (controllerField.value as string | undefined) ?? ""
                            }
                            onChange={controllerField.onChange}
                            onBlur={(nextValue) => {
                              if (nextValue !== controllerField.value) {
                                controllerField.onChange(nextValue);
                              }
                              controllerField.onBlur();
                            }}
                            error={fieldErrors?.nombre?.message}
                          />
                        )}
                      />
                    ) : (
                      <input
                        id={`asistentes.${index}.nombre`}
                        type="text"
                        {...register(`asistentes.${index}.nombre` as Path<TValues>)}
                        placeholder="Nombre del asistente"
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-sm",
                          "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                          fieldErrors?.nombre
                            ? "border-red-400 bg-red-50"
                            : "border-gray-200 bg-white"
                        )}
                      />
                    )}
                  </FormField>

                  <FormField
                    label="Cargo"
                    htmlFor={`asistentes.${index}.cargo`}
                    error={fieldErrors?.cargo?.message}
                  >
                    <input
                      id={`asistentes.${index}.cargo`}
                      type="text"
                      {...register(`asistentes.${index}.cargo` as Path<TValues>)}
                      placeholder={
                        isAgencyAdvisorRow
                          ? ASESOR_AGENCIA_CARGO
                          : intermediateCargoPlaceholder
                      }
                      onBlur={(event) => {
                        if (!isAgencyAdvisorRow) return;
                        const cargo = event.target.value.trim();
                        setValue(
                          `asistentes.${index}.cargo` as Path<TValues>,
                          (cargo || ASESOR_AGENCIA_CARGO) as never
                        );
                      }}
                      className={cn(
                        "w-full rounded-lg border bg-white px-3 py-2 text-sm",
                        "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                        fieldErrors?.cargo
                          ? "border-red-400 bg-red-50"
                          : "border-gray-200"
                      )}
                    />
                  </FormField>
                </div>
              </div>

              {!isFirst &&
              fields.length > 2 &&
              (!isAgencyAdvisorMode || !isLast) ? (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-6 p-1.5 text-gray-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
