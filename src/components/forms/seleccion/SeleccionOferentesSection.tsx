"use client";

import type {
  Control,
  FieldErrors,
  Path,
  UseFormRegister,
} from "react-hook-form";
import { RepeatedPeopleSection } from "@/components/forms/shared/RepeatedPeopleSection";
import { FormField } from "@/components/ui/FormField";
import { SELECCION_OFERENTES_CONFIG } from "@/lib/seleccion";
import {
  SELECCION_OFERENTE_FIELDS_BY_ID,
  type SeleccionOferenteFieldId,
  type SeleccionValues,
} from "@/lib/validations/seleccion";
import { cn } from "@/lib/utils";

type Props = {
  control: Control<SeleccionValues>;
  register: UseFormRegister<SeleccionValues>;
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
  "cedula",
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
  if (
    fieldId === "fecha_nacimiento" ||
    fieldId === "fecha_firma_contrato"
  ) {
    return "date";
  }

  if (fieldId.endsWith("_nota")) {
    return "textarea";
  }

  return SELECCION_OFERENTE_FIELDS_BY_ID[fieldId].kind === "lista"
    ? "select"
    : "text";
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

function getSelectOptions(fieldName: Exclude<SeleccionOferenteFieldId, "numero">) {
  const fieldMeta = SELECCION_OFERENTE_FIELDS_BY_ID[fieldName];
  return fieldMeta.kind === "lista" ? fieldMeta.options : [];
}

function OferenteField({
  index,
  field,
  register,
  errors,
}: {
  index: number;
  field: RowFieldConfig;
  register: UseFormRegister<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
}) {
  const fieldMeta = SELECCION_OFERENTE_FIELDS_BY_ID[field.name];
  const fieldPath = `oferentes.${index}.${field.name}` as Path<SeleccionValues>;
  const error = getRowFieldError(errors, index, field.name);
  const selectOptions =
    field.kind === "select" ? getSelectOptions(field.name) : [];
  const className = cn(
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm",
    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
    error ? "border-red-400 bg-red-50" : "border-gray-200"
  );

  return (
    <div className={cn("space-y-1", field.columnSpan === "full" && "sm:col-span-2")}>
      <FormField
        label={fieldMeta.label}
        htmlFor={String(fieldPath)}
        required
        error={error}
      >
        {field.kind === "select" ? (
          <select id={String(fieldPath)} {...register(fieldPath)} className={className}>
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
            rows={3}
            {...register(fieldPath)}
            className={cn(className, "min-h-[6.5rem]")}
          />
        ) : (
          <input
            id={String(fieldPath)}
            type={field.kind}
            {...register(fieldPath)}
            className={className}
          />
        )}
      </FormField>
    </div>
  );
}

export function SeleccionOferentesSection({
  control,
  register,
  errors,
}: Props) {
  return (
    <RepeatedPeopleSection
      control={control}
      errors={errors}
      name="oferentes"
      config={SELECCION_OFERENTES_CONFIG}
      title="Oferentes"
      helperText="Agrega uno o varios oferentes. El desarrollo de la actividad se diligencia una sola vez por formulario."
      renderRow={({ index, row }) => (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-dashed border-reca-200 bg-reca-50 px-3 py-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-reca">
                Consecutivo
              </p>
              <p className="text-sm font-semibold text-gray-900">
                Oferente {row.numero || String(index + 1)}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Numero generado automaticamente segun el orden actual.
            </p>
          </div>

          {FIELD_GROUPS.map((group) => (
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
                    errors={errors}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    />
  );
}
