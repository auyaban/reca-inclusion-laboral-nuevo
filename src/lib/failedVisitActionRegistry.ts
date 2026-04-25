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

export type FailedVisitActionFormSlug =
  | "presentacion"
  | "sensibilizacion"
  | "evaluacion"
  | "induccion-operativa"
  | "induccion-organizacional";

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

export const FAILED_VISIT_ACTION_REGISTRY: Record<
  FailedVisitActionFormSlug,
  FailedVisitActionConfig
> = {
  presentacion: PRESENTACION_FAILED_VISIT_ACTION,
  sensibilizacion: SENSIBILIZACION_FAILED_VISIT_ACTION,
  evaluacion: EVALUACION_FAILED_VISIT_ACTION,
  "induccion-operativa": INDUCCION_OPERATIVA_FAILED_VISIT_ACTION,
  "induccion-organizacional": INDUCCION_ORGANIZACIONAL_FAILED_VISIT_ACTION,
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
