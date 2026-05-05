import { EVALUACION_QUESTION_SECTION_IDS } from "@/lib/evaluacionSections";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

export type EvaluacionAccessibilitySummary = {
  counts: {
    si: number;
    no: number;
    parcial: number;
  };
  percentages: {
    si: number;
    no: number;
    parcial: number;
  };
  suggestion: "" | "Alto" | "Medio" | "Bajo";
};

export type EvaluacionAccessibilitySuggestion =
  EvaluacionAccessibilitySummary["suggestion"];

function normalizeEvaluacionCatalogKey(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLocaleLowerCase("es-CO")
    .trim();
}

export function normalizeEvaluacionAccessibleValue(value: unknown) {
  const normalized = normalizeEvaluacionCatalogKey(value);

  if (normalized === "si") {
    return "si" as const;
  }

  if (normalized === "no") {
    return "no" as const;
  }

  if (normalized === "parcial") {
    return "parcial" as const;
  }

  return "" as const;
}

export function calculateEvaluacionAccessibilitySummary(
  values:
    | Pick<
        EvaluacionValues,
        | "section_2_1"
        | "section_2_2"
        | "section_2_3"
        | "section_2_4"
        | "section_2_5"
        | "section_2_6"
        | "section_3"
      >
    | Partial<EvaluacionValues>
): EvaluacionAccessibilitySummary {
  const counts = {
    si: 0,
    no: 0,
    parcial: 0,
  };

  EVALUACION_QUESTION_SECTION_IDS.forEach((sectionId) => {
    const section = values[sectionId];
    if (!section || typeof section !== "object") {
      return;
    }

    Object.values(section as Record<string, unknown>).forEach((rawAnswer) => {
      if (!rawAnswer || typeof rawAnswer !== "object" || Array.isArray(rawAnswer)) {
        return;
      }

      const accessibleValue = normalizeEvaluacionAccessibleValue(
        (rawAnswer as Record<string, unknown>).accesible
      );

      if (accessibleValue) {
        counts[accessibleValue] += 1;
      }
    });
  });

  const total = counts.si + counts.no + counts.parcial;
  const percentages = {
    si: total ? (counts.si / total) * 100 : 0,
    no: total ? (counts.no / total) * 100 : 0,
    parcial: total ? (counts.parcial / total) * 100 : 0,
  };

  let suggestion: EvaluacionAccessibilitySummary["suggestion"] = "";
  if (total > 0) {
    if (percentages.si >= 86) {
      suggestion = "Alto";
    } else if (percentages.si >= 51) {
      suggestion = "Medio";
    } else if (percentages.si >= 1) {
      suggestion = "Bajo";
    }
  }

  return {
    counts,
    percentages,
    suggestion,
  };
}

export function deriveEvaluacionAccessibilityExplanation(
  summary: EvaluacionAccessibilitySummary
) {
  const suggestion = summary.suggestion;

  if (!suggestion) {
    return "Aun no hay criterios evaluados para sugerir un nivel de accesibilidad.";
  }

  const ranges: Record<Exclude<EvaluacionAccessibilitySuggestion, "">, string> = {
    Alto: "86% - 100%",
    Medio: "51% - 85%",
    Bajo: "1% - 50%",
  };

  return `Se sugiere ${suggestion} porque ${summary.percentages.si.toFixed(
    1
  )}% de los criterios evaluados quedaron como Si; el rango ${ranges[suggestion]} corresponde a ${suggestion}.`;
}
