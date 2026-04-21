import { describe, expect, it } from "vitest";
import {
  buildPrewarmHintForForm,
  buildStructuralMutationForForm,
  getPrewarmActiveSheetName,
  getPrewarmBundleSheetNames,
} from "@/lib/finalization/prewarmRegistry";

describe("prewarm registry domain helpers", () => {
  it("builds an evaluacion hint with the fotos sheet bundle", () => {
    const hint = buildPrewarmHintForForm({
      formSlug: "evaluacion",
      formData: {
        asistentes: [{ nombre: "Ana Perez" }],
      },
      provisionalName: "BORRADOR - EVALUACION",
    });

    expect(hint).toEqual({
      bundleKey: "evaluacion",
      structureSignature: '{"asistentesCount":1}',
      variantKey: "default",
      repeatedCounts: { asistentes: 1 },
      provisionalName: "BORRADOR - EVALUACION",
    });
    expect(getPrewarmActiveSheetName("evaluacion", hint)).toBe(
      "2. EVALUACIÓN DE ACCESIBILIDAD"
    );
    expect(getPrewarmBundleSheetNames("evaluacion", hint)).toEqual([
      "2. EVALUACIÓN DE ACCESIBILIDAD",
      "2.1 EVALUACION FOTOS",
    ]);
  });

  it("builds structural mutation rows for presentacion attendees", () => {
    const hint = buildPrewarmHintForForm({
      formSlug: "presentacion",
      formData: {
        tipo_visita: "Presentación",
        asistentes: [
          { nombre: "Ana Perez", cargo: "Lider" },
          { nombre: "Luis Diaz", cargo: "Analista" },
          { nombre: "Maria Ruiz", cargo: "Gestora" },
          { nombre: "Juan Toro", cargo: "Apoyo" },
        ],
      },
      provisionalName: "BORRADOR - PRESENTACION",
    });

    const mutation = buildStructuralMutationForForm("presentacion", hint);

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: "1. PRESENTACIÓN DEL PROGRAMA IL",
        insertAtRow: 77,
        count: 1,
        templateRow: 77,
      },
    ]);
    expect(mutation.checkboxValidations).toHaveLength(1);
  });
});
