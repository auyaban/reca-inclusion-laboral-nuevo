import type {
  FailedVisitPresetConfig,
} from "@/lib/failedVisitPreset";
import {
  EVALUACION_FAILED_VISIT_OPTIONAL_PATHS,
  EVALUACION_FAILED_VISIT_PRESET_FIELD_GROUPS,
} from "@/lib/evaluacionSections";
import {
  INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_4_BLOCKS,
  INDUCCION_OPERATIVA_SECTION_5_ROWS,
} from "@/lib/induccionOperativa";
import {
  INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS,
  INDUCCION_OPERATIVA_OBSERVACIONES_OPTIONS,
} from "@/lib/induccionOperativaPrefixedDropdowns";
import {
  getInduccionOrganizacionalSection3ItemIds,
  INDUCCION_ORGANIZACIONAL_SECTION_4_DEFAULT_ROWS,
} from "@/lib/induccionOrganizacional";
import {
  CONDICIONES_VACANTE_FAILED_VISIT_OPTIONAL_FIELDS,
  CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  CONDICIONES_VACANTE_FRECUENCIA_OPTIONS,
  CONDICIONES_VACANTE_BREAK_DESCANSO_OPTIONS,
  CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  CONDICIONES_VACANTE_TIEMPO_ALMUERZO_OPTIONS,
  CONDICIONES_VACANTE_TIEMPO_OPTIONS,
} from "@/lib/validations/condicionesVacante";

export type FailedVisitActionFormSlug =
  | "presentacion"
  | "sensibilizacion"
  | "evaluacion"
  | "induccion-operativa"
  | "induccion-organizacional"
  | "seleccion"
  | "contratacion"
  | "condiciones-vacante";

type FailedVisitActionDialogCopy = {
  title: string;
  description: string;
  confirmLabel: string;
};

type FailedVisitActionNoticeCopy = {
  title: string;
  description: string;
  appliedMessage: string;
  buttonLabel: string;
  appliedButtonLabel: string;
};

export type FailedVisitActionConfig = {
  formSlug: FailedVisitActionFormSlug;
  enabled: true;
  dialog: FailedVisitActionDialogCopy;
  notice: FailedVisitActionNoticeCopy;
  presetConfig: FailedVisitPresetConfig;
  optionalWhenFailedPaths: readonly string[];
};

function resolveNoAplicaOption(options: readonly string[]) {
  return (
    options.find((option) =>
      option
        .trim()
        .toLocaleLowerCase("es-CO")
        .replace(/\.+$/, "") === "no aplica"
    ) ?? null
  );
}

const INDUCCION_OPERATIVA_NO_APLICA_SUPPORT =
  resolveNoAplicaOption(INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS) ??
  "No aplica.";
const INDUCCION_OPERATIVA_NO_APLICA_OBSERVACION =
  resolveNoAplicaOption(INDUCCION_OPERATIVA_OBSERVACIONES_OPTIONS) ??
  "No aplica.";
const CONDICIONES_VACANTE_NO_APLICA_CAPABILITY =
  resolveNoAplicaOption(CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS) ??
  "No aplica";
const CONDICIONES_VACANTE_NO_APLICA_TIME =
  resolveNoAplicaOption(CONDICIONES_VACANTE_TIEMPO_OPTIONS) ?? "No aplica";
const CONDICIONES_VACANTE_NO_APLICA_LUNCH_TIME =
  resolveNoAplicaOption(CONDICIONES_VACANTE_TIEMPO_ALMUERZO_OPTIONS) ??
  "No aplica.";
const CONDICIONES_VACANTE_NO_APLICA_FREQUENCY =
  resolveNoAplicaOption(CONDICIONES_VACANTE_FRECUENCIA_OPTIONS) ??
  "No aplica.";
const CONDICIONES_VACANTE_NO_APLICA_BREAK =
  resolveNoAplicaOption(CONDICIONES_VACANTE_BREAK_DESCANSO_OPTIONS) ??
  "No aplica";
const CONDICIONES_VACANTE_NO_APLICA_RISK =
  resolveNoAplicaOption(CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS) ??
  "No aplica";

const PRESENTACION_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "presentacion",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar esta presentacion como visita fallida. Se conservaran los asistentes diligenciados, la validacion minima bajara a una persona significativa y la fila de Asesor Agencia podra quedar vacia. Esta accion no se podra deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario conservara los asistentes actuales y pasara a exigir solo una persona significativa.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. La fila de Asesor Agencia puede quedar vacia y el boton quedo bloqueado para evitar reaplicaciones.",
    buttonLabel: "Marcar visita fallida",
    appliedButtonLabel: "Visita fallida aplicada",
  },
  presetConfig: {
    enabled: true,
    excludedPaths: ["acuerdos_observaciones"],
    fieldGroups: [],
  },
  optionalWhenFailedPaths: [],
};

