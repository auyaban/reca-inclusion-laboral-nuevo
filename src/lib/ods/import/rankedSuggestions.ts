import type { DecisionSuggestion } from "@/lib/ods/rules-engine/rulesEngine";

export type RankedSuggestion = DecisionSuggestion & {
  rank: number;
  score: number;
};

const CONFIDENCE_SCORES = { high: 3, medium: 2, low: 1 } as const;

export function rankSuggestions(suggestions: DecisionSuggestion[]): RankedSuggestion[] {
  const scored = suggestions.map((s) => {
    let score = CONFIDENCE_SCORES[s.confidence] * 10;

    if (s.codigo_servicio) score += 5;
    if (s.modalidad_servicio) score += 3;
    if (s.valor_base != null && s.valor_base > 0) score += 2;
    if (s.observaciones) score += 1;
    if (s.rationale.length > 2) score += 1;

    return { ...s, score, rank: 0 };
  });

  scored.sort((a, b) => b.score - a.score);

  scored.forEach((s, i) => {
    s.rank = i + 1;
  });

  return scored;
}

export function top3Suggestions(suggestions: DecisionSuggestion[]): RankedSuggestion[] {
  return rankSuggestions(suggestions).slice(0, 3);
}
