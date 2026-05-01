"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Loader2, Save, ShieldAlert } from "lucide-react";
import { SeguimientosDateField } from "@/components/forms/seguimientos/SeguimientosDateField";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import { LongTextField } from "@/components/forms/shared/LongTextField";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import { FormField } from "@/components/ui/FormField";
import { applyFailedVisitPreset } from "@/lib/failedVisitPreset";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";
import {
  SEGUIMIENTOS_EVAL_OPTIONS,
  SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT,
  SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT,
  SEGUIMIENTOS_MAX_ATTENDEES,
  SEGUIMIENTOS_TIPO_APOYO_OPTIONS,
  type SeguimientosFollowupIndex,
  type SeguimientosFollowupValues,
  normalizeSeguimientosFollowupValues,
} from "@/lib/seguimientos";
import { SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS } from "@/lib/seguimientosStages";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { getSeguimientosFollowupFailedVisitPreset } from "@/lib/seguimientosFailedVisitPreset";
import { copySeguimientosFollowupIntoEmptyFields } from "@/lib/seguimientosStageState";
import {
  getSeguimientosValueAtPath,
  setSeguimientosValueAtPath,
} from "@/lib/seguimientosPathAccess";
import { getSeguimientosFollowupValidationFieldName } from "@/lib/seguimientosValidationNavigation";
import {
  seguimientosFollowupStageSchema,
  type SeguimientosFollowupStageValues,
} from "@/lib/validations/seguimientos";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";

function getFieldClasses(options: {
  hasError: boolean;
  readOnly?: boolean;
  highlighted?: boolean;
}) {
  if (options.hasError) {
    return cn(
      INPUT_CLASS,
      "border-red-400 bg-red-50",
      options.readOnly ? "text-gray-700" : null
    );
  }

  if (options.highlighted) {
    return cn(
      INPUT_CLASS,
      "border-amber-300 bg-amber-50",
      options.readOnly ? "text-amber-900" : null
    );
  }

  return cn(
    INPUT_CLASS,
    "border-gray-200 bg-white",
    options.readOnly ? "bg-gray-50 text-gray-700" : null
  );
}

function StageBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

type BulkEvaluationGroup =
  | "item_autoevaluacion"
  | "item_eval_empresa"
  | "empresa_eval";