const SENSIBILIZACION_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "sensibilizacion",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar esta sensibilizacion como visita fallida. Se conservaran los asistentes diligenciados y la validacion minima bajara a una persona significativa completa. Esta accion no se podra deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario conservara los asistentes actuales y pasara a exigir solo una persona significativa completa.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. El boton quedo bloqueado y la validacion de asistentes ahora exige una sola persona significativa completa.",
    buttonLabel: "Marcar visita fallida",
    appliedButtonLabel: "Visita fallida aplicada",
  },
  presetConfig: {
    enabled: true,
    excludedPaths: ["observaciones"],
    fieldGroups: [],
  },
  optionalWhenFailedPaths: [],
};

const EVALUACION_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "evaluacion",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar esta evaluacion como visita fallida. El formulario aplicara los valores de No aplica cuando existan, relajara solo los campos imposibles de diligenciar y exigira una narrativa manual final. Esta accion no se podra deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta evaluacion como visita fallida para dejar constancia del caso. El formulario completara los campos compatibles con No aplica y solo exigira una persona significativa en asistentes.",
    appliedMessage:
      "Esta evaluacion fue marcada como visita fallida. Se aplicaron los valores compatibles con No aplica y el boton quedo bloqueado para evitar reaplicaciones.",
    buttonLabel: "Marcar visita fallida",
    appliedButtonLabel: "Visita fallida aplicada",
  },
  presetConfig: {
    enabled: true,
    excludedPaths: ["observaciones_generales"],
    fieldGroups: EVALUACION_FAILED_VISIT_PRESET_FIELD_GROUPS,
  },
  optionalWhenFailedPaths: EVALUACION_FAILED_VISIT_OPTIONAL_PATHS,
};

const INDUCCION_OPERATIVA_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "induccion-operativa",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar esta induccion operativa como visita fallida. El formulario aplicara No aplica en las matrices compatibles y solo pedira una narrativa manual final para describir lo ocurrido. Esta accion no se podra deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario completara las matrices con No aplica y mantendra el bloque de asistentes actual.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. Se aplicaron los valores compatibles con No aplica y el boton quedo bloqueado.",
    buttonLabel: "Marcar visita fallida",
    appliedButtonLabel: "Visita fallida aplicada",
  },
  presetConfig: {
    enabled: true,
    excludedPaths: ["observaciones_recomendaciones"],
    fieldGroups: [
      {
        value: "No aplica",
        paths: [
          ...Object.keys(
            INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS
          ).flatMap((itemId) => [
            `section_3.${itemId}.ejecucion`,
            `section_3.${itemId}.observaciones`,
          ]),
          ...INDUCCION_OPERATIVA_SECTION_5_ROWS.map(
            (row) => `section_5.${row.id}.observaciones`
          ),
          "ajustes_requeridos",
        ],
      },
      {
        value: INDUCCION_OPERATIVA_NO_APLICA_SUPPORT,
        paths: [
          ...INDUCCION_OPERATIVA_SECTION_4_BLOCKS.flatMap((block) =>
            block.items.map(
              (itemId) => `section_4.items.${itemId}.nivel_apoyo`
            )
          ),
          ...INDUCCION_OPERATIVA_SECTION_5_ROWS.map(
            (row) => `section_5.${row.id}.nivel_apoyo_requerido`
          ),
        ],
      },
      {
        value: INDUCCION_OPERATIVA_NO_APLICA_OBSERVACION,
        paths: INDUCCION_OPERATIVA_SECTION_4_BLOCKS.flatMap((block) =>
          block.items.map(
            (itemId) => `section_4.items.${itemId}.observaciones`
          )
        ),
      },
    ],
  },
  optionalWhenFailedPaths: ["fecha_primer_seguimiento"],
};

