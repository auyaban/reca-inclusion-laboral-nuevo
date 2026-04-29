import type { DecisionSuggestion } from "@/lib/ods/rules-engine/rulesEngine";

export type ConfidenceBreakdown = {
  overall: "low" | "medium" | "high";
  subConfidences: {
    label: string;
    confidence: "low" | "medium" | "high";
    detail: string;
  }[];
};

export function buildConfidenceBreakdown(suggestion: DecisionSuggestion): ConfidenceBreakdown {
  const subConfidences: ConfidenceBreakdown["subConfidences"] = [];

  if (suggestion.codigo_servicio) {
    subConfidences.push({
      label: "Codigo de servicio",
      confidence: suggestion.confidence,
      detail: suggestion.rationale.join(" "),
    });
  }

  if (suggestion.modalidad_servicio) {
    const modalidadConfidence =
      suggestion.modalidad_servicio === "Virtual" ? "high" : suggestion.confidence;
    subConfidences.push({
      label: "Modalidad",
      confidence: modalidadConfidence,
      detail: `Modalidad detectada: ${suggestion.modalidad_servicio}`,
    });
  }

  if (suggestion.valor_base != null && suggestion.valor_base > 0) {
    subConfidences.push({
      label: "Valor base",
      confidence: suggestion.confidence,
      detail: `Valor base: $${suggestion.valor_base.toLocaleString("es-CO")}`,
    });
  }

  if (subConfidences.length === 0) {
    subConfidences.push({
      label: "General",
      confidence: suggestion.confidence,
      detail: suggestion.rationale.join(" ") || "Sin informacion suficiente",
    });
  }

  const confidenceOrder = { high: 3, medium: 2, low: 1 } as const;
  const minConfidence = subConfidences.reduce(
    (min, sc) => (confidenceOrder[sc.confidence] < confidenceOrder[min] ? sc.confidence : min),
    "high" as "low" | "medium" | "high",
  );

  return {
    overall: minConfidence,
    subConfidences,
  };
}

export function confidenceToBadgeVariant(confidence: "low" | "medium" | "high"): string {
  switch (confidence) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "destructive";
  }
}

export function confidenceToLabel(confidence: "low" | "medium" | "high"): string {
  switch (confidence) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
  }
}
