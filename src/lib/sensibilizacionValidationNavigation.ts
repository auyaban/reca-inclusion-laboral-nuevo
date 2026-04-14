import type { FieldErrors } from "react-hook-form";
import type { SensibilizacionValues } from "@/lib/validations/sensibilizacion";
import {
  getFirstErroredField,
  getFirstNestedErrorPath,
} from "@/lib/validationNavigation";

export type SensibilizacionValidationTarget = {
  sectionId: "visit" | "observations" | "attendees";
  fieldName: string;
};

const STEP_ZERO_FIELD_ORDER = [
  "fecha_visita",
  "modalidad",
  "nit_empresa",
] as const;

export function getSensibilizacionValidationTarget(
  errors: FieldErrors<SensibilizacionValues>
): SensibilizacionValidationTarget | null {
  const visitField = getFirstErroredField(
    errors as Record<string, unknown>,
    STEP_ZERO_FIELD_ORDER
  );

  if (visitField) {
    return {
      sectionId: "visit",
      fieldName: visitField,
    };
  }

  if (errors.observaciones) {
    return {
      sectionId: "observations",
      fieldName: "observaciones",
    };
  }

  if (errors.asistentes) {
    return {
      sectionId: "attendees",
      fieldName:
        getFirstNestedErrorPath(errors.asistentes, "asistentes") ??
        "asistentes.0.nombre",
    };
  }

  return null;
}
