"use client";

import type {
  Control,
  FieldErrors,
  Path,
  UseFormRegister,
} from "react-hook-form";
import { RepeatedPeopleSection } from "@/components/forms/shared/RepeatedPeopleSection";
import { FormField } from "@/components/ui/FormField";
import { CONTRATACION_VINCULADOS_CONFIG } from "@/lib/contratacion";
import {
  CONTRATACION_CAUSALES_OPTIONS,
  CONTRATACION_CERTIFICADO_DISCAPACIDAD_OPTIONS,
  CONTRATACION_CLAUSULAS_OPTIONS,
  CONTRATACION_COMPRENDE_CONTRATO_OPTIONS,
  CONTRATACION_CONDICIONES_SALARIALES_OPTIONS,
  CONTRATACION_CONDUCTO_REGULAR_OPTIONS,
  CONTRATACION_DESCARGOS_OPTIONS,
  CONTRATACION_DISCAPACIDAD_OPTIONS,
  CONTRATACION_FORMA_PAGO_OPTIONS,
  CONTRATACION_FRECUENCIA_PAGO_OPTIONS,
  CONTRATACION_GENERO_OPTIONS,
  CONTRATACION_GRUPO_ETNICO_CUAL_OPTIONS,
  CONTRATACION_GRUPO_ETNICO_OPTIONS,
  CONTRATACION_JORNADA_OPTIONS,
  CONTRATACION_LECTURA_CONTRATO_OPTIONS,
  CONTRATACION_LGTBIQ_OPTIONS,
  CONTRATACION_NIVEL_APOYO_OPTIONS,
  CONTRATACION_PERMISOS_OPTIONS,
  CONTRATACION_PRESTACIONES_OPTIONS,
  CONTRATACION_RUTAS_OPTIONS,
  CONTRATACION_TIPO_CONTRATO_FIRMADO_OPTIONS,
  CONTRATACION_TIPO_CONTRATO_OBSERVACION_OPTIONS,
  CONTRATACION_TIPO_CONTRATO_OPTIONS,
  CONTRATACION_TRAMITES_OPTIONS,
  type ContratacionValues,
  type ContratacionVinculadoFieldId,
} from "@/lib/validations/contratacion";
import { cn } from "@/lib/utils";

type Props = {
  control: Control<ContratacionValues>;
  register: UseFormRegister<ContratacionValues>;
  errors: FieldErrors<ContratacionValues>;
};

type FieldKind = "text" | "date" | "select" | "textarea";

type RowFieldConfig = {
  name: Exclude<ContratacionVinculadoFieldId, "numero">;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: readonly string[];
  columnSpan?: "full" | "half";
};

type FieldGroup = {
  title: string;
  description: string;
  fields: readonly RowFieldConfig[];
};

