import type { PrefixedDropdownSyncRule } from "@/lib/prefixedDropdowns";
import {
  SELECCION_OFERENTE_FIELDS_BY_ID,
  type SeleccionOferenteFieldId,
} from "@/lib/validations/seleccion";

export const SELECCION_PREFIX_SYNC_RULES: readonly PrefixedDropdownSyncRule<
  Exclude<SeleccionOferenteFieldId, "numero">
>[] = [
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "medicamentos_nivel_apoyo",
      "medicamentos_conocimiento",
      "medicamentos_horarios",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["alergias_nivel_apoyo", "alergias_tipo"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["restriccion_nivel_apoyo", "restriccion_conocimiento"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["controles_nivel_apoyo", "controles_asistencia"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["desplazamiento_nivel_apoyo", "desplazamiento_modo"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["ubicacion_nivel_apoyo", "ubicacion_ciudad"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["dinero_nivel_apoyo", "dinero_manejo"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["presentacion_nivel_apoyo", "presentacion_personal"],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "comunicacion_escrita_nivel_apoyo",
      "comunicacion_escrita_apoyo",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: [
      "comunicacion_verbal_nivel_apoyo",
      "comunicacion_verbal_apoyo",
    ],
  },
  {
    mode: "bidirectional",
    prefixFieldIds: ["decisiones_nivel_apoyo", "toma_decisiones"],
  },
  {
    mode: "primary_with_dependents",
    primaryFieldId: "aseo_nivel_apoyo",
    secondaryFieldId: "alimentacion",
    dependentBooleanFieldIds: [
      "aseo_criar_apoyo",
      "aseo_comunicacion_apoyo",
      "aseo_ayudas_apoyo",
      "aseo_alimentacion",
      "aseo_movilidad_funcional",
      "aseo_higiene_aseo",
    ],
  },
  {
    mode: "primary_with_dependents",
    primaryFieldId: "instrumentales_nivel_apoyo",
    secondaryFieldId: "instrumentales_actividades",
    dependentBooleanFieldIds: [
      "instrumentales_criar_apoyo",
      "instrumentales_comunicacion_apoyo",
      "instrumentales_movilidad_apoyo",
      "instrumentales_finanzas",
      "instrumentales_cocina_limpieza",
      "instrumentales_crear_hogar",
      "instrumentales_salud_cuenta_apoyo",
    ],
  },
  {
    mode: "primary_with_dependents",
    primaryFieldId: "actividades_nivel_apoyo",
    secondaryFieldId: "actividades_apoyo",
    dependentBooleanFieldIds: [
      "actividades_esparcimiento_apoyo",
      "actividades_esparcimiento_cuenta_apoyo",
      "actividades_complementarios_apoyo",
      "actividades_complementarios_cuenta_apoyo",
      "actividades_subsidios_cuenta_apoyo",
    ],
  },
  {
    mode: "primary_with_dependents",
    primaryFieldId: "discriminacion_nivel_apoyo",
    secondaryFieldId: "discriminacion",
    dependentBooleanFieldIds: [
      "discriminacion_violencia_apoyo",
      "discriminacion_violencia_cuenta_apoyo",
      "discriminacion_vulneracion_apoyo",
      "discriminacion_vulneracion_cuenta_apoyo",
    ],
  },
] as const;

export const SELECCION_PREFIX_SYNC_INDEPENDENT_FIELD_IDS = [
  "controles_frecuencia",
  "desplazamiento_transporte",
  "ubicacion_aplicaciones",
] as const;

export function getSeleccionSelectOptions(
  fieldId: Exclude<SeleccionOferenteFieldId, "numero">
) {
  const fieldMeta = SELECCION_OFERENTE_FIELDS_BY_ID[fieldId];
  return fieldMeta.kind === "lista" ? fieldMeta.options : [];
}

export function getSeleccionPrefixSyncRule(
  fieldId: Exclude<SeleccionOferenteFieldId, "numero">
) {
  return (
    SELECCION_PREFIX_SYNC_RULES.find((rule) =>
      rule.mode === "bidirectional"
        ? rule.prefixFieldIds.includes(fieldId)
        : rule.primaryFieldId === fieldId || rule.secondaryFieldId === fieldId
    ) ?? null
  );
}
