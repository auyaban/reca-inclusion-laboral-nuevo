"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Control,
  FieldErrors,
  Path,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { RepeatedPeopleSection } from "@/components/forms/shared/RepeatedPeopleSection";
import { UsuarioRecaLookupField } from "@/components/forms/shared/UsuarioRecaLookupField";
import { FormField } from "@/components/ui/FormField";
import {
  getPrefixedDropdownUpdates,
  type PrefixedDropdownSyncRule,
} from "@/lib/prefixedDropdowns";
import { SELECCION_OFERENTES_CONFIG } from "@/lib/seleccion";
import {
  getSeleccionPrefixSyncRule,
  getSeleccionSelectOptions,
} from "@/lib/seleccionPrefixedDropdowns";
import {
  getSeleccionUsuariosRecaModifiedFieldIds,
  hasSeleccionUsuariosRecaReplaceTargetData,
  isSeleccionUsuariosRecaPrefillRowEmpty,
  mapUsuarioRecaToSeleccionPrefill,
  type UsuarioRecaRecord,
} from "@/lib/usuariosReca";
import {
  SELECCION_OFERENTE_FIELDS_BY_ID,
  type SeleccionOferenteFieldId,
  type SeleccionValues,
} from "@/lib/validations/seleccion";
import { cn } from "@/lib/utils";

type Props = {
  control: Control<SeleccionValues>;
  register: UseFormRegister<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
};

type FieldKind = "text" | "date" | "select" | "textarea";

type RowFieldConfig = {
  name: Exclude<SeleccionOferenteFieldId, "numero">;
  kind: FieldKind;
  columnSpan?: "full" | "half";
};

type FieldGroup = {
  title: string;
  description: string;
  fields: readonly RowFieldConfig[];
};

const PERSONAL_FIELDS = [
  "nombre_oferente",
  "certificado_porcentaje",
  "discapacidad",
  "telefono_oferente",
  "resultado_certificado",
  "cargo_oferente",
  "nombre_contacto_emergencia",
  "parentesco",
  "telefono_emergencia",
  "fecha_nacimiento",
  "edad",
  "pendiente_otros_oferentes",
  "lugar_firma_contrato",
  "fecha_firma_contrato",
  "cuenta_pension",
  "tipo_pension",
] as const satisfies readonly Exclude<SeleccionOferenteFieldId, "numero">[];

const MEDICAL_FIELDS = [
  "medicamentos_nivel_apoyo",
  "medicamentos_conocimiento",
  "medicamentos_horarios",
  "medicamentos_nota",
  "alergias_nivel_apoyo",
  "alergias_tipo",
  "alergias_nota",
  "restriccion_nivel_apoyo",
  "restriccion_conocimiento",
  "restriccion_nota",
  "controles_nivel_apoyo",
  "controles_asistencia",
  "controles_frecuencia",
  "controles_nota",
] as const satisfies readonly Exclude<SeleccionOferenteFieldId, "numero">[];

const DAILY_LIFE_FIELDS = [
  "desplazamiento_nivel_apoyo",
  "desplazamiento_modo",
  "desplazamiento_transporte",
  "desplazamiento_nota",
  "ubicacion_nivel_apoyo",
  "ubicacion_ciudad",
  "ubicacion_aplicaciones",
  "ubicacion_nota",
  "dinero_nivel_apoyo",
  "dinero_reconocimiento",
  "dinero_manejo",
  "dinero_medios",
  "dinero_nota",
  "presentacion_nivel_apoyo",
  "presentacion_personal",
  "presentacion_nota",
  "comunicacion_escrita_nivel_apoyo",
  "comunicacion_escrita_apoyo",
  "comunicacion_escrita_nota",
  "comunicacion_verbal_nivel_apoyo",
  "comunicacion_verbal_apoyo",
  "comunicacion_verbal_nota",
  "decisiones_nivel_apoyo",
  "toma_decisiones",
  "toma_decisiones_nota",
  "aseo_nivel_apoyo",
  "alimentacion",
  "aseo_criar_apoyo",
  "aseo_comunicacion_apoyo",
  "aseo_ayudas_apoyo",
  "aseo_alimentacion",
  "aseo_movilidad_funcional",
  "aseo_higiene_aseo",
  "aseo_nota",
  "instrumentales_nivel_apoyo",
  "instrumentales_actividades",
  "instrumentales_criar_apoyo",
  "instrumentales_comunicacion_apoyo",
  "instrumentales_movilidad_apoyo",
  "instrumentales_finanzas",
  "instrumentales_cocina_limpieza",
  "instrumentales_crear_hogar",
  "instrumentales_salud_cuenta_apoyo",
  "instrumentales_nota",
  "actividades_nivel_apoyo",
  "actividades_apoyo",
  "actividades_esparcimiento_apoyo",
  "actividades_esparcimiento_cuenta_apoyo",
  "actividades_complementarios_apoyo",
  "actividades_complementarios_cuenta_apoyo",
  "actividades_subsidios_cuenta_apoyo",
  "actividades_nota",
  "discriminacion_nivel_apoyo",
  "discriminacion",
  "discriminacion_violencia_apoyo",
  "discriminacion_violencia_cuenta_apoyo",
  "discriminacion_vulneracion_apoyo",
  "discriminacion_vulneracion_cuenta_apoyo",
  "discriminacion_nota",
] as const satisfies readonly Exclude<SeleccionOferenteFieldId, "numero">[];

