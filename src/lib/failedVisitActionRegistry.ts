import type { FailedVisitPresetConfig } from "@/lib/failedVisitPreset";

export type FailedVisitActionFormSlug = "presentacion" | "sensibilizacion";

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

const PRESENTACION_FAILED_VISIT_ACTION: FailedVisitActionConfig = {
  formSlug: "presentacion",
  enabled: true,
  dialog: {
    title: "Marcar visita fallida",
    description:
      "Vas a marcar esta presentación como visita fallida. Se conservarán los asistentes diligenciados, la validación mínima bajará a una persona significativa y la fila de Asesor Agencia podrá quedar vacía. Esta acción no se podrá deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario conservará los asistentes actuales y pasará a exigir solo una persona significativa.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. La fila de Asesor Agencia puede quedar vacía y el botón quedó bloqueado para evitar reaplicaciones.",
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
      "Vas a marcar esta sensibilización como visita fallida. Se conservarán los asistentes diligenciados y la validación mínima bajará a una persona significativa completa. Esta acción no se podrá deshacer desde el formulario.",
    confirmLabel: "Marcar como fallida",
  },
  notice: {
    title: "Visita fallida",
    description:
      "Marca esta acta como visita fallida para dejar constancia del caso. El formulario conservará los asistentes actuales y pasará a exigir solo una persona significativa completa.",
    appliedMessage:
      "Esta acta fue marcada como visita fallida. El botón quedó bloqueado y la validación de asistentes ahora exige una sola persona significativa completa.",
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

export const FAILED_VISIT_ACTION_REGISTRY: Record<
  FailedVisitActionFormSlug,
  FailedVisitActionConfig
> = {
  presentacion: PRESENTACION_FAILED_VISIT_ACTION,
  sensibilizacion: SENSIBILIZACION_FAILED_VISIT_ACTION,
};

const FAILED_VISIT_OPTIONAL_PATHS: Record<
  FailedVisitActionFormSlug,
  ReadonlySet<string>
> = {
  presentacion: new Set(PRESENTACION_FAILED_VISIT_ACTION.optionalWhenFailedPaths),
  sensibilizacion: new Set(
    SENSIBILIZACION_FAILED_VISIT_ACTION.optionalWhenFailedPaths
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
