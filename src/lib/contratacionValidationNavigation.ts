import type { FieldErrors } from "react-hook-form";
import {
  CONTRATACION_COMPANY_REQUIRED_FIELDS,
  type ContratacionSectionId,
} from "@/lib/contratacionSections";
import {
  getFirstErroredField,
  getRepeatedArrayValidationFieldName,
} from "@/lib/validationNavigation";
import type { ContratacionValues } from "@/lib/validations/contratacion";

export type ContratacionValidationTarget = {
  sectionId: ContratacionSectionId;
  fieldName: string;
};

export function getContratacionValidationTarget(
  errors: FieldErrors<ContratacionValues>
): ContratacionValidationTarget | null {
  const companyField = getFirstErroredField(
    errors as Record<string, unknown>,
    CONTRATACION_COMPANY_REQUIRED_FIELDS
  );

  if (companyField) {
    return {
      sectionId: "company",
      fieldName: companyField,
    };
  }

  if (errors.desarrollo_actividad) {
    return {
      sectionId: "activity",
      fieldName: "desarrollo_actividad",
    };
  }

  if (errors.vinculados) {
    return {
      sectionId: "vinculados",
      fieldName: getRepeatedArrayValidationFieldName(
        errors.vinculados,
        "vinculados",
        "nombre_oferente"
      ),
    };
  }

  if (errors.ajustes_recomendaciones) {
    return {
      sectionId: "recommendations",
      fieldName: "ajustes_recomendaciones",
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