const FIELD_GROUPS = [
  {
    title: "Datos del oferente",
    description:
      "Informacion basica del oferente, resultados del proceso y datos de contacto.",
    fields: PERSONAL_FIELDS.map((name) => ({
      name,
      kind: getFieldKind(name),
      columnSpan: getFieldKind(name) === "textarea" ? "full" : "half",
    })),
  },
  {
    title: "Condiciones medicas y de salud",
    description:
      "Conocimiento sobre medicamentos, alergias, restricciones y controles medicos.",
    fields: MEDICAL_FIELDS.map((name) => ({
      name,
      kind: getFieldKind(name),
      columnSpan: getFieldKind(name) === "textarea" ? "full" : "half",
    })),
  },
  {
    title: "Habilidades basicas de la vida diaria",
    description:
      "Desplazamiento, ubicacion, manejo del dinero, comunicacion, autocuidado y participacion.",
    fields: DAILY_LIFE_FIELDS.map((name) => ({
      name,
      kind: getFieldKind(name),
      columnSpan: getFieldKind(name) === "textarea" ? "full" : "half",
    })),
  },
] as const satisfies readonly FieldGroup[];

function getFieldKind(
  fieldId: Exclude<SeleccionOferenteFieldId, "numero">
): FieldKind {
  if (fieldId === "fecha_nacimiento" || fieldId === "fecha_firma_contrato") {
    return "date";
  }

  if (fieldId.endsWith("_nota")) {
    return "textarea";
  }

  return SELECCION_OFERENTE_FIELDS_BY_ID[fieldId].kind === "lista"
    ? "select"
    : "text";
}

function isOptionalSeleccionField(
  fieldId: Exclude<SeleccionOferenteFieldId, "numero">
) {
  return fieldId.endsWith("_nota");
}

function getRowFieldError(
  errors: FieldErrors<SeleccionValues>,
  index: number,
  fieldName: Exclude<SeleccionOferenteFieldId, "numero">
) {
  const rowErrors = errors.oferentes;
  if (!Array.isArray(rowErrors)) {
    return undefined;
  }

  const candidate = rowErrors[index];
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const fieldError = (candidate as Record<string, { message?: string }>)[fieldName];
  return fieldError?.message;
}

