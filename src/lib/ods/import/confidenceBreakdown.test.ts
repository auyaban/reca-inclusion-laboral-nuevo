import { describe, it, expect } from "vitest";
import { buildConfidenceBreakdown, confidenceToBadgeVariant, confidenceToLabel } from "@/lib/ods/import/confidenceBreakdown";
import type { DecisionSuggestion } from "@/lib/ods/rules-engine/rulesEngine";

describe("buildConfidenceBreakdown", () => {
  it("builds breakdown with codigo_servicio", () => {
    const suggestion: DecisionSuggestion = {
      codigo_servicio: "SENS-VIR-01",
      modalidad_servicio: "Virtual",
      valor_base: 50000,
      confidence: "high",
      rationale: ["Modalidad detectada directamente en el PDF."],
    };

    const breakdown = buildConfidenceBreakdown(suggestion);
    expect(breakdown.overall).toBe("high");
    expect(breakdown.subConfidences.length).toBe(3);
    expect(breakdown.subConfidences[0].label).toBe("Codigo de servicio");
    expect(breakdown.subConfidences[1].label).toBe("Modalidad");
    expect(breakdown.subConfidences[2].label).toBe("Valor base");
  });

  it("returns low overall when any sub-confidence is low", () => {
    const suggestion: DecisionSuggestion = {
      codigo_servicio: "SENS-VIR-01",
      modalidad_servicio: "Fuera de Bogota",
      confidence: "low",
      rationale: ["No fue posible inferir modalidad con suficiente confianza."],
    };

    const breakdown = buildConfidenceBreakdown(suggestion);
    expect(breakdown.overall).toBe("low");
  });

  it("falls back to General when no specific fields", () => {
    const suggestion: DecisionSuggestion = {
      confidence: "low",
      rationale: ["Sin informacion suficiente"],
    };

    const breakdown = buildConfidenceBreakdown(suggestion);
    expect(breakdown.subConfidences.length).toBe(1);
    expect(breakdown.subConfidences[0].label).toBe("General");
  });
});

describe("confidenceToBadgeVariant", () => {
  it("returns default for high", () => {
    expect(confidenceToBadgeVariant("high")).toBe("default");
  });
  it("returns secondary for medium", () => {
    expect(confidenceToBadgeVariant("medium")).toBe("secondary");
  });
  it("returns destructive for low", () => {
    expect(confidenceToBadgeVariant("low")).toBe("destructive");
  });
});

describe("confidenceToLabel", () => {
  it("returns Alta for high", () => {
    expect(confidenceToLabel("high")).toBe("Alta");
  });
  it("returns Media for medium", () => {
    expect(confidenceToLabel("medium")).toBe("Media");
  });
  it("returns Baja for low", () => {
    expect(confidenceToLabel("low")).toBe("Baja");
  });
});
