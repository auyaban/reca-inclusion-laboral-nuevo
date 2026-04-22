import { type FailedVisitPresetConfig } from "@/lib/failedVisitPreset";
import {
  SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT,
  SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT,
  type SeguimientosFollowupIndex,
} from "@/lib/seguimientos";

function buildIndexedPaths(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix}.${index}`);
}

export const SEGUIMIENTOS_FOLLOWUP_FAILED_VISIT_PRESET: FailedVisitPresetConfig =
  {
    enabled: true,
    title: "Marcar visita fallida",
    description:
      "Vas a marcar este seguimiento como visita fallida. Las evaluaciones funcionales quedaran en 'No aplica' y luego podras ajustar manualmente cualquier dato adicional.",
    confirmLabel: "Marcar como fallida",
    excludedPaths: [
      "situacion_encontrada",
      "estrategias_ajustes",
    ],
    fieldGroups: [
      {
        value: "No aplica",
        paths: [
          ...buildIndexedPaths(
            "item_observaciones",
            SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
          ),
          ...buildIndexedPaths(
            "item_autoevaluacion",
            SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
          ),
          ...buildIndexedPaths(
            "item_eval_empresa",
            SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
          ),
          ...buildIndexedPaths(
            "empresa_observacion",
            SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
          ),
          ...buildIndexedPaths(
            "empresa_eval",
            SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
          ),
        ],
      },
    ],
  };

export function getSeguimientosFollowupFailedVisitPreset(
  followupIndex: SeguimientosFollowupIndex
) {
  void followupIndex;
  return SEGUIMIENTOS_FOLLOWUP_FAILED_VISIT_PRESET;
}
