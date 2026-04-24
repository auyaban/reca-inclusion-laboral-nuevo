import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";

export const DEFAULT_INTERPRETE_LSC_TEMPLATE_ID =
  "1WLAoc5lKHEoH3dkR1aQv6UYpEw97b9iNc2k43hCKrmk";

export function resolveFinalizationTemplateId(formSlug: FinalizationFormSlug) {
  if (formSlug === "interprete-lsc") {
    const configuredTemplateId = process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID?.trim();

    if (configuredTemplateId) {
      return configuredTemplateId;
    }

    if (process.env.NODE_ENV === "production") {
      return null;
    }

    return DEFAULT_INTERPRETE_LSC_TEMPLATE_ID;
  }

  return process.env.GOOGLE_SHEETS_MASTER_ID?.trim() || null;
}