const PERSONAL_FIELDS = [
  { name: "nombre_oferente", label: "Nombre del vinculado", kind: "text", placeholder: "Nombre completo" },
  { name: "cedula", label: "Cédula", kind: "text", placeholder: "Documento de identidad" },
  { name: "certificado_porcentaje", label: "Certificado porcentaje", kind: "text", placeholder: "Ej: 45%" },
  { name: "discapacidad", label: "Discapacidad", kind: "select", options: CONTRATACION_DISCAPACIDAD_OPTIONS },
  { name: "telefono_oferente", label: "Teléfono del vinculado", kind: "text", placeholder: "Número de contacto" },
  { name: "genero", label: "Género", kind: "select", options: CONTRATACION_GENERO_OPTIONS },
  { name: "correo_oferente", label: "Correo del vinculado", kind: "text", placeholder: "correo@empresa.com" },
  { name: "fecha_nacimiento", label: "Fecha de nacimiento", kind: "date" },
  { name: "edad", label: "Edad", kind: "text", placeholder: "Edad actual" },
  { name: "lgtbiq", label: "Pertenece a comunidad LGTBIQ+", kind: "select", options: CONTRATACION_LGTBIQ_OPTIONS },
  { name: "grupo_etnico", label: "Grupo étnico", kind: "select", options: CONTRATACION_GRUPO_ETNICO_OPTIONS },
  { name: "grupo_etnico_cual", label: "Grupo étnico - cuál", kind: "select", options: CONTRATACION_GRUPO_ETNICO_CUAL_OPTIONS },
  { name: "cargo_oferente", label: "Cargo del vinculado", kind: "text", placeholder: "Cargo o rol" },
  { name: "contacto_emergencia", label: "Contacto de emergencia", kind: "text", placeholder: "Nombre del contacto" },
  { name: "parentesco", label: "Parentesco", kind: "text", placeholder: "Relación con el vinculado" },
  { name: "telefono_emergencia", label: "Teléfono de emergencia", kind: "text", placeholder: "Número de contacto" },
  { name: "certificado_discapacidad", label: "Cuenta con certificado de discapacidad", kind: "select", options: CONTRATACION_CERTIFICADO_DISCAPACIDAD_OPTIONS },
  { name: "lugar_firma_contrato", label: "Lugar firma de contrato", kind: "text", placeholder: "Lugar de firma" },
  { name: "fecha_firma_contrato", label: "Fecha firma de contrato", kind: "date" },
  { name: "tipo_contrato", label: "Tipo de contrato firmado", kind: "select", options: CONTRATACION_TIPO_CONTRATO_FIRMADO_OPTIONS },
  { name: "fecha_fin", label: "Fecha fin contrato", kind: "date" },
] as const satisfies readonly RowFieldConfig[];

