import { describe, expect, it } from "vitest";
import { normalizeEvaluacionCatalogText } from "@/lib/evaluacionCatalogText";
import {
  EVALUACION_COMPANY_FIELD_DESCRIPTORS,
  EVALUACION_QUESTION_DESCRIPTORS,
  EVALUACION_SECTION_LABELS,
} from "@/lib/evaluacionSections";

describe("normalizeEvaluacionCatalogText", () => {
  it("normalizes known catalog drift tokens across nested structures", () => {
    const normalized = normalizeEvaluacionCatalogText({
      title: "Selecci?n",
      labels: ["Descripci?n", "pestana"],
      nested: {
        sheet: "EVALUACI?N",
        note: "condiciÃ³n",
      },
    });

    expect(normalized).toEqual({
      title: "Selección",
      labels: ["Descripción", "pestaña"],
      nested: {
        sheet: "EVALUACIÓN",
        note: "condición",
      },
    });
  });

  it("leaves already-correct catalog text unchanged", () => {
    expect(normalizeEvaluacionCatalogText("pestaña")).toBe("pestaña");
    expect(
      normalizeEvaluacionCatalogText("Evaluación de accesibilidad")
    ).toBe("Evaluación de accesibilidad");
  });

  it("keeps the live evaluacion catalog readable after normalization", () => {
    expect(Object.values(EVALUACION_SECTION_LABELS).join(" ")).not.toMatch(/[ÃÂ]/);
    expect(
      EVALUACION_COMPANY_FIELD_DESCRIPTORS.map((field) => field.label).join(" ")
    ).not.toMatch(/[ÃÂ?]/);

    const bathroomQuestion = EVALUACION_QUESTION_DESCRIPTORS.find(
      (question) => question.id === "bano_discapacidad_fisica"
    );

    expect(bathroomQuestion?.label).not.toMatch(/[ÃÂ]/);
    expect(
      bathroomQuestion?.fields.find((field) => field.key === "quinary")?.label
    ).toBe("Selección 5");
  });
});
