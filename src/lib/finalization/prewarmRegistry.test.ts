import { describe, expect, it } from "vitest";
import { FINALIZATION_FORM_SLUGS } from "@/lib/finalization/formSlugs";
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

  it("uses canonical presentacion variants and deterministic signatures", () => {
    const hint = buildPrewarmHintForForm({
      formSlug: "presentacion",
      formData: {
        tipo_visita: "Reactivación",
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
      },
      provisionalName: "BORRADOR - REACTIVACION",
    });

    expect(hint).toEqual({
      bundleKey: "reactivacion",
      structureSignature:
        '{"asistentesCount":1,"variantKey":"reactivacion"}',
      variantKey: "reactivacion",
      repeatedCounts: { asistentes: 1 },
      provisionalName: "BORRADOR - REACTIVACION",
    });
    expect(getPrewarmActiveSheetName("presentacion", hint)).toBe(
      "1.2 REACTIVACIÓN DEL PROGRAMA IL"
    );
    expect(getPrewarmBundleSheetNames("presentacion", hint)).toEqual([
      "1.2 REACTIVACIÓN DEL PROGRAMA IL",
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

  it("covers all finalization slugs with a typed registry entry", () => {
    const formDataBySlug = {
      presentacion: {
        tipo_visita: "Presentación",
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
      },
      sensibilizacion: {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
      },
      seleccion: {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
        oferentes: [{ nombre_oferente: "Ana Perez" }],
      },
      contratacion: {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
        vinculados: [{ nombre_oferente: "Ana Perez" }],
      },
      "condiciones-vacante": {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
        discapacidades: [{ discapacidad: "Visual" }],
      },
      evaluacion: {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
      },
      "induccion-organizacional": {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
      },
      "induccion-operativa": {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
      },
    } as const;

    for (const formSlug of FINALIZATION_FORM_SLUGS) {
      const hint = buildPrewarmHintForForm({
        formSlug,
        formData: formDataBySlug[formSlug],
        provisionalName: `BORRADOR - ${formSlug}`,
      });

      const activeSheetName = getPrewarmActiveSheetName(formSlug, hint);
      const bundleSheetNames = getPrewarmBundleSheetNames(formSlug, hint);
      const mutation = buildStructuralMutationForForm(formSlug, hint);

      expect(activeSheetName).toBeTruthy();
      expect(bundleSheetNames).toContain(activeSheetName);
      expect(mutation.writes).toEqual([]);
    }
  });
});
