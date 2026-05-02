"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { SeguimientosDateField } from "@/components/forms/seguimientos/SeguimientosDateField";
import { LongTextField } from "@/components/forms/shared/LongTextField";
import { FormField } from "@/components/ui/FormField";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";
import type { SeguimientosBaseValues } from "@/lib/seguimientos";
import { SEGUIMIENTOS_BASE_WRITABLE_FIELDS } from "@/lib/seguimientosStages";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import { getSeguimientosBaseValidationFieldName } from "@/lib/seguimientosValidationNavigation";
import {
  seguimientosBaseStageSchema,
  type SeguimientosBaseStageValues,
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

type SharedFieldProps = {
  fieldId: Path<SeguimientosBaseStageValues>;
  label: string;
  register: ReturnType<typeof useForm<SeguimientosBaseStageValues>>["register"];
  error?: string;
  highlighted?: boolean;
  hint?: string;
};

function ReadonlyTextField({
  fieldId,
  label,
  register,
  error,
  highlighted = false,
  hint,
}: SharedFieldProps) {
  return (
    <FormField label={label} htmlFor={fieldId} error={error} hint={hint}>
      <input
        id={fieldId}
        type="text"
        readOnly
        {...register(fieldId)}
        className={getFieldClasses({
          hasError: Boolean(error),
          readOnly: true,
          highlighted,
        })}
      />
    </FormField>
  );
}

function EditableTextField({
  fieldId,
  label,
  register,
  error,
  highlighted = false,
  type = "text",
  placeholder,
  disabled = false,
  readOnly = false,
  hint,
}: SharedFieldProps & {
  type?: "text" | "email" | "tel";
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <FormField label={label} htmlFor={fieldId} error={error} hint={hint}>
      <input
        id={fieldId}
        type={type}
        placeholder={placeholder}
        aria-label={label || placeholder || undefined}
        disabled={disabled}
        readOnly={readOnly}
        {...register(fieldId)}
        className={getFieldClasses({
          hasError: Boolean(error),
          highlighted,
          readOnly: disabled || readOnly,
        })}
      />
    </FormField>
  );
}

function TimelineReadonlyField({
  fieldId,
  label,
  register,
  highlighted = false,
}: {
  fieldId: `seguimiento_fechas_1_3.${number}` | `seguimiento_fechas_4_6.${number}`;
  label: string;
  register: ReturnType<typeof useForm<SeguimientosBaseStageValues>>["register"];
  highlighted?: boolean;
}) {
  return (
    <FormField label={label} htmlFor={fieldId}>
      <input
        id={fieldId}
        type="text"
        readOnly
        {...register(fieldId)}
        className={getFieldClasses({
          hasError: false,
          readOnly: true,
          highlighted,
        })}
      />
    </FormField>
  );
}

type SeguimientosBaseStageEditorProps = {
  values: SeguimientosBaseValues;
  isReadonlyDraft: boolean;
  isProtectedByDefault: boolean;
  overrideActive: boolean;
  saving: boolean;
  lastSavedToSheetsAt: string | null;
  modifiedFieldIds: ReadonlySet<string>;
  isFirstEntry?: boolean;
  isProgressCompleted?: boolean;
  suggestedStageLabel?: string | null;
  onValuesChange: (values: SeguimientosBaseValues) => void;
  onSave: (values: SeguimientosBaseValues) => Promise<boolean>;
  onConfirmFirstEntry?: () => void;
};

export function SeguimientosBaseStageEditor({
  values,
  isReadonlyDraft,
  isProtectedByDefault,
  overrideActive,
  saving,
  lastSavedToSheetsAt,
  modifiedFieldIds,
  isFirstEntry = false,
  isProgressCompleted = false,
  suggestedStageLabel,
  onValuesChange,
  onSave,
  onConfirmFirstEntry,
}: SeguimientosBaseStageEditorProps) {
  const form = useForm<SeguimientosBaseStageValues>({
    resolver: zodResolver(seguimientosBaseStageSchema),
    defaultValues: values,
    mode: "onChange",
  });
  const incomingValuesSnapshot = useMemo(() => JSON.stringify(values), [values]);
  const watchedValues = useWatch({
    control: form.control,
    name: SEGUIMIENTOS_BASE_WRITABLE_FIELDS as readonly Path<SeguimientosBaseStageValues>[],
  });
  const apoyosAjustesValue =
    useWatch({
      control: form.control,
      name: "apoyos_ajustes",
    }) ?? "";
  const cargoVinculadoValue =
    useWatch({
      control: form.control,
      name: "cargo_vinculado",
    }) ?? values.cargo_vinculado;
  const discapacidadValue =
    useWatch({
      control: form.control,
      name: "discapacidad",
    }) ?? values.discapacidad;
  const watchedSnapshot = useMemo(() => JSON.stringify(watchedValues ?? []), [
    watchedValues,
  ]);
  const lastSentSnapshotRef = useRef(JSON.stringify(values));
  const lastResetValuesSnapshotRef = useRef(incomingValuesSnapshot);
  const normalFieldsDisabled =
    isReadonlyDraft || saving || (isProtectedByDefault && !overrideActive);
  const canEditCargoVinculado =
    !isReadonlyDraft &&
    !saving &&
    (overrideActive || !cargoVinculadoValue.trim());
  const canEditDiscapacidad =
    !isReadonlyDraft &&
    !saving &&
    (overrideActive || !discapacidadValue.trim());
  const canSave =
    !saving &&
    !isReadonlyDraft &&
    (!normalFieldsDisabled || canEditCargoVinculado || canEditDiscapacidad);
  const fallbackReadonlyHint =
    "Dato precargado desde RECA. Usa Desbloquear etapa si necesitas corregirlo.";

  useEffect(() => {
    if (lastSentSnapshotRef.current === watchedSnapshot) {
      return;
    }

    lastSentSnapshotRef.current = watchedSnapshot;
    onValuesChange(form.getValues());
  }, [form, onValuesChange, watchedSnapshot]);

  useEffect(() => {
    if (lastResetValuesSnapshotRef.current === incomingValuesSnapshot) {
      return;
    }

    lastResetValuesSnapshotRef.current = incomingValuesSnapshot;
    lastSentSnapshotRef.current = incomingValuesSnapshot;
    form.reset(values);
  }, [form, incomingValuesSnapshot, values]);

  const saveTimestampLabel = lastSavedToSheetsAt
    ? new Date(lastSavedToSheetsAt).toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;
  const handleInvalidSubmit = useCallback(
    (errors: FieldErrors<SeguimientosBaseStageValues>) => {
      const fieldName = getSeguimientosBaseValidationFieldName(
        errors,
        SEGUIMIENTOS_BASE_WRITABLE_FIELDS
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
    <form
      data-testid="seguimientos-base-editor"
      noValidate
      onSubmit={form.handleSubmit(
        async (submittedValues) => {
          await onSave(submittedValues);
        },
        handleInvalidSubmit
      )}
      className="space-y-5"
    >
      {modifiedFieldIds.size > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Estás modificando información distinta al último guardado en Google Sheets. Los campos cambiados se resaltan en amarillo.
        </div>
      ) : null}

      <StageBlock
        title="Contexto del caso"
        description="Snapshot operativo de la empresa y del profesional asignado. En esta fase solo se usa como referencia."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ReadonlyTextField
            fieldId="nombre_empresa"
            label="Empresa"
            register={form.register}
            error={form.formState.errors.nombre_empresa?.message}
          />
          <ReadonlyTextField
            fieldId="nit_empresa"
            label="NIT"
            register={form.register}
            error={form.formState.errors.nit_empresa?.message}
          />
          <ReadonlyTextField
            fieldId="ciudad_empresa"
            label="Ciudad"
            register={form.register}
            error={form.formState.errors.ciudad_empresa?.message}
          />
          <ReadonlyTextField
            fieldId="direccion_empresa"
            label="Direccion"
            register={form.register}
            error={form.formState.errors.direccion_empresa?.message}
          />
          <ReadonlyTextField
            fieldId="contacto_empresa"
            label="Contacto empresa"
            register={form.register}
            error={form.formState.errors.contacto_empresa?.message}
          />
          <ReadonlyTextField
            fieldId="cargo"
            label="Cargo del contacto"
            register={form.register}
            error={form.formState.errors.cargo?.message}
          />
          <ReadonlyTextField
            fieldId="asesor"
            label="Asesor"
            register={form.register}
            error={form.formState.errors.asesor?.message}
          />
          <ReadonlyTextField
            fieldId="profesional_asignado"
            label="Profesional asignado"
            register={form.register}
            error={form.formState.errors.profesional_asignado?.message}
          />
          <ReadonlyTextField
            fieldId="caja_compensacion"
            label="Caja de compensacion"
            register={form.register}
            error={form.formState.errors.caja_compensacion?.message}
          />
        </div>
      </StageBlock>

      <div className="space-y-5">
        <StageBlock
          title="Datos de la visita"
          description="Controla la fecha operativa de la ficha inicial y la modalidad de atencion."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SeguimientosDateField<SeguimientosBaseStageValues>
              control={form.control}
              fieldId="fecha_visita"
              label="Fecha de la visita"
              error={form.formState.errors.fecha_visita?.message}
              highlighted={modifiedFieldIds.has("fecha_visita")}
              disabled={normalFieldsDisabled}
            />

            <FormField
              label="Modalidad"
              htmlFor="modalidad"
              error={form.formState.errors.modalidad?.message}
            >
              <select
                id="modalidad"
                {...form.register("modalidad")}
                disabled={normalFieldsDisabled}
                className={getFieldClasses({
                  hasError: Boolean(form.formState.errors.modalidad),
                  highlighted: modifiedFieldIds.has("modalidad"),
                  readOnly: normalFieldsDisabled,
                })}
              >
                {MODALIDAD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </StageBlock>

        <StageBlock
          title="Datos del vinculado"
          description="Muestra el snapshot de la persona y permite ajustar solo la informacion operativa que la ficha inicial necesita."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ReadonlyTextField
              fieldId="nombre_vinculado"
              label="Nombre del vinculado"
              register={form.register}
              error={form.formState.errors.nombre_vinculado?.message}
            />
            <ReadonlyTextField
              fieldId="cedula"
              label="Cédula"
              register={form.register}
              error={form.formState.errors.cedula?.message}
            />
            {canEditCargoVinculado ? (
              <EditableTextField
                fieldId="cargo_vinculado"
                label="Cargo"
                register={form.register}
                error={form.formState.errors.cargo_vinculado?.message}
                highlighted={modifiedFieldIds.has("cargo_vinculado")}
              />
            ) : (
              <ReadonlyTextField
                fieldId="cargo_vinculado"
                label="Cargo"
                register={form.register}
                error={form.formState.errors.cargo_vinculado?.message}
                hint={
                  cargoVinculadoValue.trim() && !overrideActive
                    ? fallbackReadonlyHint
                    : undefined
                }
              />
            )}
            <ReadonlyTextField
              fieldId="telefono_vinculado"
              label="Telefono"
              register={form.register}
              error={form.formState.errors.telefono_vinculado?.message}
            />
            <ReadonlyTextField
              fieldId="correo_vinculado"
              label="Correo"
              register={form.register}
              error={form.formState.errors.correo_vinculado?.message}
            />
            {canEditDiscapacidad ? (
              <EditableTextField
                fieldId="discapacidad"
                label="Discapacidad"
                register={form.register}
                error={form.formState.errors.discapacidad?.message}
                highlighted={modifiedFieldIds.has("discapacidad")}
              />
            ) : (
              <ReadonlyTextField
                fieldId="discapacidad"
                label="Discapacidad"
                register={form.register}
                error={form.formState.errors.discapacidad?.message}
                hint={
                  discapacidadValue.trim() && !overrideActive
                    ? fallbackReadonlyHint
                    : undefined
                }
              />
            )}
            <EditableTextField
              fieldId="contacto_emergencia"
              label="Contacto de emergencia"
              register={form.register}
              error={form.formState.errors.contacto_emergencia?.message}
              highlighted={modifiedFieldIds.has("contacto_emergencia")}
              disabled={normalFieldsDisabled}
            />
            <EditableTextField
              fieldId="parentesco"
              label="Parentesco"
              register={form.register}
              error={form.formState.errors.parentesco?.message}
              highlighted={modifiedFieldIds.has("parentesco")}
              disabled={normalFieldsDisabled}
            />
            <EditableTextField
              fieldId="telefono_emergencia"
              label="Telefono de emergencia"
              type="tel"
              register={form.register}
              error={form.formState.errors.telefono_emergencia?.message}
              highlighted={modifiedFieldIds.has("telefono_emergencia")}
              disabled={normalFieldsDisabled}
            />
            <EditableTextField
              fieldId="certificado_discapacidad"
              label="Certificado de discapacidad"
              register={form.register}
              error={form.formState.errors.certificado_discapacidad?.message}
              highlighted={modifiedFieldIds.has("certificado_discapacidad")}
              disabled={normalFieldsDisabled}
            />
            <EditableTextField
              fieldId="certificado_porcentaje"
              label="Porcentaje certificado"
              register={form.register}
              error={form.formState.errors.certificado_porcentaje?.message}
              highlighted={modifiedFieldIds.has("certificado_porcentaje")}
              disabled={normalFieldsDisabled}
            />
            <EditableTextField
              fieldId="tipo_contrato"
              label="Tipo de contrato"
              register={form.register}
              error={form.formState.errors.tipo_contrato?.message}
              highlighted={modifiedFieldIds.has("tipo_contrato")}
              disabled={normalFieldsDisabled}
            />
            <SeguimientosDateField<SeguimientosBaseStageValues>
              control={form.control}
              fieldId="fecha_firma_contrato"
              label="Fecha firma contrato"
              error={form.formState.errors.fecha_firma_contrato?.message}
              highlighted={modifiedFieldIds.has("fecha_firma_contrato")}
              disabled={normalFieldsDisabled}
            />
            <SeguimientosDateField<SeguimientosBaseStageValues>
              control={form.control}
              fieldId="fecha_inicio_contrato"
              label="Fecha inicio contrato"
              error={form.formState.errors.fecha_inicio_contrato?.message}
              highlighted={modifiedFieldIds.has("fecha_inicio_contrato")}
              disabled={normalFieldsDisabled}
            />
            <SeguimientosDateField<SeguimientosBaseStageValues>
              control={form.control}
              fieldId="fecha_fin_contrato"
              label="Fecha fin contrato"
              error={form.formState.errors.fecha_fin_contrato?.message}
              highlighted={modifiedFieldIds.has("fecha_fin_contrato")}
              disabled={normalFieldsDisabled}
            />
          </div>
        </StageBlock>

        <StageBlock
          title="Funciones y apoyos"
          description="Registra ajustes razonables y la lista base de funciones que luego soporta los seguimientos."
        >
          <LongTextField<SeguimientosBaseStageValues>
            fieldId="apoyos_ajustes"
            label="Apoyos y ajustes razonables"
            value={apoyosAjustesValue}
            register={form.register}
            error={form.formState.errors.apoyos_ajustes?.message}
            placeholder="Describe los apoyos o ajustes pactados para el vinculado."
            required={false}
            minHeightClass="min-h-[8rem]"
            readOnly={normalFieldsDisabled}
            disabled={normalFieldsDisabled}
            textareaClassName={
              modifiedFieldIds.has("apoyos_ajustes")
                ? "border-amber-300 bg-amber-50"
                : undefined
            }
          />

          <h4 className="mt-2 text-sm font-semibold text-gray-900">
            Funciones del cargo (opcionales — agregar las que apliquen)
          </h4>
          <div className="grid gap-2 lg:grid-cols-2">
            <div className="space-y-1.5">
              {Array.from({ length: 5 }, (_, index) => (
                <EditableTextField
                  key={`funciones_1_5.${index}`}
                  fieldId={`funciones_1_5.${index}` as Path<SeguimientosBaseStageValues>}
                  label=""
                  placeholder={`Función ${index + 1} (opcional)`}
                  register={form.register}
                  error={form.formState.errors.funciones_1_5?.[index]?.message}
                  highlighted={modifiedFieldIds.has(`funciones_1_5.${index}`)}
                  disabled={normalFieldsDisabled}
                />
              ))}
            </div>

            <div className="space-y-1.5">
              {Array.from({ length: 5 }, (_, index) => (
                <EditableTextField
                  key={`funciones_6_10.${index}`}
                  fieldId={`funciones_6_10.${index}` as Path<SeguimientosBaseStageValues>}
                  label=""
                  placeholder={`Función ${index + 6} (opcional)`}
                  register={form.register}
                  error={form.formState.errors.funciones_6_10?.[index]?.message}
                  highlighted={modifiedFieldIds.has(`funciones_6_10.${index}`)}
                  disabled={normalFieldsDisabled}
                />
              ))}
            </div>
          </div>
        </StageBlock>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {isFirstEntry ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                Confirmacion de ficha inicial
              </p>
              <p className="text-sm text-gray-500">
                {isProgressCompleted
                  ? suggestedStageLabel
                    ? `Al guardar se habilitara ${suggestedStageLabel}.`
                    : "Al guardar se habilitara el siguiente seguimiento."
                  : "Completa la ficha inicial para continuar."}
              </p>
            </div>
            <button
              type="submit"
              data-testid="seguimientos-base-save-button"
              disabled={!canSave || !isProgressCompleted}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors",
                !canSave || !isProgressCompleted
                  ? "cursor-not-allowed bg-gray-400 opacity-60"
                  : "bg-reca hover:bg-reca-dark"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isProgressCompleted && suggestedStageLabel ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar ficha inicial y abrir {suggestedStageLabel}
                </>
              ) : (
                "Confirmar ficha inicial"
              )}
            </button>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                Guardar ficha inicial en Google Sheets
              </p>
              <p className="text-sm text-gray-500">
                Este boton escribe la ficha inicial en Google Sheets y luego sincroniza el snapshot del caso.
              </p>
              {saveTimestampLabel ? (
                <p className="text-xs font-medium text-gray-500">
                  Ultima escritura en Google Sheets: {saveTimestampLabel}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              data-testid="seguimientos-base-save-button"
              disabled={!canSave}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando ficha...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar ficha inicial en Google Sheets
                </>
              )}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
