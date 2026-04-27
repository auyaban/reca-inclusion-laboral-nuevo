import { getMeaningfulAsistentes, isCompleteAsistente } from "@/lib/asistentes";
import type {
  InduccionOrganizacionalSection3GroupId,
  InduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";
import type { FieldErrors } from "react-hook-form";
import {
  getFirstErroredField,
  getFirstNestedErrorPath,
  getRepeatedArrayValidationFieldName,
} from "@/lib/validationNavigation";

export const INITIAL_INDUCCION_ORGANIZACIONAL_COLLAPSED_SECTIONS = {
  company: false,
  vinculado: false,
  desarrollo: false,
  recomendaciones: false,
  observaciones: false,
  asistentes: false,
} as const;

export const INDUCCION_ORGANIZACIONAL_SECTION_LABELS = {
  company: "Empresa",
  vinculado: "Vinculado",
  desarrollo: "Desarrollo de la induccion",
  recomendaciones: "Ajustes razonables",
  observaciones: "Observaciones",
  asistentes: "Asistentes",
} as const;

export type InduccionOrganizacionalSectionId =
  keyof typeof INDUCCION_ORGANIZACIONAL_SECTION_LABELS;

export const INDUCCION_ORGANIZACIONAL_COMPANY_REQUIRED_FIELDS = [
  "fecha_visita",
  "modalidad",
  "nit_empresa",
] as const satisfies readonly (keyof Pick<
  InduccionOrganizacionalValues,
  "fecha_visita" | "modalidad" | "nit_empresa"
>)[];

export function getInduccionOrganizacionalCompatStepForSection(
  sectionId: InduccionOrganizacionalSectionId
) {
  switch (sectionId) {
    case "company":
      return 0;
    case "vinculado":
      return 1;
    case "desarrollo":
      return 2;
    case "recomendaciones":
      return 3;
    case "observaciones":
      return 4;
    case "asistentes":
      return 5;
    default:
      return 0;
  }
}

export function getInduccionOrganizacionalSectionIdForStep(step: number) {
  if (step <= 0) {
    return "company";
  }
  if (step === 1) {
    return "vinculado";
  }
  if (step === 2) {
    return "desarrollo";
  }
  if (step === 3) {
    return "recomendaciones";
  }
  if (step === 4) {
    return "observaciones";
  }

  return "asistentes";
}

export function isInduccionOrganizacionalCompanySectionComplete(
  values: Pick<InduccionOrganizacionalValues, "fecha_visita" | "modalidad" | "nit_empresa">
) {
  return Boolean(values.fecha_visita && values.modalidad && values.nit_empresa);
}

export function isInduccionOrganizacionalVinculadoSectionComplete(
  values: InduccionOrganizacionalValues["vinculado"]
) {
  return Boolean(
    values.nombre_oferente &&
      values.cedula &&
      values.telefono_oferente &&
      values.cargo_oferente
  );
}

export function isInduccionOrganizacionalDevelopmentSectionComplete(
  values: InduccionOrganizacionalValues["section_3"]
) {
  return Object.values(values).every(
    (row) =>
      Boolean(row.visto && row.responsable && row.medio_socializacion && row.descripcion)
  );
}

export function isInduccionOrganizacionalRecommendationsSectionComplete(
  values: InduccionOrganizacionalValues["section_4"]
) {
  return values.length === 3 && values.every((row) => Boolean(row.medio));
}

export function isInduccionOrganizacionalObservacionesSectionComplete(
  values: InduccionOrganizacionalValues["section_5"] & {
    required?: boolean
  }
) {
  if (values.required !== true) {
    return true;
  }

  return Boolean(values.observaciones?.trim());
}

export function isInduccionOrganizacionalAttendeesSectionComplete(
  values: InduccionOrganizacionalValues["asistentes"]
) {
  return getMeaningfulAsistentes(values).some((asistente) =>
    isCompleteAsistente(asistente)
  );
}

export function getInduccionOrganizacionalValidationTarget(
  errors: FieldErrors<InduccionOrganizacionalValues>
):
  | {
      sectionId: InduccionOrganizacionalSectionId;
      fieldName: string;
    }
  | null {
  const companyField = getFirstErroredField(
    errors as Record<string, unknown>,
    INDUCCION_ORGANIZACIONAL_COMPANY_REQUIRED_FIELDS as readonly string[]
  );

  if (companyField) {
    return { sectionId: "company", fieldName: companyField };
  }

  if (errors.vinculado) {
    return {
      sectionId: "vinculado",
      fieldName:
        getFirstNestedErrorPath(errors.vinculado, "vinculado") ??
        "vinculado.nombre_oferente",
    };
  }

  if (errors.section_3) {
    return {
      sectionId: "desarrollo",
      fieldName:
        getFirstNestedErrorPath(errors.section_3, "section_3") ??
        "section_3.historia_empresa.visto",
    };
  }

  if (errors.section_4) {
    return {
      sectionId: "recomendaciones",
      fieldName:
        getFirstNestedErrorPath(errors.section_4, "section_4") ??
        "section_4.0.medio",
    };
  }

  if (errors.section_5) {
    return { sectionId: "observaciones", fieldName: "section_5.observaciones" };
  }

  if (errors.asistentes) {
    return {
      sectionId: "asistentes",
      fieldName: getRepeatedArrayValidationFieldName(
        errors.asistentes,
        "asistentes",
        "nombre"
      ),
    };
  }

  return null;
}

export function getInduccionOrganizacionalSection3GroupMeta() {
  return [
    { id: "3_1", title: "3.1 Generalidades de la empresa" },
    { id: "3_2", title: "3.2 Gestion Humana" },
    {
      id: "3_3",
      title: "3.3 Sistema de gestion - seguridad y salud en el trabajo (SG-SST)",
    },
    { id: "3_4", title: "3.4 Induccion general a puesto de trabajo" },
    { id: "3_5", title: "3.5 Proceso evaluativo de induccion" },
  ] as const satisfies readonly {
    id: InduccionOrganizacionalSection3GroupId;
    title: string;
  }[];
}
