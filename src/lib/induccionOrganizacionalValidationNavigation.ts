import type { FieldErrors } from "react-hook-form";
import type { InduccionOrganizacionalValues } from "@/lib/induccionOrganizacional";
import {
  getInduccionOrganizacionalValidationTarget as getTargetFromSections,
  type InduccionOrganizacionalSectionId,
} from "@/lib/induccionOrganizacionalSections";

export type InduccionOrganizacionalValidationTarget = {
  sectionId: InduccionOrganizacionalSectionId;
  fieldName: string;
};

export function getInduccionOrganizacionalValidationTarget(
  errors: FieldErrors<InduccionOrganizacionalValues>
): InduccionOrganizacionalValidationTarget | null {
  return getTargetFromSections(errors);
}

