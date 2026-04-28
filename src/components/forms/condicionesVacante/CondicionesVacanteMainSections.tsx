"use client";

import type {
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { ClipboardPaste, Plus } from "lucide-react";
import { LongTextField } from "@/components/forms/shared/LongTextField";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import {
  CONDICIONES_CAPABILITIES_CATEGORIES,
  CONDICIONES_EDUCATION_CHECKBOXES,
  CONDICIONES_EDUCATION_TEXTAREAS,
  CONDICIONES_EDUCATION_TEXT_FIELDS,
  CONDICIONES_POSTURES,
  CONDICIONES_RECOMMENDATIONS_TEMPLATE,
  CONDICIONES_RISK_CATEGORIES,
  CONDICIONES_VACANCY_TEXT_FIELDS,
} from "@/components/forms/condicionesVacante/config";
import {
  CONDICIONES_VACANTE_BREAK_DESCANSO_OPTIONS,
  CONDICIONES_VACANTE_EXPERIENCIA_MESES_OPTIONS,
  CONDICIONES_VACANTE_FRECUENCIA_OPTIONS,
  CONDICIONES_VACANTE_GENERO_OPTIONS,
  CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  CONDICIONES_VACANTE_HORARIOS_ASIGNADOS_OPTIONS,
  CONDICIONES_VACANTE_NIVEL_CARGO_OPTIONS,
  CONDICIONES_VACANTE_REQUIERE_CERTIFICADO_OPTIONS,
  CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  CONDICIONES_VACANTE_TIEMPO_ALMUERZO_OPTIONS,
  CONDICIONES_VACANTE_TIEMPO_OPTIONS,
  CONDICIONES_VACANTE_TIPO_CONTRATO_OPTIONS,
  type CondicionesVacanteValues,
} from "@/lib/validations/condicionesVacante";

const INPUT_CLASS =
  "w-full rounded-lg border px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";
const SELECT_CLASS =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";

const BULK_LEVEL_ACTIONS = [
  { label: "Todo bajo", value: "Bajo." },
  { label: "Todo medio", value: "Medio." },
  { label: "Todo alto", value: "Alto." },
  { label: "Todo no aplica", value: "No aplica" },
] as const;

function getFieldErrorMessage(
  errors: FieldErrors<CondicionesVacanteValues>,
  fieldId: keyof CondicionesVacanteValues
) {
  const error = errors[fieldId];
  return typeof error?.message === "string" ? error.message : undefined;
}

function applyBulkLevel(
  fieldIds: readonly (keyof CondicionesVacanteValues)[],
  value: string,
  setValue: UseFormSetValue<CondicionesVacanteValues>
) {
  fieldIds.forEach((fieldId) => {
    setValue(fieldId, value as never, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  });
}

function BulkLevelButtons({
  onApply,
}: {
  onApply: (value: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {BULK_LEVEL_ACTIONS.map((action) => (
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

function TextInputField({
  fieldId,
  label,
  placeholder,
  register,
  errors,
  readOnly = false,
}: {
  fieldId: keyof CondicionesVacanteValues;
  label: string;
  placeholder?: string;
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  readOnly?: boolean;
}) {
  const error = getFieldErrorMessage(errors, fieldId);

  return (
    <FormField label={label} htmlFor={fieldId} required error={error}>
      <input
        id={fieldId}
        type="text"
        {...register(fieldId)}
        readOnly={readOnly}
        aria-readonly={readOnly}
        placeholder={placeholder}
        className={cn(
          INPUT_CLASS,
          readOnly && "bg-gray-50 text-gray-600",
          error ? "border-red-400 bg-red-50" : "border-gray-200"
        )}
      />
    </FormField>
  );
}

function SelectField({
  fieldId,
  label,
  options,
  register,
  errors,
  placeholder = "Selecciona una opción",
}: {
  fieldId: keyof CondicionesVacanteValues;
  label: string;
  options: readonly string[];
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  placeholder?: string;
}) {
  const error = getFieldErrorMessage(errors, fieldId);

  return (
    <FormField label={label} htmlFor={fieldId} required error={error}>
      <select
        id={fieldId}
        {...register(fieldId)}
        className={cn(SELECT_CLASS, error ? "border-red-400" : "border-gray-200")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export function CondicionesVacanteVacancySection({
  register,
  errors,
  competencias,
}: {
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  competencias: CondicionesVacanteValues["competencias"];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CONDICIONES_VACANCY_TEXT_FIELDS.slice(0, 2).map((field) => (
          <TextInputField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            placeholder={field.placeholder}
            register={register}
            errors={errors}
          />
        ))}

        <SelectField
          fieldId="nivel_cargo"
          label="Nivel del cargo"
          options={CONDICIONES_VACANTE_NIVEL_CARGO_OPTIONS}
          register={register}
          errors={errors}
        />

        <SelectField
          fieldId="genero"
          label="Género"
          options={CONDICIONES_VACANTE_GENERO_OPTIONS}
          register={register}
          errors={errors}
        />

        {CONDICIONES_VACANCY_TEXT_FIELDS.slice(2, 10).map((field) => (
          <TextInputField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            placeholder={field.placeholder}
            register={register}
            errors={errors}
          />
        ))}

        <SelectField
          fieldId="tipo_contrato"
          label="Tipo de contrato"
          options={CONDICIONES_VACANTE_TIPO_CONTRATO_OPTIONS}
          register={register}
          errors={errors}
        />

        {CONDICIONES_VACANCY_TEXT_FIELDS.slice(10, 11).map((field) => (
          <TextInputField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            placeholder={field.placeholder}
            register={register}
            errors={errors}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Competencias derivadas del nivel del cargo
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Este panel se actualiza automáticamente cuando cambia el nivel del cargo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {competencias.map((competencia, index) => (
            <div
              key={`${competencia}-${index}`}
              className="rounded-xl border border-reca-100 bg-white px-3 py-3 text-sm text-gray-700 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-reca">
                Competencia {index + 1}
              </p>
              <p className="mt-1.5 font-medium">
                {competencia || "Sin derivación disponible"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CONDICIONES_VACANCY_TEXT_FIELDS.slice(11).map((field) => (
          <TextInputField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            placeholder={field.placeholder}
            register={register}
            errors={errors}
          />
        ))}

        <SelectField
          fieldId="requiere_certificado"
          label="¿Requiere certificado de discapacidad?"
          options={CONDICIONES_VACANTE_REQUIERE_CERTIFICADO_OPTIONS}
          register={register}
          errors={errors}
        />

        <div className="lg:col-span-2">
          <TextInputField
            fieldId="requiere_certificado_observaciones"
            label="Observaciones sobre el certificado"
            placeholder="Ej: requerido al momento de firma o en trámite"
            register={register}
            errors={errors}
          />
        </div>
      </div>
    </div>
  );
}

export function CondicionesVacanteEducationSection({
  register,
  errors,
  values,
  getValues,
  setValue,
}: {
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  values: CondicionesVacanteValues;
  getValues: UseFormGetValues<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-sm font-semibold text-gray-900">
          Nivel educativo requerido
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Marca uno o varios niveles según el perfil objetivo.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CONDICIONES_EDUCATION_CHECKBOXES.map((option) => {
            const error = getFieldErrorMessage(errors, option.id);

            return (
              <label
                key={option.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm transition-colors",
                  error ? "border-red-300 bg-red-50" : "border-gray-200"
                )}
              >
                <input
                  type="checkbox"
                  {...register(option.id)}
                  className="h-4 w-4 rounded border-gray-300 text-reca focus:ring-reca"
                />
                <span className="font-medium text-gray-700">{option.label}</span>
              </label>
            );
          })}
        </div>
        {typeof errors.nivel_primaria?.message === "string" ? (
          <p className="mt-3 text-xs text-red-600">
            {errors.nivel_primaria.message}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CONDICIONES_EDUCATION_TEXTAREAS.slice(0, 2).map((field) => (
          <LongTextField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            placeholder={field.placeholder}
            value={values[field.id]}
            register={register}
            error={getFieldErrorMessage(errors, field.id)}
            getValues={getValues}
            setValue={setValue}
            enableDictation
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <SelectField
          fieldId="horarios_asignados"
          label="Horarios asignados"
          options={CONDICIONES_VACANTE_HORARIOS_ASIGNADOS_OPTIONS}
          register={register}
          errors={errors}
        />

        {CONDICIONES_EDUCATION_TEXT_FIELDS.slice(0, 2).map((field) => (
          <TextInputField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            placeholder={field.placeholder}
            register={register}
            errors={errors}
          />
        ))}

        <SelectField
          fieldId="tiempo_almuerzo"
          label="Tiempo de almuerzo"
          options={CONDICIONES_VACANTE_TIEMPO_ALMUERZO_OPTIONS}
          register={register}
          errors={errors}
        />

        <SelectField
          fieldId="break_descanso"
          label="Break - descanso"
          options={CONDICIONES_VACANTE_BREAK_DESCANSO_OPTIONS}
          register={register}
          errors={errors}
        />

        {CONDICIONES_EDUCATION_TEXT_FIELDS.slice(2).map((field) => (
          <TextInputField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            placeholder={field.placeholder}
            register={register}
            errors={errors}
          />
        ))}

        <SelectField
          fieldId="experiencia_meses"
          label="Experiencia laboral - tiempo en meses"
          options={CONDICIONES_VACANTE_EXPERIENCIA_MESES_OPTIONS}
          register={register}
          errors={errors}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CONDICIONES_EDUCATION_TEXTAREAS.slice(2).map((field) => {
          const isReadOnly = "readOnly" in field && field.readOnly === true;
          const fieldHint =
            "helperText" in field && typeof field.helperText === "string"
              ? field.helperText
              : undefined;
          return (
            <LongTextField
              key={field.id}
              fieldId={field.id}
              label={field.label}
              placeholder={field.placeholder}
              value={values[field.id]}
              register={register}
              error={getFieldErrorMessage(errors, field.id)}
              getValues={getValues}
              setValue={setValue}
              enableDictation={!isReadOnly}
              readOnly={isReadOnly}
              hint={fieldHint}
              minHeightClass="min-h-[12rem]"
            />
          );
        })}
      </div>
    </div>
  );
}

export function CondicionesVacanteCapabilitiesSection({
  register,
  errors,
  values,
  getValues,
  setValue,
}: {
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  values: CondicionesVacanteValues;
  getValues: UseFormGetValues<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
}) {
  return (
    <div className="space-y-6">
      {CONDICIONES_CAPABILITIES_CATEGORIES.map((category) => (
        <div key={category.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-sm font-semibold text-gray-900">{category.title}</h3>
          <BulkLevelButtons
            onApply={(value) =>
              applyBulkLevel(
                category.items.map((item) => item.id),
                value,
                setValue
              )
            }
          />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {category.items.map((item) => (
              <SelectField
                key={item.id}
                fieldId={item.id}
                label={item.label}
                options={CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS}
                register={register}
                errors={errors}
              />
            ))}
          </div>

          <div className="mt-4">
            <LongTextField
              fieldId={category.observationsField}
              label="Observaciones"
              placeholder="Añade notas puntuales para este grupo de capacidades."
              value={values[category.observationsField]}
              register={register}
              error={getFieldErrorMessage(errors, category.observationsField)}
              getValues={getValues}
              setValue={setValue}
              enableDictation
              minHeightClass="min-h-[7rem]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CondicionesVacantePosturesSection({
  register,
  errors,
}: {
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
        <span>Postura / movimiento</span>
        <span>Tiempo</span>
        <span>Frecuencia</span>
      </div>

      <div className="divide-y divide-gray-100">
        {CONDICIONES_POSTURES.map((field) => (
          <div
            key={field.id}
            className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="text-sm font-medium text-gray-800">{field.label}</div>
            <SelectField
              fieldId={`${field.id}_tiempo` as keyof CondicionesVacanteValues}
              label="Tiempo"
              options={CONDICIONES_VACANTE_TIEMPO_OPTIONS}
              register={register}
              errors={errors}
            />
            <SelectField
              fieldId={`${field.id}_frecuencia` as keyof CondicionesVacanteValues}
              label="Frecuencia"
              options={CONDICIONES_VACANTE_FRECUENCIA_OPTIONS}
              register={register}
              errors={errors}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CondicionesVacanteRisksSection({
  register,
  errors,
  values,
  getValues,
  setValue,
}: {
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  values: CondicionesVacanteValues;
  getValues: UseFormGetValues<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
}) {
  return (
    <div className="space-y-6">
      {CONDICIONES_RISK_CATEGORIES.map((category) => (
        <div key={category.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-sm font-semibold text-gray-900">{category.title}</h3>
          <BulkLevelButtons
            onApply={(value) =>
              applyBulkLevel(
                category.items.map((item) => item.id),
                value,
                setValue
              )
            }
          />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {category.items.map((item) => (
              <SelectField
                key={item.id}
                fieldId={item.id}
                label={item.label}
                options={CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS}
                register={register}
                errors={errors}
              />
            ))}
          </div>
        </div>
      ))}

      <LongTextField
        fieldId="observaciones_peligros"
        label="Observaciones"
        placeholder="Registra hallazgos, alertas o restricciones relevantes del entorno."
        value={values.observaciones_peligros}
        register={register}
        error={getFieldErrorMessage(errors, "observaciones_peligros")}
        getValues={getValues}
        setValue={setValue}
        enableDictation
        minHeightClass="min-h-[10rem]"
      />
    </div>
  );
}

export function CondicionesVacanteRecommendationsSection({
  register,
  errors,
  recommendations,
  getValues,
  setValue,
}: {
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  recommendations: string;
  getValues: UseFormGetValues<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardPaste className="h-4 w-4 text-reca" />
          <h3 className="text-sm font-semibold text-gray-700">
            Insertar texto preestablecido
          </h3>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Usa el botón para añadir el template base del proceso de vacante.
        </p>

        <button
          type="button"
          onClick={() => {
            const current = getValues("observaciones_recomendaciones");
            setValue(
              "observaciones_recomendaciones",
              current
                ? `${current}\n\n${CONDICIONES_RECOMMENDATIONS_TEMPLATE.text}`
                : CONDICIONES_RECOMMENDATIONS_TEMPLATE.text,
              { shouldValidate: true }
            );
          }}
          className={cn(
            "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium leading-snug transition-colors",
            "border-reca-200 bg-reca-50 text-reca hover:border-reca hover:bg-reca-100"
          )}
        >
          <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {CONDICIONES_RECOMMENDATIONS_TEMPLATE.label}
        </button>
      </div>

      <LongTextField
        fieldId="observaciones_recomendaciones"
        label="Observaciones / recomendaciones"
        placeholder="Consolida recomendaciones, cierre del perfil y próximos pasos definidos con la empresa."
        value={recommendations}
        register={register}
        error={errors.observaciones_recomendaciones?.message}
        getValues={getValues}
        setValue={setValue}
        enableDictation
        enableClear
        showCharacterCount
        minHeightClass="min-h-[16rem]"
      />
    </div>
  );
}
