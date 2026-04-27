"use client";

import type {
  FieldErrors,
  Path,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { LongTextField } from "@/components/forms/shared/LongTextField";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import {
  INDUCCION_ORGANIZACIONAL_SECTION_3_MEDIO_OPTIONS,
  INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS,
  INDUCCION_ORGANIZACIONAL_SECTION_3_VISTO_OPTIONS,
  INDUCCION_ORGANIZACIONAL_SECTION_4_MEDIO_OPTIONS,
  getInduccionOrganizacionalRecommendationForMedium,
  type InduccionOrganizacionalSection3ItemId,
  type InduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";

const INPUT_CLASS =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getValueAtPath(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((currentValue, segment) => {
    if (!isRecord(currentValue)) {
      return undefined;
    }

    return currentValue[segment];
  }, value);
}

function getFieldError<TFieldName extends string>(
  errors: FieldErrors<InduccionOrganizacionalValues>,
  fieldName: TFieldName
) {
  const candidate = getValueAtPath(errors, fieldName);
  if (!isRecord(candidate)) {
    return undefined;
  }

  return typeof candidate.message === "string" ? candidate.message : undefined;
}

function buildFieldPath(
  itemId: InduccionOrganizacionalSection3ItemId,
  fieldId: "visto" | "responsable" | "medio_socializacion" | "descripcion"
) {
  return `section_3.${itemId}.${fieldId}` as Path<InduccionOrganizacionalValues>;
}

function SectionSelectField({
  label,
  fieldName,
  options,
  register,
  errors,
  onChange,
}: {
  label: string;
  fieldName: Path<InduccionOrganizacionalValues>;
  options: readonly string[];
  register: UseFormRegister<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
  onChange?: (value: string) => void;
}) {
  const error = getFieldError(errors, fieldName);

  return (
    <FormField label={label} htmlFor={fieldName} error={error}>
      <select
        id={fieldName}
        data-testid={String(fieldName)}
        {...register(fieldName, {
          onChange: (event) => {
            onChange?.(String(event.target.value));
          },
        })}
        className={cn(
          INPUT_CLASS,
          error ? "border-red-400 bg-red-50" : "border-gray-200"
        )}
      >
        <option value="">Selecciona</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function SectionTextField({
  label,
  fieldName,
  placeholder,
  register,
  errors,
}: {
  label: string;
  fieldName: Path<InduccionOrganizacionalValues>;
  placeholder?: string;
  register: UseFormRegister<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
}) {
  const error = getFieldError(errors, fieldName);

  return (
    <FormField label={label} htmlFor={fieldName} error={error}>
      <input
        id={fieldName}
        type="text"
        {...register(fieldName)}
        placeholder={placeholder}
        className={cn(
          INPUT_CLASS,
          error ? "border-red-400 bg-red-50" : "border-gray-200"
        )}
      />
    </FormField>
  );
}

function BulkButtons({
  onApply,
}: {
  onApply: (value: string) => void;
}) {
  const actions = [
    { label: "Todo si", value: "Si" },
    { label: "Todo no", value: "No" },
    { label: "Todo no aplica", value: "No aplica" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => onApply(action.value)}
          className="rounded-full border border-reca-200 bg-white px-3 py-1.5 text-xs font-semibold text-reca transition-colors hover:border-reca hover:bg-reca-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function RecommendationReadonlyField({
  fieldName,
  value,
  label,
  errors,
}: {
  fieldName: Path<InduccionOrganizacionalValues>;
  value: string;
  label: string;
  errors: FieldErrors<InduccionOrganizacionalValues>;
}) {
  const error = getFieldError(errors, fieldName);

  return (
    <FormField label={label} htmlFor={fieldName} error={error}>
      <textarea
        id={fieldName}
        readOnly
        value={value}
        rows={5}
        className={cn(
          "min-h-[10rem] w-full rounded-lg border px-3 py-2.5 text-sm",
          error ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"
        )}
      />
    </FormField>
  );
}

export function InduccionOrganizacionalDevelopmentSection({
  register,
  setValue,
  errors,
}: {
  register: UseFormRegister<InduccionOrganizacionalValues>;
  setValue: UseFormSetValue<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
}) {
  function applyBulk(groupItemIds: readonly InduccionOrganizacionalSection3ItemId[], value: string) {
    groupItemIds.forEach((itemId) => {
      setValue(buildFieldPath(itemId, "visto"), value as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    });
  }

  return (
    <div className="space-y-5">
      {INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS.map((group) => (
        <section key={group.id} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{group.title}</h4>
              <p className="mt-0.5 text-xs text-gray-500">
                Cada fila conserva visto, responsable, medio y descripcion.
              </p>
            </div>
            <BulkButtons onApply={(value) => applyBulk(group.items.map((item) => item.id), value)} />
          </div>

          <div className="space-y-3">
            {group.items.map((item) => {
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <p className="mb-3 text-sm font-medium text-gray-900">{item.label}</p>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <SectionSelectField
                      label="Visto"
                      fieldName={buildFieldPath(item.id, "visto")}
                      options={INDUCCION_ORGANIZACIONAL_SECTION_3_VISTO_OPTIONS}
                      register={register}
                      errors={errors}
                    />
                    <SectionTextField
                      label="Responsable"
                      fieldName={buildFieldPath(item.id, "responsable")}
                      placeholder="Responsable de la induccion"
                      register={register}
                      errors={errors}
                    />
                    <SectionSelectField
                      label="Medio de socializacion"
                      fieldName={buildFieldPath(item.id, "medio_socializacion")}
                      options={INDUCCION_ORGANIZACIONAL_SECTION_3_MEDIO_OPTIONS}
                      register={register}
                      errors={errors}
                    />
                    <SectionTextField
                      label="Descripcion"
                      fieldName={buildFieldPath(item.id, "descripcion")}
                      placeholder="Descripcion breve"
                      register={register}
                      errors={errors}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function InduccionOrganizacionalRecommendationsSection({
  register,
  setValue,
  errors,
  section4,
}: {
  register: UseFormRegister<InduccionOrganizacionalValues>;
  setValue: UseFormSetValue<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
  section4: InduccionOrganizacionalValues["section_4"];
}) {
  return (
    <div className="space-y-4">
      {section4.map((row, index) => {
        const medioPath = `section_4.${index}.medio` as Path<InduccionOrganizacionalValues>;
        const recomendacionPath = `section_4.${index}.recomendacion` as Path<InduccionOrganizacionalValues>;

        return (
          <div
            key={index}
            className="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FormField label="Medio" htmlFor={medioPath} error={getFieldError(errors, medioPath)}>
                <select
                  id={medioPath}
                  data-testid={String(medioPath)}
                  {...register(medioPath, {
                    onChange: (event) => {
                      const nextValue = String(event.target.value);
                      setValue(medioPath, nextValue as never, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                      setValue(
                        recomendacionPath,
                        (nextValue === "No aplica"
                          ? "No aplica"
                          : getInduccionOrganizacionalRecommendationForMedium(nextValue)) as never,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        }
                      );
                    },
                  })}
                  value={row.medio}
                  className={cn(
                    INPUT_CLASS,
                    getFieldError(errors, medioPath) ? "border-red-400 bg-red-50" : "border-gray-200"
                  )}
                >
                  <option value="">Selecciona</option>
                  {INDUCCION_ORGANIZACIONAL_SECTION_4_MEDIO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>

              <RecommendationReadonlyField
                fieldName={recomendacionPath}
                label="Recomendacion"
                value={
                  row.medio === "No aplica"
                    ? "No aplica"
                    : row.recomendacion ||
                      getInduccionOrganizacionalRecommendationForMedium(row.medio)
                }
                errors={errors}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InduccionOrganizacionalObservacionesSection({
  register,
  errors,
  value,
  getValues,
  setValue,
  required = false,
}: {
  register: UseFormRegister<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
  value: string;
  getValues: UseFormGetValues<InduccionOrganizacionalValues>;
  setValue: UseFormSetValue<InduccionOrganizacionalValues>;
  required?: boolean;
}) {
  return (
    <LongTextField
      fieldId={"section_5.observaciones" as Path<InduccionOrganizacionalValues>}
      label="Observaciones"
      value={value}
      register={register}
      error={getFieldError(errors, "section_5.observaciones")}
      placeholder="Escribe observaciones amplias, acuerdos o hallazgos relevantes."
      minHeightClass="min-h-[12rem]"
      required={required}
      getValues={getValues}
      setValue={setValue}
      enableDictation
    />
  );
}