function OferenteField({
  index,
  field,
  register,
  setValue,
  errors,
  highlighted = false,
}: {
  index: number;
  field: RowFieldConfig;
  register: UseFormRegister<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
  highlighted?: boolean;
}) {
  const fieldMeta = SELECCION_OFERENTE_FIELDS_BY_ID[field.name];
  const fieldPath = `oferentes.${index}.${field.name}` as Path<SeleccionValues>;
  const error = getRowFieldError(errors, index, field.name);
  const selectOptions =
    field.kind === "select" ? getSeleccionSelectOptions(field.name) : [];
  const syncRule = getSeleccionPrefixSyncRule(field.name);
  const className = cn(
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm",
    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
    error
      ? "border-red-400 bg-red-50"
      : highlighted
        ? "border-amber-300 bg-amber-50"
        : "border-gray-200"
  );

  return (
    <div
      className={cn("space-y-1", field.columnSpan === "full" && "sm:col-span-2")}
    >
      <FormField
        label={fieldMeta.label}
        htmlFor={String(fieldPath)}
        required={!isOptionalSeleccionField(field.name)}
        error={error}
      >
        {field.kind === "select" ? (
          <select
            id={String(fieldPath)}
            data-testid={String(fieldPath)}
            {...register(fieldPath, {
              onChange: (event) => {
                if (!syncRule) {
                  return;
                }

                const updates = getPrefixedDropdownUpdates({
                  rule: syncRule as PrefixedDropdownSyncRule<
                    Exclude<SeleccionOferenteFieldId, "numero">
                  >,
                  changedFieldId: field.name,
                  changedValue: String(event.target.value ?? ""),
                  getOptions: (targetFieldId) =>
                    getSeleccionSelectOptions(targetFieldId),
                });

                Object.entries(updates).forEach(([targetFieldId, targetValue]) => {
                  setValue(
                    `oferentes.${index}.${targetFieldId}` as Path<SeleccionValues>,
                    targetValue,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    }
                  );
                });
              },
            })}
            className={className}
          >
            <option value="">Selecciona una opcion</option>
            {selectOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : field.kind === "textarea" ? (
          <textarea
            id={String(fieldPath)}
            data-testid={String(fieldPath)}
            rows={3}
            {...register(fieldPath)}
            className={cn(className, "min-h-[6.5rem]")}
          />
        ) : (
          <input
            id={String(fieldPath)}
            data-testid={String(fieldPath)}
            type={field.kind}
            {...register(fieldPath)}
            className={className}
          />
        )}
      </FormField>
    </div>
  );
}

function SeleccionOferenteRowContent({
  index,
  row,
  register,
  setValue,
  errors,
}: {
  index: number;
  row: SeleccionValues["oferentes"][number];
  register: UseFormRegister<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
}) {
  const [loadedSnapshot, setLoadedSnapshot] = useState<UsuarioRecaRecord | null>(
    null
  );
  const modifiedFieldIds = useMemo(
    () =>
      loadedSnapshot
        ? new Set(getSeleccionUsuariosRecaModifiedFieldIds(loadedSnapshot, row))
        : new Set<string>(),
    [loadedSnapshot, row]
  );
  const hasReplaceTargetData = hasSeleccionUsuariosRecaReplaceTargetData(row);
  const cedulaFieldPath = `oferentes.${index}.cedula` as Path<SeleccionValues>;

  useEffect(() => {
    if (loadedSnapshot && isSeleccionUsuariosRecaPrefillRowEmpty(row)) {
      setLoadedSnapshot(null);
    }
  }, [loadedSnapshot, row]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-dashed border-reca-200 bg-reca-50 px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-reca">
            Consecutivo
          </p>
          <p className="text-sm font-semibold text-gray-900">
            Oferente {String(index + 1)}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Numero generado automaticamente segun el orden actual.
        </p>
      </div>

      {loadedSnapshot ? (
        <div
          data-testid={`oferentes.${index}.snapshot-banner`}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Estas modificando datos cargados desde usuarios RECA. Los cambios se
          guardaran al finalizar.
        </div>
      ) : null}

      <section className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            Datos del oferente
          </h4>
          <p className="text-xs text-gray-500">
            Informacion basica del oferente, resultados del proceso y datos de
            contacto.
          </p>
        </div>

        <UsuarioRecaLookupField
          id={String(cedulaFieldPath)}
          dataTestIdBase={`oferentes.${index}`}
          value={row.cedula}
          error={getRowFieldError(errors, index, "cedula")}
          highlighted={modifiedFieldIds.has("cedula")}
          hasReplaceTargetData={hasReplaceTargetData}
          registration={register(cedulaFieldPath)}
          onSuggestionSelect={(cedula) => {
            setValue(cedulaFieldPath, cedula, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
          }}
          onLoadRecord={async (record) => {
            const prefill = mapUsuarioRecaToSeleccionPrefill(record);
            for (const [fieldName, fieldValue] of Object.entries(prefill)) {
              setValue(
                `oferentes.${index}.${fieldName}` as Path<SeleccionValues>,
                fieldValue,
                {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                }
              );
            }
            setLoadedSnapshot(record);
          }}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELD_GROUPS[0].fields.map((field) => (
            <OferenteField
              key={field.name}
              index={index}
              field={field}
              register={register}
              setValue={setValue}
              errors={errors}
              highlighted={modifiedFieldIds.has(field.name)}
            />
          ))}
        </div>
      </section>

      {FIELD_GROUPS.slice(1).map((group) => (
        <section
          key={group.title}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900">
              {group.title}
            </h4>
            <p className="text-xs text-gray-500">{group.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <OferenteField
                key={field.name}
                index={index}
                field={field}
                register={register}
                setValue={setValue}
                errors={errors}
                highlighted={modifiedFieldIds.has(field.name)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SeleccionOferentesSection({
  control,
  register,
  setValue,
  errors,
}: Props) {
  return (
    <RepeatedPeopleSection
      control={control}
      errors={errors}
      name="oferentes"
      config={SELECCION_OFERENTES_CONFIG}
      title="Oferentes"
      helperText="Agrega uno o varios oferentes. El desarrollo de la actividad se diligencia una sola vez por formulario, puedes cargar usuarios RECA por cedula y los dropdowns con prefijos 0-3 / No aplica se sincronizan como en legacy."
      renderRow={({ index, row }) => (
        <SeleccionOferenteRowContent
          index={index}
          row={row}
          register={register}
          setValue={setValue}
          errors={errors}
        />
      )}
    />
  );
}
