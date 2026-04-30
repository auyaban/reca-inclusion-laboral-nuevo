import { describe, it, expect } from "vitest";
import { rankSuggestions, top3Suggestions } from "@/lib/ods/import/rankedSuggestions";
import type { DecisionSuggestion } from "@/lib/ods/rules-engine/rulesEngine";

describe("rankSuggestions", () => {
  it("ranks single suggestion with rank 1", () => {
    const suggestions: DecisionSuggestion[] = [
      {
        codigo_servicio: "SENS-VIR-01",
        modalidad_servicio: "Virtual",
        valor_base: 50000,
        confidence: "high",
        rationale: ["Modalidad detectada directamente en el PDF."],
      },
    ];

    const ranked = rankSuggestions(suggestions);
    expect(ranked.length).toBe(1);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it("ranks multiple suggestions by score descending", () => {
    const suggestions: DecisionSuggestion[] = [
      {
        codigo_servicio: "SENS-VIR-01",
        confidence: "low",
        rationale: ["Low confidence"],
      },
      {
        codigo_servicio: "SENS-VIR-02",
        modalidad_servicio: "Virtual",
        valor_base: 60000,
        confidence: "high",
        rationale: ["High confidence", "Modalidad detectada", "Valor encontrado"],
      },
    ];

    const ranked = rankSuggestions(suggestions);
    expect(ranked.length).toBe(2);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});

describe("top3Suggestions", () => {
  it("returns at most 3 suggestions", () => {
    const suggestions: DecisionSuggestion[] = [
      { codigo_servicio: "A", confidence: "high", rationale: [] },
      { codigo_servicio: "B", confidence: "medium", rationale: [] },
      { codigo_servicio: "C", confidence: "low", rationale: [] },
      { codigo_servicio: "D", confidence: "low", rationale: [] },
      { codigo_servicio: "E", confidence: "low", rationale: [] },
    ];

    const top3 = top3Suggestions(suggestions);
    expect(top3.length).toBe(3);
    expect(top3[0].rank).toBe(1);
    expect(top3[1].rank).toBe(2);
    expect(top3[2].rank).toBe(3);
  });

  it("returns all when fewer than 3", () => {
    const suggestions: DecisionSuggestion[] = [
      { codigo_servicio: "A", confidence: "high", rationale: [] },
    ];

    const top3 = top3Suggestions(suggestions);
    expect(top3.length).toBe(1);
  });
});