const INDUCCION_ORGANIZACIONAL_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "induccion-organizacional",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar esta induccion organizacional como visita fallida. El formulario aplicara No aplica en las matrices compatibles y exigira una observacion manual final para describir lo ocurrido. Esta accion no se podra deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario completara los campos compatibles con No aplica y mantendra el bloque de asistentes actual.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. Se aplicaron los valores compatibles con No aplica y el boton quedo bloqueado.",
    buttonLabel: "Marcar visita fallida",
    appliedButtonLabel: "Visita fallida aplicada",
  },
  presetConfig: {
    enabled: true,
    excludedPaths: ["section_5.observaciones"],
    fieldGroups: [
      {
        value: "No aplica",
        paths: [
          ...getInduccionOrganizacionalSection3ItemIds().flatMap((itemId) => [
            `section_3.${itemId}.visto`,
            `section_3.${itemId}.responsable`,
            `section_3.${itemId}.medio_socializacion`,
            `section_3.${itemId}.descripcion`,
          ]),
          ...INDUCCION_ORGANIZACIONAL_SECTION_4_DEFAULT_ROWS.flatMap(
            (_row, index) => [`section_4.${index}.medio`]
          ),
        ],
      },
    ],
  },
  optionalWhenFailedPaths: [],
};

const SELECCION_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "seleccion",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar esta seleccion como visita fallida. El formulario conservara las filas diligenciadas, dejara de exigir oferentes para finalizar y aplicara No aplica solo en los campos cortos compatibles. Esta accion no se podra deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario preservara las filas existentes, completara los campos cortos compatibles con No aplica y mantendra obligatorias las narrativas finales.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. Los oferentes dejaron de ser bloqueantes y el boton quedo bloqueado para evitar reaplicaciones.",
    buttonLabel: "Marcar visita fallida",
    appliedButtonLabel: "Visita fallida aplicada",
  },
  presetConfig: {
    enabled: true,
    excludedPaths: ["desarrollo_actividad", "ajustes_recomendaciones"],
    fieldGroups: [
      {
        value: "No aplica",
        paths: ["nota"],
      },
    ],
  },
  optionalWhenFailedPaths: [],
};

const CONTRATACION_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "contratacion",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar esta contratacion como visita fallida. El formulario conservara las filas diligenciadas, dejara de exigir vinculados para finalizar y aplicara No aplica solo en los campos cortos compatibles. Esta accion no se podra deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario preservara las filas existentes, completara los campos cortos compatibles con No aplica y mantendra obligatorias las narrativas finales.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. Los vinculados dejaron de ser bloqueantes y el boton quedo bloqueado para evitar reaplicaciones.",
    buttonLabel: "Marcar visita fallida",
    appliedButtonLabel: "Visita fallida aplicada",
  },
  presetConfig: {
    enabled: true,
    excludedPaths: ["desarrollo_actividad", "ajustes_recomendaciones"],
    fieldGroups: [],
  },
  optionalWhenFailedPaths: [],
};

const CONDICIONES_VACANTE_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "condiciones-vacante",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar estas condiciones de la vacante como visita fallida. El formulario aplicara No aplica solo en los campos compatibles, relajara las secciones estructurales que no tienen un No aplica honesto y permitira finalizar con un solo asistente significativo. Esta accion no se podra deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario completara los campos cortos compatibles con No aplica y dejara de bloquear por discapacidades o niveles educativos sin diligenciar.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. Se aplicaron los valores compatibles con No aplica, el minimo de asistentes bajo a una persona significativa y el boton quedo bloqueado.",
    buttonLabel: "Marcar visita fallida",
    appliedButtonLabel: "Visita fallida aplicada",
  },
  presetConfig: {
    enabled: true,
    excludedPaths: ["observaciones_recomendaciones"],
    fieldGroups: [
      {
        value: "No aplica",
        paths: [
          "requiere_certificado_observaciones",
          "observaciones",
          "observaciones_cognitivas",
          "observaciones_motricidad_fina",
          "observaciones_motricidad_gruesa",
          "observaciones_transversales",
          "observaciones_peligros",
        ],
      },
      {
        value: CONDICIONES_VACANTE_NO_APLICA_CAPABILITY,
        paths: [
          "lectura",
          "comprension_lectora",
          "escritura",
          "comunicacion_verbal",
          "razonamiento_logico",
          "conteo_reporte",
          "clasificacion_objetos",
          "velocidad_ejecucion",
          "concentracion",
          "memoria",
          "ubicacion_espacial",
          "atencion",
          "agarre",
          "precision",
          "digitacion",
          "agilidad_manual",
          "coordinacion_ojo_mano",
          "esfuerzo_fisico",
          "equilibrio_corporal",
          "lanzar_objetos",
          "seguimiento_instrucciones",
          "resolucion_conflictos",
          "autonomia_tareas",
          "trabajo_equipo",
          "adaptabilidad",
          "flexibilidad",
          "comunicacion_asertiva",
          "manejo_tiempo",
          "liderazgo",
          "escucha_activa",
          "proactividad",
        ],
      },
      {
        value: CONDICIONES_VACANTE_NO_APLICA_TIME,
        paths: [
          "sentado_tiempo",
          "semisentado_tiempo",
          "de_pie_tiempo",
          "agachado_tiempo",
          "uso_extremidades_superiores_tiempo",
        ],
      },
      {
        value: CONDICIONES_VACANTE_NO_APLICA_LUNCH_TIME,
        paths: ["tiempo_almuerzo"],
      },
      {
        value: CONDICIONES_VACANTE_NO_APLICA_FREQUENCY,
        paths: [
          "sentado_frecuencia",
          "semisentado_frecuencia",
          "de_pie_frecuencia",
          "agachado_frecuencia",
          "uso_extremidades_superiores_frecuencia",
        ],
      },
      {
        value: CONDICIONES_VACANTE_NO_APLICA_BREAK,
        paths: ["break_descanso"],
      },
      {
        value: CONDICIONES_VACANTE_NO_APLICA_RISK,
        paths: [
          "ruido",
          "iluminacion",
          "temperaturas_externas",
          "vibraciones",
          "presion_atmosferica",
          "radiaciones",
          "polvos_organicos_inorganicos",
          "fibras",
          "liquidos",
          "gases_vapores",
          "humos_metalicos",
          "humos_no_metalicos",
          "material_particulado",
          "electrico",
          "locativo",
          "accidentes_transito",
          "publicos",
          "mecanico",
          "gestion_organizacional",
          "caracteristicas_organizacion",
          "caracteristicas_grupo_social",
          "condiciones_tarea",
          "interfase_persona_tarea",
          "jornada_trabajo",
          "postura_trabajo",
          "puesto_trabajo",
          "movimientos_repetitivos",
          "manipulacion_cargas",
          "herramientas_equipos_riesgo",
          "organizacion_trabajo",
        ],
      },
    ],
  },
  optionalWhenFailedPaths: CONDICIONES_VACANTE_FAILED_VISIT_OPTIONAL_FIELDS,
};

