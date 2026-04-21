import type { FieldErrors } from "react-hook-form";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";
import {
  EVALUACION_COMPANY_FIELD_IDS,
  EVALUACION_QUESTION_SECTION_IDS,
  type EvaluacionQuestionSectionId,
} from "@/lib/evaluacionSections";
import {
  getFirstErroredField,
  getFirstNestedErrorPath,
} from "@/lib/validationNavigation";

export type EvaluacionValidationTarget = {
  sectionId:
    | "company"
    | EvaluacionQuestionSectionId
    | "section_4"
    | "section_5"
    | "section_6"
    | "section_7"
    | "section_8";
  fieldName: string;
};

function getSection4ValidationFieldName(
  errors: FieldErrors<EvaluacionValues>["section_4"]
) {
  if (errors?.nivel_accesibilidad) {
    return "section_4.nivel_accesibilidad";
  }

  if (errors?.descripcion) {
    // `descripcion` is derived + readonly in UI, so route users to the editable level.
    return "section_4.nivel_accesibilidad";
  }

  return "section_4.nivel_accesibilidad";
}

function getSection5ValidationFieldName(
  errors: FieldErrors<EvaluacionValues>["section_5"]
) {
  if (!errors) {
    return "section_5.discapacidad_fisica.aplica";
  }

  for (const [itemId, itemErrors] of Object.entries(errors)) {
    if (!itemErrors || typeof itemErrors !== "object") {
      continue;
    }

    const candidate = itemErrors as {
      aplica?: unknown;
      nota?: unknown;
      ajustes?: unknown;
    };

    if (candidate.aplica || candidate.nota || candidate.ajustes) {
      // `nota` and `ajustes` are derived + readonly in UI, so the actionable field
      // is always the paired `aplica` select.
      return `section_5.${itemId}.aplica`;
    }
  }

  return "section_5.discapacidad_fisica.aplica";
}

function hasFieldErrorMessage(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      ("message" in value || "type" in value || "root" in value)
  );
}

const COMPANY_FIELD_ORDER = EVALUACION_COMPANY_FIELD_IDS;

export function getEvaluacionValidationTarget(
  errors: FieldErrors<EvaluacionValues>
): EvaluacionValidationTarget | null {
  const companyField = getFirstErroredField(
    errors as Record<string, unknown>,
    COMPANY_FIELD_ORDER
  );

  if (companyField) {
    return {
      sectionId: "company",
      fieldName: companyField,
    };
  }

  for (const sectionId of EVALUACION_QUESTION_SECTION_IDS) {
    const firstFieldPath = getFirstNestedErrorPath(errors[sectionId], sectionId);
    if (firstFieldPath) {
      return {
        sectionId,
        fieldName: firstFieldPath,
      };
    }
  }

  if (errors.section_4) {
    return {
      sectionId: "section_4",
      fieldName: getSection4ValidationFieldName(errors.section_4),
    };
  }

  if (errors.section_5) {
    return {
      sectionId: "section_5",
      fieldName: getSection5ValidationFieldName(errors.section_5),
    };
  }

  if (errors.observaciones_generales) {
    return {
      sectionId: "section_6",
      fieldName: "observaciones_generales",
    };
  }

  if (errors.cargos_compatibles) {
    return {
      sectionId: "section_7",
      fieldName: "cargos_compatibles",
    };
  }

  if (errors.asistentes) {
    return {
      sectionId: "section_8",
      fieldName:
        getFirstNestedErrorPath(errors.asistentes, "asistentes") ??
        (hasFieldErrorMessage(errors.asistentes)
          ? "asistentes.1.nombre"
          : "asistentes.0.nombre"),
    };
  }

  return null;
}
