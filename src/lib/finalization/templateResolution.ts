import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";

export const DEFAULT_INTERPRETE_LSC_TEMPLATE_ID =
  "1WLAoc5lKHEoH3dkR1aQv6UYpEw97b9iNc2k43hCKrmk";

export function resolveFinalizationTemplateId(formSlug: FinalizationFormSlug) {
  if (formSlug === "interprete-lsc") {
    return (
      process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID?.trim() ||
      DEFAULT_INTERPRETE_LSC_TEMPLATE_ID
    );
  }

  return process.env.GOOGLE_SHEETS_MASTER_ID?.trim() || null;
}