const SUPPORT_GROUPS = [
  {
    title: "Lectura del contrato",
    description: "Acompañamiento para lectura y comprensión inicial del contrato.",
    fields: [
      { name: "contrato_lee_nivel_apoyo", label: "Nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "contrato_lee_observacion", label: "Observación", kind: "select", options: CONTRATACION_LECTURA_CONTRATO_OPTIONS },
      { name: "contrato_lee_nota", label: "Nota", kind: "textarea", placeholder: "Detalle del acompañamiento", columnSpan: "full" },
    ],
  },
  {
    title: "Comprensión del contrato",
    description: "Nivel de apoyo y observaciones sobre la comprensión del contrato.",
    fields: [
      { name: "contrato_comprendido_nivel_apoyo", label: "Nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "contrato_comprendido_observacion", label: "Observación", kind: "select", options: CONTRATACION_COMPRENDE_CONTRATO_OPTIONS },
      { name: "contrato_comprendido_nota", label: "Nota", kind: "textarea", placeholder: "Hallazgos o aclaraciones", columnSpan: "full" },
    ],
  },
  {
    title: "Tipo de contrato",
    description: "Claridad sobre el tipo de contrato, jornada y clausulas.",
    fields: [
      { name: "contrato_tipo_nivel_apoyo", label: "Nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "contrato_tipo_observacion", label: "Observación", kind: "select", options: CONTRATACION_TIPO_CONTRATO_OBSERVACION_OPTIONS },
      { name: "contrato_tipo_contrato", label: "Tipo de contrato valor", kind: "select", options: CONTRATACION_TIPO_CONTRATO_OPTIONS },
      { name: "contrato_jornada", label: "Jornada laboral", kind: "select", options: CONTRATACION_JORNADA_OPTIONS },
      { name: "contrato_clausulas", label: "Cláusulas del contrato", kind: "select", options: CONTRATACION_CLAUSULAS_OPTIONS },
      { name: "contrato_tipo_nota", label: "Nota", kind: "textarea", placeholder: "Detalle adicional", columnSpan: "full" },
    ],
  },
  {
    title: "Condiciones salariales",
    description: "Frecuencia, forma de pago y soporte requerido para comprenderlas.",
    fields: [
      { name: "condiciones_salariales_nivel_apoyo", label: "Nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "condiciones_salariales_observacion", label: "Observación", kind: "select", options: CONTRATACION_CONDICIONES_SALARIALES_OPTIONS },
      { name: "condiciones_salariales_frecuencia_pago", label: "Frecuencia de pago", kind: "select", options: CONTRATACION_FRECUENCIA_PAGO_OPTIONS },
      { name: "condiciones_salariales_forma_pago", label: "Forma de pago", kind: "select", options: CONTRATACION_FORMA_PAGO_OPTIONS },
      { name: "condiciones_salariales_nota", label: "Nota", kind: "textarea", placeholder: "Aclaraciones salariales", columnSpan: "full" },
    ],
  },
  {
    title: "Prestaciones de ley",
    description: "Seguimiento a prestaciones y beneficios asociados al cargo.",
    fields: [
      { name: "prestaciones_cesantias_nivel_apoyo", label: "Cesantias nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "prestaciones_cesantias_observacion", label: "Cesantías observación", kind: "select", options: CONTRATACION_PRESTACIONES_OPTIONS },
      { name: "prestaciones_cesantias_nota", label: "Cesantías nota", kind: "textarea", placeholder: "Detalle de cesantías", columnSpan: "full" },
      { name: "prestaciones_auxilio_transporte_nivel_apoyo", label: "Auxilio transporte nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "prestaciones_auxilio_transporte_observacion", label: "Auxilio transporte observación", kind: "select", options: CONTRATACION_PRESTACIONES_OPTIONS },
      { name: "prestaciones_auxilio_transporte_nota", label: "Auxilio transporte nota", kind: "textarea", placeholder: "Detalle de auxilio de transporte", columnSpan: "full" },
      { name: "prestaciones_prima_nivel_apoyo", label: "Prima nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "prestaciones_prima_observacion", label: "Prima observación", kind: "select", options: CONTRATACION_PRESTACIONES_OPTIONS },
      { name: "prestaciones_prima_nota", label: "Prima nota", kind: "textarea", placeholder: "Detalle de prima", columnSpan: "full" },
      { name: "prestaciones_seguridad_social_nivel_apoyo", label: "Seguridad social nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "prestaciones_seguridad_social_observacion", label: "Seguridad social observación", kind: "select", options: CONTRATACION_PRESTACIONES_OPTIONS },
      { name: "prestaciones_seguridad_social_nota", label: "Seguridad social nota", kind: "textarea", placeholder: "Detalle de seguridad social", columnSpan: "full" },
      { name: "prestaciones_vacaciones_nivel_apoyo", label: "Vacaciones nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "prestaciones_vacaciones_observacion", label: "Vacaciones observación", kind: "select", options: CONTRATACION_PRESTACIONES_OPTIONS },
      { name: "prestaciones_vacaciones_nota", label: "Vacaciones nota", kind: "textarea", placeholder: "Detalle de vacaciones", columnSpan: "full" },
      { name: "prestaciones_auxilios_beneficios_nivel_apoyo", label: "Beneficios nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "prestaciones_auxilios_beneficios_observacion", label: "Beneficios observación", kind: "select", options: CONTRATACION_PRESTACIONES_OPTIONS },
      { name: "prestaciones_auxilios_beneficios_nota", label: "Beneficios nota", kind: "textarea", placeholder: "Detalle de beneficios", columnSpan: "full" },
    ],
  },
  {
    title: "Conducto regular y deberes",
    description: "Conocimiento del conducto regular, trámites y permisos.",
    fields: [
      { name: "conducto_regular_nivel_apoyo", label: "Conducto regular nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "conducto_regular_observacion", label: "Conducto regular observación", kind: "select", options: CONTRATACION_CONDUCTO_REGULAR_OPTIONS },
      { name: "descargos_observacion", label: "Diligencia de descargos", kind: "select", options: CONTRATACION_DESCARGOS_OPTIONS },
      { name: "tramites_observacion", label: "Trámites administrativos", kind: "select", options: CONTRATACION_TRAMITES_OPTIONS },
      { name: "permisos_observacion", label: "Solicitud de permisos", kind: "select", options: CONTRATACION_PERMISOS_OPTIONS },
      { name: "conducto_regular_nota", label: "Nota", kind: "textarea", placeholder: "Detalle del conducto regular", columnSpan: "full" },
    ],
  },
  {
    title: "Cierre del proceso",
    description: "Causales de finalización de contrato y rutas de atención.",
    fields: [
      { name: "causales_fin_nivel_apoyo", label: "Causales fin nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "causales_fin_observacion", label: "Causales fin observación", kind: "select", options: CONTRATACION_CAUSALES_OPTIONS },
      { name: "causales_fin_nota", label: "Causales fin nota", kind: "textarea", placeholder: "Detalle de causales de fin de contrato", columnSpan: "full" },
      { name: "rutas_atencion_nivel_apoyo", label: "Rutas de atención nivel de apoyo", kind: "select", options: CONTRATACION_NIVEL_APOYO_OPTIONS },
      { name: "rutas_atencion_observacion", label: "Rutas de atención observación", kind: "select", options: CONTRATACION_RUTAS_OPTIONS },
      { name: "rutas_atencion_nota", label: "Rutas de atención nota", kind: "textarea", placeholder: "Detalle de rutas de atención", columnSpan: "full" },
    ],
  },
] as const satisfies readonly FieldGroup[];

function getRowFieldError(
  errors: FieldErrors<ContratacionValues>,
  index: number,
  fieldName: Exclude<ContratacionVinculadoFieldId, "numero">
) {
  const rowErrors = errors.vinculados;
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

function VinculadoField({
  index,
  field,
  register,
  errors,
}: {
  index: number;
  field: RowFieldConfig;
  register: UseFormRegister<ContratacionValues>;
  errors: FieldErrors<ContratacionValues>;
}) {
  const fieldPath = `vinculados.${index}.${field.name}` as Path<ContratacionValues>;
  const error = getRowFieldError(errors, index, field.name);
  const className = cn(
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm",
    "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
    error ? "border-red-400 bg-red-50" : "border-gray-200"
  );

  return (
    <div className={cn("space-y-1", field.columnSpan === "full" && "sm:col-span-2")}>
      <FormField label={field.label} htmlFor={String(fieldPath)} required error={error}>
        {field.kind === "select" ? (
          <select id={String(fieldPath)} {...register(fieldPath)} className={className}>
            <option value="">Selecciona una opción</option>
            {field.options?.map((option) => (
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
            placeholder={field.placeholder}
            className={cn(className, "min-h-[6.5rem]")}
          />
        ) : (
          <input
            id={String(fieldPath)}
            type={field.kind}
            {...register(fieldPath)}
            placeholder={field.placeholder}
            className={className}
          />
        )}
      </FormField>
    </div>
  );
}

export function ContratacionVinculadosSection({
  control,
  register,
  errors,
}: Props) {
  return (
    <RepeatedPeopleSection
      control={control}
      errors={errors}
      name="vinculados"
      config={CONTRATACION_VINCULADOS_CONFIG}
      title="Vinculados"
      helperText="Agrega uno o varios vinculados. El desarrollo de la actividad vive fuera de cada card."
      renderRow={({ index, row }) => (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-dashed border-reca-200 bg-reca-50 px-3 py-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-reca">
                Consecutivo
              </p>
              <p className="text-sm font-semibold text-gray-900">
                Vinculado {row.numero || String(index + 1)}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Número generado automáticamente según el orden actual.
            </p>
          </div>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                Datos del vinculado
              </h4>
              <p className="text-xs text-gray-500">
                Información personal, contacto, identidad y firma de contrato.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PERSONAL_FIELDS.map((field) => (
                <VinculadoField
                  key={field.name}
                  index={index}
                  field={field}
                  register={register}
                  errors={errors}
                />
              ))}
            </div>
          </section>

          {SUPPORT_GROUPS.map((group) => (
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
                  <VinculadoField
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
