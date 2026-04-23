import type { FieldErrors } from "react-hook-form";

import {
  getFirstErroredField,
  getRepeatedArrayValidationFieldName,
} from "@/lib/validationNavigation";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";

export interface InterpreteLscValidationTarget {
  sectionId: "company" | "participants" | "interpreters" | "attendees";
  fieldName: string;
}

const COMPANY_FIELDS = [
  "fecha_visita",
  "modalidad_interprete",
  "modalidad_profesional_reca",
  "nit_empresa",
] as const;

export function getInterpreteLscValidationTarget(
  errors: FieldErrors<InterpreteLscValues>
): InterpreteLscValidationTarget | null {
  const companyField = getFirstErroredField(errors, COMPANY_FIELDS);
  if (companyField) {
    return {
      sectionId: "company",
      fieldName: companyField,
    };
  }

  if (errors.oferentes) {
    return {
      sectionId: "participants",
      fieldName: getRepeatedArrayValidationFieldName(
        errors.oferentes,
        "oferentes",
        "nombre_oferente"
      ),
    };
  }

  if (errors.interpretes) {
    return {
      sectionId: "interpreters",
      fieldName: getRepeatedArrayValidationFieldName(
        errors.interpretes,
        "interpretes",
        "nombre"
      ),
    };
  }

  if (errors.asistentes) {
    return {
      sectionId: "attendees",
      fieldName: getRepeatedArrayValidationFieldName(
        errors.asistentes,
        "asistentes",
        "nombre"
      ),
    };
  }

  return null;
}
