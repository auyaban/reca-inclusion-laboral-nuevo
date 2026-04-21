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
  EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION,
  isEvaluacionQuestionFieldOptional,
  type EvaluacionQuestionDescriptor,
  type EvaluacionQuestionFieldDescriptor,
  type EvaluacionQuestionFieldKey,
  type EvaluacionQuestionSectionId,
} from "@/lib/evaluacionSections";
import type {
  EvaluacionQuestionSectionValues,
  EvaluacionValues,
} from "@/lib/validations/evaluacion";

const SELECT_CLASS =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";

const QUESTION_GRID_CLASS_BY_KIND: Record<
  EvaluacionQuestionDescriptor["kind"],
  string
> = {
  accesible_con_observaciones: "grid-cols-1 gap-4 lg:grid-cols-2",
  lista: "grid-cols-1 gap-4 lg:grid-cols-2",
  lista_doble: "grid-cols-1 gap-4 lg:grid-cols-2",
  lista_triple: "grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3",
  lista_multiple: "grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3",
  texto: "grid-cols-1 gap-4",
};

type EvaluacionQuestionSectionsProps = {
  sectionId: EvaluacionQuestionSectionId;
  values: EvaluacionQuestionSectionValues;
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
  getValues: UseFormGetValues<EvaluacionValues>;
  setValue: UseFormSetValue<EvaluacionValues>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getValueAtPath(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((currentValue, segment) => {
    if (!isRecord(currentValue)) {
      return undefined;
    }

    return currentValue[segment];
  }, value);
}

function getFieldError(
  errors: FieldErrors<EvaluacionValues>,
  fieldName: Path<EvaluacionValues>
) {
  const candidate = getValueAtPath(errors, fieldName);
  if (!isRecord(candidate)) {
    return undefined;
  }

  return typeof candidate.message === "string" ? candidate.message : undefined;
}

function getQuestionFieldPath(
  sectionId: EvaluacionQuestionSectionId,
  questionId: string,
  fieldKey: EvaluacionQuestionFieldKey
) {
  return `${sectionId}.${questionId}.${fieldKey}` as Path<EvaluacionValues>;
}

function getQuestionFieldPlaceholder(field: EvaluacionQuestionFieldDescriptor) {
  if (field.options.length > 0) {
    return "Selecciona una opcion";
  }

  if (field.key === "observaciones") {
    return "Registra observaciones puntuales";
  }

  if (field.key === "detalle") {
    return "Agrega el detalle requerido";
  }

  return "Escribe tu respuesta";
}

function EvaluacionQuestionSelectField({
  fieldPath,
  field,
  required,
  register,
  errors,
}: {
  fieldPath: Path<EvaluacionValues>;
  field: EvaluacionQuestionFieldDescriptor;
  required: boolean;
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
}) {
  const error = getFieldError(errors, fieldPath);

  return (
    <FormField
      label={field.label}
      htmlFor={fieldPath}
      required={required}
      error={error}
    >
      <select
        id={fieldPath}
        data-testid={String(fieldPath)}
        {...register(fieldPath)}
        className={cn(SELECT_CLASS, error ? "border-red-400" : "border-gray-200")}
      >
        <option value="">{getQuestionFieldPlaceholder(field)}</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function EvaluacionQuestionTextField({
  fieldPath,
  field,
  value,
  required,
  register,
  errors,
  getValues,
  setValue,
}: {
  fieldPath: Path<EvaluacionValues>;
  field: EvaluacionQuestionFieldDescriptor;
  value: string;
  required: boolean;
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
  getValues: UseFormGetValues<EvaluacionValues>;
  setValue: UseFormSetValue<EvaluacionValues>;
}) {
  return (
    <LongTextField<EvaluacionValues>
      fieldId={fieldPath}
      label={field.label}
      value={value}
      required={required}
      register={register}
      error={getFieldError(errors, fieldPath)}
      placeholder={getQuestionFieldPlaceholder(field)}
      getValues={getValues}
      setValue={setValue}
      enableDictation={field.supportsDictation}
      minHeightClass="min-h-[6rem]"
    />
  );
}

function EvaluacionQuestionCard({
  question,
  questionIndex,
  sectionId,
  values,
  register,
  errors,
  getValues,
  setValue,
}: {
  question: EvaluacionQuestionDescriptor;
  questionIndex: number;
  sectionId: EvaluacionQuestionSectionId;
  values: EvaluacionQuestionSectionValues;
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
  getValues: UseFormGetValues<EvaluacionValues>;
  setValue: UseFormSetValue<EvaluacionValues>;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-reca">
          Pregunta {questionIndex + 1}
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-6 text-gray-900">
          {question.label}
        </h3>
      </div>

      <div className={cn("grid", QUESTION_GRID_CLASS_BY_KIND[question.kind])}>
        {question.fields.map((field) => {
          const fieldPath = getQuestionFieldPath(sectionId, question.id, field.key);
          const value = values[question.id]?.[field.key] ?? "";
          const required = !isEvaluacionQuestionFieldOptional(field.key);

          if (field.options.length > 0) {
            return (
              <EvaluacionQuestionSelectField
                key={fieldPath}
                fieldPath={fieldPath}
                field={field}
                required={required}
                register={register}
                errors={errors}
              />
            );
          }

          return (
            <EvaluacionQuestionTextField
              key={fieldPath}
              fieldPath={fieldPath}
              field={field}
              value={value}
              required={required}
              register={register}
              errors={errors}
              getValues={getValues}
              setValue={setValue}
            />
          );
        })}
      </div>
    </section>
  );
}

export function EvaluacionQuestionSection({
  sectionId,
  values,
  register,
  errors,
  getValues,
  setValue,
}: EvaluacionQuestionSectionsProps) {
  return (
    <div className="space-y-4">
      {EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION[sectionId].map(
        (question, questionIndex) => (
          <EvaluacionQuestionCard
            key={question.id}
            question={question}
            questionIndex={questionIndex}
            sectionId={sectionId}
            values={values}
            register={register}
            errors={errors}
            getValues={getValues}
            setValue={setValue}
          />
        )
      )}
    </div>
  );
}
