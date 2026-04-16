import type { FieldErrors } from "react-hook-form";
import { getFirstErroredField, getFirstNestedErrorPath } from "@/lib/validationNavigation";
import {
  type InduccionOperativaSectionId,
} from "@/lib/induccionOperativaSections";
import type { InduccionOperativaValues } from "@/lib/validations/induccionOperativa";

export type InduccionOperativaValidationTarget = {
  sectionId: InduccionOperativaSectionId;
  fieldName: string;
};

const COMPANY_FIELDS = ["fecha_visita", "modalidad", "nit_empresa"] as const;

export function getInduccionOperativaValidationTarget(
  errors: FieldErrors<InduccionOperativaValues>
): InduccionOperativaValidationTarget | null {
  const companyField = getFirstErroredField(
    errors as Record<string, unknown>,
    COMPANY_FIELDS
  );

  if (companyField) {
    return {
      sectionId: "company",
      fieldName: companyField,
    };
  }

  if (errors.vinculado) {
    return {
      sectionId: "vinculado",
      fieldName:
        getFirstNestedErrorPath(errors.vinculado, "vinculado") ??
        "vinculado.cedula",
    };
  }

  if (errors.section_3) {
    return {
      sectionId: "development",
      fieldName:
        getFirstNestedErrorPath(errors.section_3, "section_3") ??
        "section_3.funciones_corresponden_perfil.ejecucion",
    };
  }

  if (errors.section_4) {
    return {
      sectionId: "socioemotional",
      fieldName:
        getFirstNestedErrorPath(errors.section_4, "section_4") ??
        "section_4.items.reconoce_instrucciones.nivel_apoyo",
    };
  }

  if (errors.section_5) {
    return {
      sectionId: "support",
      fieldName:
        getFirstNestedErrorPath(errors.section_5, "section_5") ??
        "section_5.condiciones_medicas_salud.nivel_apoyo_requerido",
    };
  }

  if (errors.ajustes_requeridos) {
    return {
      sectionId: "adjustments",
      fieldName: "ajustes_requeridos",
    };
  }

  if (errors.fecha_primer_seguimiento) {
    return {
      sectionId: "followup",
      fieldName: "fecha_primer_seguimiento",
    };
  }

  if (errors.observaciones_recomendaciones) {
    return {
      sectionId: "observations",
      fieldName: "observaciones_recomendaciones",
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
