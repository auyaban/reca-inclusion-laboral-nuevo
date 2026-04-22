import type { FieldErrors } from "react-hook-form";
import {
  getFirstNestedErrorPath,
  hasNestedError,
} from "@/lib/validationNavigation";
import type {
  SeguimientosBaseStageValues,
  SeguimientosFollowupStageValues,
} from "@/lib/validations/seguimientos";

function getValueAtPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function getFirstSeguimientosErroredField(
  errors: Record<string, unknown>,
  orderedFields: readonly string[]
) {
  return (
    orderedFields.find((fieldName) =>
      hasNestedError(getValueAtPath(errors, fieldName))
    ) ?? getFirstNestedErrorPath(errors)
  );
}

export function getSeguimientosBaseValidationFieldName(
  errors: FieldErrors<SeguimientosBaseStageValues>,
  orderedFields: readonly string[]
) {
  return getFirstSeguimientosErroredField(
    errors as Record<string, unknown>,
    orderedFields
  );
}

export function getSeguimientosFollowupValidationFieldName(
  errors: FieldErrors<SeguimientosFollowupStageValues>,
  orderedFields: readonly string[]
) {
  return getFirstSeguimientosErroredField(
    errors as Record<string, unknown>,
    orderedFields
  );
}