export const FAILED_VISIT_ACTION_REGISTRY: Record<
  FailedVisitActionFormSlug,
  FailedVisitActionConfig
> = {
  presentacion: PRESENTACION_FAILED_VISIT_ACTION,
  sensibilizacion: SENSIBILIZACION_FAILED_VISIT_ACTION,
  evaluacion: EVALUACION_FAILED_VISIT_ACTION,
  "induccion-operativa": INDUCCION_OPERATIVA_FAILED_VISIT_ACTION,
  "induccion-organizacional": INDUCCION_ORGANIZACIONAL_FAILED_VISIT_ACTION,
  seleccion: SELECCION_FAILED_VISIT_ACTION,
  contratacion: CONTRATACION_FAILED_VISIT_ACTION,
  "condiciones-vacante": CONDICIONES_VACANTE_FAILED_VISIT_ACTION,
};

const FAILED_VISIT_OPTIONAL_PATHS: Record<
  FailedVisitActionFormSlug,
  ReadonlySet<string>
> = {
  presentacion: new Set(PRESENTACION_FAILED_VISIT_ACTION.optionalWhenFailedPaths),
  sensibilizacion: new Set(
    SENSIBILIZACION_FAILED_VISIT_ACTION.optionalWhenFailedPaths
  ),
  evaluacion: new Set(EVALUACION_FAILED_VISIT_ACTION.optionalWhenFailedPaths),
  "induccion-operativa": new Set(
    INDUCCION_OPERATIVA_FAILED_VISIT_ACTION.optionalWhenFailedPaths
  ),
  "induccion-organizacional": new Set(
    INDUCCION_ORGANIZACIONAL_FAILED_VISIT_ACTION.optionalWhenFailedPaths
  ),
  seleccion: new Set(SELECCION_FAILED_VISIT_ACTION.optionalWhenFailedPaths),
  contratacion: new Set(CONTRATACION_FAILED_VISIT_ACTION.optionalWhenFailedPaths),
  "condiciones-vacante": new Set(
    CONDICIONES_VACANTE_FAILED_VISIT_ACTION.optionalWhenFailedPaths
  ),
};

export function getFailedVisitActionConfig(
  formSlug: string | null | undefined
) {
  if (!formSlug) {
    return null;
  }

  return (
    FAILED_VISIT_ACTION_REGISTRY[
      formSlug as FailedVisitActionFormSlug
    ] ?? null
  );
}

export function isFailedVisitOptionalPath(
  formSlug: FailedVisitActionFormSlug,
  path: string
) {
  return FAILED_VISIT_OPTIONAL_PATHS[formSlug]?.has(path) ?? false;
}
