import type { FieldErrors } from "react-hook-form";
import {
  SELECCION_COMPANY_REQUIRED_FIELDS,
  type SeleccionSectionId,
} from "@/lib/seleccionSections";
import {
  getFirstErroredField,
  getRepeatedArrayValidationFieldName,
} from "@/lib/validationNavigation";
import type { SeleccionValues } from "@/lib/validations/seleccion";

export type SeleccionValidationTarget = {
  sectionId: SeleccionSectionId;
  fieldName: string;
};

export function getSeleccionValidationTarget(
  errors: FieldErrors<SeleccionValues>
): SeleccionValidationTarget | null {
  const companyField = getFirstErroredField(
    errors as Record<string, unknown>,
    SELECCION_COMPANY_REQUIRED_FIELDS
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

  if (errors.oferentes) {
    return {
      sectionId: "oferentes",
      fieldName: getRepeatedArrayValidationFieldName(
        errors.oferentes,
        "oferentes",
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

  if (errors.nota) {
    return {
      sectionId: "recommendations",
      fieldName: "nota",
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