const BULK_EVALUATION_ACTIONS = [
  {
    label: "Todo excelente",
    value: "Excelente",
    slug: "excelente",
  },
  {
    label: "Todo bien",
    value: "Bien",
    slug: "bien",
  },
  {
    label: "Todo necesita mejorar",
    value: "Necesita mejorar",
    slug: "necesita-mejorar",
  },
  {
    label: "Todo mal",
    value: "Mal",
    slug: "mal",
  },
  {
    label: "Todo no aplica",
    value: "No aplica",
    slug: "no-aplica",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  value: (typeof SEGUIMIENTOS_EVAL_OPTIONS)[number];
  slug: string;
}>;

function BulkEvaluationActions({
  title,
  group,
  disabled,
  onApply,
}: {
  title: string;
  group: BulkEvaluationGroup;
  disabled: boolean;
  onApply: (
    group: BulkEvaluationGroup,
    value: (typeof SEGUIMIENTOS_EVAL_OPTIONS)[number]
  ) => void;
}) {
  return (
    <div
      data-testid={`seguimientos-followup-bulk-${group}`}
      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <div className="flex flex-wrap gap-2">
          {BULK_EVALUATION_ACTIONS.map((action) => (
            <button
              key={`${group}-${action.value}`}
              type="button"
              data-testid={`seguimientos-followup-bulk-${group}-${action.slug}`}
              disabled={disabled}
              onClick={() => onApply(group, action.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemCard({
  label,
  itemNumber,
  observacionValue,
  autoFieldId,
  empresaFieldId,
  observacionFieldId,
  register,
  errors,
  modifiedFieldIds,
}: {
  label: string;
  itemNumber: number;
  observacionValue: string;
  autoFieldId: Path<SeguimientosFollowupStageValues>;
  empresaFieldId: Path<SeguimientosFollowupStageValues>;
  observacionFieldId: Path<SeguimientosFollowupStageValues>;
  register: ReturnType<typeof useForm<SeguimientosFollowupStageValues>>["register"];
  errors: ReturnType<typeof useForm<SeguimientosFollowupStageValues>>["formState"]["errors"];
  modifiedFieldIds: ReadonlySet<string>;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-900">
        {label || `Item ${itemNumber}`}
      </p>
      <div className="mt-3 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            label="Autoevaluación"
            htmlFor={autoFieldId}
            error={errors.item_autoevaluacion?.[Number(autoFieldId.split(".").at(-1))]?.message}
          >
            <select
              id={autoFieldId}
              {...register(autoFieldId)}
              className={getFieldClasses({
                hasError: Boolean(
                  errors.item_autoevaluacion?.[Number(autoFieldId.split(".").at(-1))]
                ),
                highlighted: modifiedFieldIds.has(autoFieldId),
              })}
            >
              <option value="">Selecciona</option>
              {SEGUIMIENTOS_EVAL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Evaluación empresa"
            htmlFor={empresaFieldId}
            error={errors.item_eval_empresa?.[
              Number(empresaFieldId.split(".").at(-1))
            ]?.message}
          >
            <select
              id={empresaFieldId}
              {...register(empresaFieldId)}
              className={getFieldClasses({
                hasError: Boolean(
                  errors.item_eval_empresa?.[
                    Number(empresaFieldId.split(".").at(-1))
                  ]
                ),
                highlighted: modifiedFieldIds.has(empresaFieldId),
              })}
            >
              <option value="">Selecciona</option>
              {SEGUIMIENTOS_EVAL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <LongTextField<SeguimientosFollowupStageValues>
          fieldId={observacionFieldId}
          label="Observaciones"
          value={observacionValue}
          register={register}
          error={errors.item_observaciones?.[Number(observacionFieldId.split(".").at(-1))]?.message}
          minHeightClass="min-h-[6rem]"
          required={false}
          textareaClassName={
            modifiedFieldIds.has(observacionFieldId)
              ? "border-amber-300 bg-amber-50"
              : undefined
          }
        />
      </div>
    </div>
  );
}

type SeguimientosFollowupStageEditorProps = {
  followupIndex: SeguimientosFollowupIndex;
  values: SeguimientosFollowupValues;
  previousValues: SeguimientosFollowupValues | null;
  profesionalAsignado: string | null;
  failedVisitAppliedAt: string | null;
  isReadonly: boolean;
  saving: boolean;
  lastSavedToSheetsAt: string | null;
  modifiedFieldIds: ReadonlySet<string>;
  onValuesChange: (
    followupIndex: SeguimientosFollowupIndex,
    values: SeguimientosFollowupValues
  ) => void;
  onFailedVisitApplied: (
    followupIndex: SeguimientosFollowupIndex,
    values: SeguimientosFollowupValues
  ) => void;
  onAutoSeedFirstAsistente?: (
    followupIndex: SeguimientosFollowupIndex,
    values: {
      nombre: string;
      cargo: string;
    }
  ) => void;
  onFirstAsistenteManualEdit?: (
    followupIndex: SeguimientosFollowupIndex
  ) => void;
  onSave: (values: SeguimientosFollowupValues) => Promise<boolean>;
  onFinalizar?: (followupIndex: SeguimientosFollowupIndex) => void;
};

export function SeguimientosFollowupStageEditor({
  followupIndex,
  values,
  previousValues,
  profesionalAsignado,
  failedVisitAppliedAt,
  isReadonly,
  saving,
  lastSavedToSheetsAt,
  modifiedFieldIds,
  onValuesChange,
  onFailedVisitApplied,
  onAutoSeedFirstAsistente,
  onFirstAsistenteManualEdit,
  onSave,
  onFinalizar,
}: SeguimientosFollowupStageEditorProps) {
  const { profesionales } = useProfesionalesCatalog();
  const form = useForm<SeguimientosFollowupStageValues>({
    resolver: zodResolver(seguimientosFollowupStageSchema),
    defaultValues: values,
    mode: "onChange",
  });
  const watchedValues = useWatch({
    control: form.control,
    name:
      SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS as readonly Path<SeguimientosFollowupStageValues>[],
  });
  const situacionEncontradaValue =
    useWatch({
      control: form.control,
      name: "situacion_encontrada",
    }) ?? "";
  const estrategiasValue =
    useWatch({
      control: form.control,
      name: "estrategias_ajustes",
    }) ?? "";
  const itemObservaciones =
    useWatch({
      control: form.control,
      name: "item_observaciones",
    }) ?? values.item_observaciones;
  const empresaObservaciones =
    useWatch({
      control: form.control,
      name: "empresa_observacion",
    }) ?? values.empresa_observacion;
  const watchedSnapshot = useMemo(() => JSON.stringify(watchedValues ?? []), [
    watchedValues,
  ]);
  const lastSentSnapshotRef = useRef(JSON.stringify(values));
  const showCopyFromPrevious = followupIndex > 1;
  const [copyModalidad, setCopyModalidad] = useState(true);
  const [copyEvaluaciones, setCopyEvaluaciones] = useState(true);
  const [failedVisitConfirmOpen, setFailedVisitConfirmOpen] = useState(false);

  useEffect(() => {
    if (lastSentSnapshotRef.current === watchedSnapshot) {
      return;
    }

    lastSentSnapshotRef.current = watchedSnapshot;
    onValuesChange(
      followupIndex,
      normalizeSeguimientosFollowupValues(form.getValues(), followupIndex)
    );
  }, [followupIndex, form, onValuesChange, watchedSnapshot]);

  const saveTimestampLabel = lastSavedToSheetsAt
    ? new Date(lastSavedToSheetsAt).toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  function applyBulkEvaluation(
    group: BulkEvaluationGroup,
    value: (typeof SEGUIMIENTOS_EVAL_OPTIONS)[number]
  ) {
    const total =
      group === "empresa_eval"
        ? SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
        : SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT;

    for (let index = 0; index < total; index += 1) {
      form.setValue(
        `${group}.${index}` as Path<SeguimientosFollowupStageValues>,
        value,
        {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        }
      );
    }
  }

  function applyCopyFromPrevious() {
    if (!previousValues) {
      return;
    }

    // Build a filtered source: zero out unchecked group fields so the
    // motor's "into-empty-only" logic skips them.
    const filteredSource = structuredClone(previousValues) as unknown as Record<string, unknown>;

    if (!copyModalidad) {
      setSeguimientosValueAtPath(filteredSource, "modalidad", "");
      setSeguimientosValueAtPath(filteredSource, "tipo_apoyo", "");
    }

    if (!copyEvaluaciones) {
      for (let i = 0; i < SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT; i++) {
        for (const field of ["item_autoevaluacion", "item_eval_empresa"] as const) {
          setSeguimientosValueAtPath(filteredSource, `${field}.${i}`, "");
        }
      }
      for (let i = 0; i < SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT; i++) {
        setSeguimientosValueAtPath(filteredSource, `empresa_eval.${i}`, "");
      }
    }

    form.reset(
      copySeguimientosFollowupIntoEmptyFields({
        sourceValues: filteredSource as unknown as SeguimientosFollowupValues,
        targetValues: form.getValues(),
        sourceIndex: (followupIndex - 1) as SeguimientosFollowupIndex,
        targetIndex: followupIndex,
      })
    );
  }

  function applyFailedVisit() {
    const nextValues = normalizeSeguimientosFollowupValues(
      applyFailedVisitPreset(
        form.getValues(),
        getSeguimientosFollowupFailedVisitPreset(followupIndex)
      ),
      followupIndex
    );
    lastSentSnapshotRef.current = JSON.stringify(nextValues);
    form.reset(nextValues);
    onFailedVisitApplied(followupIndex, nextValues);
    setFailedVisitConfirmOpen(false);
  }

  const handleInvalidSubmit = useCallback(
    (errors: FieldErrors<SeguimientosFollowupStageValues>) => {
      const fieldName = getSeguimientosFollowupValidationFieldName(
        errors,
        SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS
      );

      if (!fieldName) {
        return;
      }

      focusFieldByNameAfterPaint(
        fieldName,
        { scroll: true, behavior: "smooth", block: "center" },
        4
      );
    },
    []
  );

  return (
    <>
      <form
        data-testid={`seguimientos-followup-editor-${followupIndex}`}
        noValidate
        onSubmit={form.handleSubmit(
          async (submittedValues) => {
            const result = await onSave(
              normalizeSeguimientosFollowupValues(
                submittedValues,
                followupIndex
              )
            );
            if (result) {
              onFinalizar?.(followupIndex);
            }
          },
          handleInvalidSubmit
        )}
        className="space-y-5"
      >
        {modifiedFieldIds.size > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Estas modificando informacion distinta al ultimo guardado en Google Sheets. Los campos cambiados se resaltan en amarillo.
          </div>
        ) : null}

        {failedVisitAppliedAt ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Este seguimiento fue marcado como visita fallida. Si vuelves a corregirlo despues de guardarlo, puede requerir desbloqueo.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {showCopyFromPrevious ? (
            <div className="flex w-full flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Prellenado desde Seguimiento {followupIndex - 1}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  data-testid="seguimientos-copy-group-modalidad"
                  className="inline-flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={copyModalidad}
                    onChange={(e) => setCopyModalidad(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Modalidad y tipo de apoyo
                </label>
                <label
                  data-testid="seguimientos-copy-group-evaluaciones"
                  className="inline-flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={copyEvaluaciones}
                    onChange={(e) => setCopyEvaluaciones(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Evaluaciones (autoeval / empresa)
                </label>
                <button
                  type="button"
                  data-testid="seguimientos-apply-copy-forward"
                  disabled={isReadonly || saving || !previousValues}
                  onClick={applyCopyFromPrevious}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-4 w-4" />
                  Aplicar prellenado
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            data-testid="seguimientos-followup-failed-visit-button"
            disabled={isReadonly || saving}
            onClick={() => setFailedVisitConfirmOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldAlert className="h-4 w-4" />
            Marcar visita fallida
          </button>
        </div>

        <fieldset disabled={isReadonly || saving} className="space-y-5">
          <StageBlock
            title="Datos de visita"
            description="Controla la modalidad, la fecha operativa del seguimiento y el tipo de apoyo observado."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                label="Modalidad"
                htmlFor="modalidad"
                error={form.formState.errors.modalidad?.message}
              >
                <select
                  id="modalidad"
                  {...form.register("modalidad")}
                  className={getFieldClasses({
                    hasError: Boolean(form.formState.errors.modalidad),
                    highlighted: modifiedFieldIds.has("modalidad"),
                  })}
                >
                  <option value="">Selecciona</option>
                  {MODALIDAD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>

              <SeguimientosDateField<SeguimientosFollowupStageValues>
                control={form.control}
                fieldId="fecha_seguimiento"
                label="Fecha del seguimiento"
                error={form.formState.errors.fecha_seguimiento?.message}
                highlighted={modifiedFieldIds.has("fecha_seguimiento")}
                disabled={isReadonly || saving}
                readOnly={isReadonly || saving}
              />

              <FormField
                label="Tipo de apoyo"
                htmlFor="tipo_apoyo"
                error={form.formState.errors.tipo_apoyo?.message}
              >
                <select
                  id="tipo_apoyo"
                  {...form.register("tipo_apoyo")}
                  className={getFieldClasses({
                    hasError: Boolean(form.formState.errors.tipo_apoyo),
                    highlighted: modifiedFieldIds.has("tipo_apoyo"),
                  })}
                >
                  <option value="">Selecciona</option>
                  {SEGUIMIENTOS_TIPO_APOYO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </StageBlock>

          <StageBlock
            title="Bloque funcional del vinculado"
            description="Registra observaciones del puesto y las evaluaciones del vinculado y de la empresa."
          >
            <div className="space-y-3">
              <BulkEvaluationActions
                title="Autoevaluación"
                group="item_autoevaluacion"
                disabled={isReadonly || saving}
                onApply={applyBulkEvaluation}
              />
              <BulkEvaluationActions
                title="Evaluación empresa"
                group="item_eval_empresa"
                disabled={isReadonly || saving}
                onApply={applyBulkEvaluation}
              />
              {Array.from({ length: SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT }, (_, index) => (
                <ItemCard
                  key={`item-${index}`}
                  label={values.item_labels[index] ?? ""}
                  itemNumber={index + 1}
                  observacionValue={itemObservaciones[index] ?? ""}
                  autoFieldId={`item_autoevaluacion.${index}` as Path<SeguimientosFollowupStageValues>}
                  empresaFieldId={`item_eval_empresa.${index}` as Path<SeguimientosFollowupStageValues>}
                  observacionFieldId={`item_observaciones.${index}` as Path<SeguimientosFollowupStageValues>}
                  register={form.register}
                  errors={form.formState.errors}
                  modifiedFieldIds={modifiedFieldIds}
                />
              ))}
            </div>
          </StageBlock>

          <StageBlock
            title="Bloque empresa"
            description="Consolida la percepción de la empresa para cada punto del seguimiento."
          >
            <div className="space-y-3">
              <BulkEvaluationActions
                title="Evaluación empresarial"
                group="empresa_eval"
                disabled={isReadonly || saving}
                onApply={applyBulkEvaluation}
              />
              {Array.from({ length: SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT }, (_, index) => (
                <div
                  key={`empresa-item-${index}`}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {values.empresa_item_labels[index] ?? "Item empresa"}
                  </p>
                  <div className="mt-3 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <FormField
                      label="Evaluacion empresa"
                      htmlFor={`empresa_eval.${index}`}
                      error={form.formState.errors.empresa_eval?.[index]?.message}
                    >
                      <select
                        id={`empresa_eval.${index}`}
                        {...form.register(
                          `empresa_eval.${index}` as Path<SeguimientosFollowupStageValues>
                        )}
                        className={getFieldClasses({
                          hasError: Boolean(form.formState.errors.empresa_eval?.[index]),
                          highlighted: modifiedFieldIds.has(`empresa_eval.${index}`),
                        })}
                      >
                        <option value="">Selecciona</option>
                        {SEGUIMIENTOS_EVAL_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <LongTextField<SeguimientosFollowupStageValues>
                      fieldId={`empresa_observacion.${index}` as Path<SeguimientosFollowupStageValues>}
                      label="Observacion empresa"
                      value={empresaObservaciones[index] ?? ""}
                      register={form.register}
                      error={form.formState.errors.empresa_observacion?.[index]?.message}
                      required={false}
                      minHeightClass="min-h-[6rem]"
                      textareaClassName={
                        modifiedFieldIds.has(`empresa_observacion.${index}`)
                          ? "border-amber-300 bg-amber-50"
                          : undefined
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </StageBlock>

          <StageBlock
            title="Cierre"
            description="Resume la situación encontrada y las estrategias o ajustes definidos para la continuidad del caso."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <LongTextField<SeguimientosFollowupStageValues>
                fieldId="situacion_encontrada"
                label="Situación encontrada"
                value={situacionEncontradaValue}
                register={form.register}
                error={form.formState.errors.situacion_encontrada?.message}
                required={false}
                minHeightClass="min-h-[8rem]"
                getValues={form.getValues}
                setValue={form.setValue}
                enableDictation
                showCharacterCount
                disabled={isReadonly || saving}
                readOnly={isReadonly || saving}
                textareaClassName={
                  modifiedFieldIds.has("situacion_encontrada")
                    ? "border-amber-300 bg-amber-50"
                    : undefined
                }
              />

              <LongTextField<SeguimientosFollowupStageValues>
                fieldId="estrategias_ajustes"
                label="Estrategias y ajustes"
                value={estrategiasValue}
                register={form.register}
                error={form.formState.errors.estrategias_ajustes?.message}
                required={false}
                minHeightClass="min-h-[8rem]"
                getValues={form.getValues}
                setValue={form.setValue}
                enableDictation
                showCharacterCount
                disabled={isReadonly || saving}
                readOnly={isReadonly || saving}
                textareaClassName={
                  modifiedFieldIds.has("estrategias_ajustes")
                    ? "border-amber-300 bg-amber-50"
                    : undefined
                }
              />
            </div>
          </StageBlock>

          <AsistentesSection<SeguimientosFollowupStageValues>
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            errors={form.formState.errors}
            profesionales={profesionales}
            mode="reca_plus_generic_attendees"
            profesionalAsignado={profesionalAsignado}
            summaryText={`Mínimo 1 persona · Máximo ${SEGUIMIENTOS_MAX_ATTENDEES}`}
            helperText="Fila 0 profesional RECA. Agrega asistentes adicionales solo cuando corresponda."
            modifiedFieldIds={modifiedFieldIds}
            readOnly={isReadonly || saving}
            onAutoSeedFirstRow={(seededValues) => {
              onAutoSeedFirstAsistente?.(followupIndex, seededValues);
            }}
            onFirstRowManualEdit={() => {
              onFirstAsistenteManualEdit?.(followupIndex);
            }}
          />
        </fieldset>

        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                Finalizar Seguimiento {followupIndex}
              </p>
              <p className="text-sm text-gray-500">
                Guarda este seguimiento en Google Sheets y sincroniza el snapshot del caso.
              </p>
              {saveTimestampLabel ? (
                <p className="text-xs font-medium text-gray-500">
                  Ultima escritura en Google Sheets: {saveTimestampLabel}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              data-testid="seguimientos-followup-save-button"
              disabled={isReadonly || saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Finalizar Seguimiento {followupIndex}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <FormSubmitConfirmDialog
        open={failedVisitConfirmOpen}
        title="Marcar visita fallida"
        description="Estas marcando este seguimiento como visita fallida. Las evaluaciones funcionales quedaran en 'No aplica' y luego podrás ajustar manualmente cualquier dato adicional. Si vuelves a corregirlo despues de guardarlo, puede requerir desbloqueo."
        confirmLabel="Marcar como fallida"
        onCancel={() => setFailedVisitConfirmOpen(false)}
        onConfirm={applyFailedVisit}
      />
    </>
  );
}
