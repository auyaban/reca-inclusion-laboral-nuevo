import type { PrefixedDropdownSyncRule } from "@/lib/prefixedDropdowns";
import {
  INDUCCION_OPERATIVA_SECTION_4_BLOCKS,
  type InduccionOperativaSection4ItemId,
} from "@/lib/induccionOperativa";

export type InduccionOperativaSection4FieldId =
  | `${InduccionOperativaSection4ItemId}.nivel_apoyo`
  | `${InduccionOperativaSection4ItemId}.observaciones`;

export const INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS = [
  "0. No requiere apoyo.",
  "1. Nivel de apoyo bajo.",
  "2. Nivel de apoyo medio.",
  "3. Nivel de apoyo alto.",
  "No aplica.",
] as const;

export const INDUCCION_OPERATIVA_OBSERVACIONES_OPTIONS = [
  "0. Cumple autonomamente.",
  "1. Requiere apoyo bajo.",
  "2. Requiere apoyo medio.",
  "3. Requiere apoyo alto.",
  "No aplica.",
] as const;

const SECTION_4_SYNC_RULES = INDUCCION_OPERATIVA_SECTION_4_BLOCKS.flatMap(
  (block) =>
    block.items.map(
      (itemId) =>
        ({
          mode: "bidirectional",
          prefixFieldIds: [
            `${itemId}.nivel_apoyo`,
            `${itemId}.observaciones`,
          ] as const,
        }) satisfies PrefixedDropdownSyncRule<InduccionOperativaSection4FieldId>
    )
);

export function getInduccionOperativaPrefixSyncRule(
  fieldId: InduccionOperativaSection4FieldId
) {
  return (
    SECTION_4_SYNC_RULES.find((rule) => rule.prefixFieldIds.includes(fieldId)) ??
    null
  );
}

export function getInduccionOperativaSelectOptions(
  fieldId: InduccionOperativaSection4FieldId
) {
  return fieldId.endsWith(".nivel_apoyo")
    ? INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS
    : INDUCCION_OPERATIVA_OBSERVACIONES_OPTIONS;
}
