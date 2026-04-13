import type { FieldErrors } from "react-hook-form";
import type { PresentacionValues } from "@/lib/validations/presentacion";
import {
  getFirstErroredField,
  getFirstNestedErrorPath,
} from "@/lib/validationNavigation";

export type PresentacionValidationSectionId =
  | "visit"
  | "motivation"
  | "agreements"
  | "attendees";

export type PresentacionValidationTarget = {
  sectionId: PresentacionValidationSectionId;
  fieldName: string;
};

const VISIT_FIELD_ORDER = [
  "tipo_visita",
  "fecha_visita",
  "modalidad",
  "nit_empresa",
] as const;

export function getPresentacionValidationTarget(
  errors: FieldErrors<PresentacionValues>
): PresentacionValidationTarget | null {
  const visitField = getFirstErroredField(
    errors as Record<string, unknown>,
    VISIT_FIELD_ORDER
  );

  if (visitField) {
    return {
      sectionId: "visit",
      fieldName: visitField,
    };
  }

  if (errors.motivacion) {
    return {
      sectionId: "motivation",
      fieldName: "motivacion",
    };
  }

  if (errors.acuerdos_observaciones) {
    return {
      sectionId: "agreements",
      fieldName: "acuerdos_observaciones",
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
