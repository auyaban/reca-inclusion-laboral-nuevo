import type { PrefixedDropdownSyncRule } from "@/lib/prefixedDropdowns";
import type { ContratacionVinculadoFieldId } from "@/lib/validations/contratacion";
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
} from "@/lib/validations/contratacion";

const CONTRATACION_FIELD_OPTIONS: Partial<
  Record<Exclude<ContratacionVinculadoFieldId, "numero">, readonly string[]>
> = {
  certificado_porcentaje: [],
  discapacidad: CONTRATACION_DISCAPACIDAD_OPTIONS,
  genero: CONTRATACION_GENERO_OPTIONS,
  lgtbiq: CONTRATACION_LGTBIQ_OPTIONS,
  grupo_etnico: CONTRATACION_GRUPO_ETNICO_OPTIONS,
  grupo_etnico_cual: CONTRATACION_GRUPO_ETNICO_CUAL_OPTIONS,
  certificado_discapacidad: CONTRATACION_CERTIFICADO_DISCAPACIDAD_OPTIONS,
  tipo_contrato: CONTRATACION_TIPO_CONTRATO_FIRMADO_OPTIONS,
  contrato_lee_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  contrato_lee_observacion: CONTRATACION_LECTURA_CONTRATO_OPTIONS,
  contrato_comprendido_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  contrato_comprendido_observacion: CONTRATACION_COMPRENDE_CONTRATO_OPTIONS,
  contrato_tipo_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  contrato_tipo_observacion: CONTRATACION_TIPO_CONTRATO_OBSERVACION_OPTIONS,
  contrato_tipo_contrato: CONTRATACION_TIPO_CONTRATO_OPTIONS,
  contrato_jornada: CONTRATACION_JORNADA_OPTIONS,
  contrato_clausulas: CONTRATACION_CLAUSULAS_OPTIONS,
  condiciones_salariales_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  condiciones_salariales_observacion: CONTRATACION_CONDICIONES_SALARIALES_OPTIONS,
  condiciones_salariales_frecuencia_pago: CONTRATACION_FRECUENCIA_PAGO_OPTIONS,
  condiciones_salariales_forma_pago: CONTRATACION_FORMA_PAGO_OPTIONS,
  prestaciones_cesantias_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_cesantias_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_auxilio_transporte_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_auxilio_transporte_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_prima_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_prima_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_seguridad_social_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_seguridad_social_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_vacaciones_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_vacaciones_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  prestaciones_auxilios_beneficios_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  prestaciones_auxilios_beneficios_observacion: CONTRATACION_PRESTACIONES_OPTIONS,
  conducto_regular_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  conducto_regular_observacion: CONTRATACION_CONDUCTO_REGULAR_OPTIONS,
  descargos_observacion: CONTRATACION_DESCARGOS_OPTIONS,
  tramites_observacion: CONTRATACION_TRAMITES_OPTIONS,
  permisos_observacion: CONTRATACION_PERMISOS_OPTIONS,
  causales_fin_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  causales_fin_observacion: CONTRATACION_CAUSALES_OPTIONS,
  rutas_atencion_nivel_apoyo: CONTRATACION_NIVEL_APOYO_OPTIONS,
  rutas_atencion_observacion: CONTRATACION_RUTAS_OPTIONS,
};

export const CONTRATACION_PREFIX_SYNC_RULES: readonly PrefixedDropdownSyncRule<
  Exclude<ContratacionVinculadoFieldId, "numero">
>[] = [
  {
    mode: "bidirectional",
    prefixFieldIds: ["contrato_lee_nivel_apoyo", "contrato_lee_observacion"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "contrato_comprendido_nivel_apoyo",
      "contrato_comprendido_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["contrato_tipo_nivel_apoyo", "contrato_tipo_observacion"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "condiciones_salariales_nivel_apoyo",
      "condiciones_salariales_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "prestaciones_cesantias_nivel_apoyo",
      "prestaciones_cesantias_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "prestaciones_auxilio_transporte_nivel_apoyo",
      "prestaciones_auxilio_transporte_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "prestaciones_prima_nivel_apoyo",
      "prestaciones_prima_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "prestaciones_seguridad_social_nivel_apoyo",
      "prestaciones_seguridad_social_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "prestaciones_vacaciones_nivel_apoyo",
      "prestaciones_vacaciones_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "prestaciones_auxilios_beneficios_nivel_apoyo",
      "prestaciones_auxilios_beneficios_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "conducto_regular_nivel_apoyo",
      "conducto_regular_observacion",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["causales_fin_nivel_apoyo", "causales_fin_observacion"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "rutas_atencion_nivel_apoyo",
      "rutas_atencion_observacion",
    ],
  },
] as const;

export function getContratacionSelectOptions(
  fieldId: Exclude<ContratacionVinculadoFieldId, "numero">
) {
  return CONTRATACION_FIELD_OPTIONS[fieldId] ?? [];
}

export function getContratacionPrefixSyncRule(
  fieldId: Exclude<ContratacionVinculadoFieldId, "numero">
) {
  return (
    CONTRATACION_PREFIX_SYNC_RULES.find((rule) =>
      rule.mode === "bidirectional"
        ? rule.prefixFieldIds.includes(fieldId)
        : rule.primaryFieldId === fieldId || rule.secondaryFieldId === fieldId
    ) ?? null
  );
}
