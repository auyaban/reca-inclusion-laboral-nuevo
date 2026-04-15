import type { FieldErrors } from "react-hook-form";
import {
  CONDICIONES_VACANTE_CAPABILITIES_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_COMPANY_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_POSTURES_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_RECOMMENDATIONS_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_RISKS_REQUIRED_FIELDS,
  CONDICIONES_VACANTE_VACANCY_REQUIRED_FIELDS,
  type CondicionesVacanteSectionId,
} from "@/lib/condicionesVacanteSections";
import {
  getFirstErroredField,
  getFirstNestedErrorPath,
} from "@/lib/validationNavigation";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";

export type CondicionesVacanteValidationSectionId = CondicionesVacanteSectionId;

export type CondicionesVacanteValidationTarget = {
  sectionId: CondicionesVacanteValidationSectionId;
  fieldName: string;
};

export function getCondicionesVacanteValidationTarget(
  errors: FieldErrors<CondicionesVacanteValues>
): CondicionesVacanteValidationTarget | null {
  const companyField = getFirstErroredField(
    errors as Record<string, unknown>,
    CONDICIONES_VACANTE_COMPANY_REQUIRED_FIELDS
  );

  if (companyField) {
    return {
      sectionId: "company",
      fieldName: companyField,
    };
  }

  const vacancyField = getFirstErroredField(
    errors as Record<string, unknown>,
    CONDICIONES_VACANTE_VACANCY_REQUIRED_FIELDS
  );

  if (vacancyField) {
    return {
      sectionId: "vacancy",
      fieldName: vacancyField,
    };
  }

  if (errors.nivel_primaria) {
    return {
      sectionId: "education",
      fieldName: "nivel_primaria",
    };
  }

  const educationField = getFirstErroredField(
    errors as Record<string, unknown>,
    CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS
  );

  if (educationField) {
    return {
      sectionId: "education",
      fieldName: educationField,
    };
  }

  const capabilitiesField = getFirstErroredField(
    errors as Record<string, unknown>,
    CONDICIONES_VACANTE_CAPABILITIES_REQUIRED_FIELDS
  );

  if (capabilitiesField) {
    return {
      sectionId: "capabilities",
      fieldName: capabilitiesField,
    };
  }

  const posturesField = getFirstErroredField(
    errors as Record<string, unknown>,
    CONDICIONES_VACANTE_POSTURES_REQUIRED_FIELDS
  );

  if (posturesField) {
    return {
      sectionId: "postures",
      fieldName: posturesField,
    };
  }

  const risksField = getFirstErroredField(
    errors as Record<string, unknown>,
    CONDICIONES_VACANTE_RISKS_REQUIRED_FIELDS
  );

  if (risksField) {
    return {
      sectionId: "risks",
      fieldName: risksField,
    };
  }

  if (errors.discapacidades) {
    return {
      sectionId: "disabilities",
      fieldName:
        getFirstNestedErrorPath(errors.discapacidades, "discapacidades") ??
        "discapacidades.0.discapacidad",
    };
  }

  const recommendationsField = getFirstErroredField(
    errors as Record<string, unknown>,
    CONDICIONES_VACANTE_RECOMMENDATIONS_REQUIRED_FIELDS
  );

  if (recommendationsField) {
    return {
      sectionId: "recommendations",
      fieldName: recommendationsField,
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
