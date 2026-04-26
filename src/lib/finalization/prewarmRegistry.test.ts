import { describe, expect, it } from "vitest";
import { FINALIZATION_FORM_SLUGS } from "@/lib/finalization/formSlugs";
import {
  buildPrewarmHintForForm,
  buildStructuralMutationForForm,
  getPrewarmActiveSheetName,
  getPrewarmBundleSheetNames,
  getPrewarmSupportSheetNames,
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
    expect(mutation.hiddenRows).toEqual([]);
    expect(mutation.checkboxValidations).toHaveLength(1);
  });

  it("builds structural hidden rows for unused attendee slots", () => {
    const hint = buildPrewarmHintForForm({
      formSlug: "induccion-organizacional",
      formData: {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
      },
      provisionalName: "BORRADOR - INDUCCION",
    });

    expect(buildStructuralMutationForForm("induccion-organizacional", hint).hiddenRows).toEqual([
      {
        sheetName: "6. INDUCCIÓN ORGANIZACIONAL",
        startRow: 72,
        count: 3,
      },
    ]);
  });

  it("registers interprete-lsc on Maestro with overflow-based signatures only", () => {
    const hint = buildPrewarmHintForForm({
      formSlug: "interprete-lsc",
      formData: {
        oferentes: Array.from({ length: 8 }, (_, index) => ({
          nombre_oferente: `Oferente ${index + 1}`,
          cedula: `${index + 1}`,
          proceso: `Proceso ${index + 1}`,
        })),
        interpretes: [
          { nombre: "Interprete 1", hora_inicial: "08:00", hora_final: "10:00" },
          { nombre: "Interprete 2", hora_inicial: "10:00", hora_final: "11:00" },
        ],
        asistentes: [
          { nombre: "A1", cargo: "Profesional RECA" },
          { nombre: "A2", cargo: "Apoyo" },
          { nombre: "A3", cargo: "Apoyo" },
        ],
      },
      provisionalName: "BORRADOR - INTERPRETE LSC",
    });

    expect(hint).toEqual({
      bundleKey: "interprete-lsc",
      structureSignature:
        '{"asistentesOverflow":1,"interpretesOverflow":1,"oferentesOverflow":1}',
      variantKey: "default",
      repeatedCounts: {
        asistentes: 3,
        interpretes: 2,
        oferentes: 8,
      },
      provisionalName: "BORRADOR - INTERPRETE LSC",
    });
    expect(getPrewarmActiveSheetName("interprete-lsc", hint)).toBe("Maestro");
    expect(getPrewarmBundleSheetNames("interprete-lsc", hint)).toEqual([
      "Maestro",
    ]);
    const mutation = buildStructuralMutationForForm("interprete-lsc", hint);
    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: "Maestro",
        insertAtRow: 18,
        count: 1,
        templateRow: 18,
      },
      {
        sheetName: "Maestro",
        insertAtRow: 20,
        count: 1,
        templateRow: 20,
      },
      {
        sheetName: "Maestro",
        insertAtRow: 28,
        count: 1,
        templateRow: 27,
      },
    ]);
    expect(mutation.hiddenRows).toBeUndefined();
    expect(getPrewarmSupportSheetNames("interprete-lsc")).toEqual([]);
  });
  it("keeps seleccion attendees aligned with the first reusable row in prewarm", () => {
    const hint = buildPrewarmHintForForm({
      formSlug: "seleccion",
      formData: {
        asistentes: [
          { nombre: "Ana Perez", cargo: "Lider" },
          { nombre: "Luis Diaz", cargo: "Analista" },
          { nombre: "Maria Ruiz", cargo: "Apoyo" },
        ],
        oferentes: [
          { nombre_oferente: "Oferente 1" },
          { nombre_oferente: "Oferente 2" },
        ],
      },
      provisionalName: "BORRADOR - SELECCION",
    });

    expect(buildStructuralMutationForForm("seleccion", hint).rowInsertions).toEqual([
      {
        sheetName: "4. SELECCIÓN INCLUYENTE",
        insertAtRow: 146,
        count: 1,
        templateRow: 145,
      },
    ]);
  });

  it("keeps contratacion attendees aligned with the first reusable row in prewarm", () => {
    const hint = buildPrewarmHintForForm({
      formSlug: "contratacion",
      formData: {
        asistentes: [
          { nombre: "Ana Perez", cargo: "Lider" },
          { nombre: "Luis Diaz", cargo: "Analista" },
          { nombre: "Maria Ruiz", cargo: "Apoyo" },
          { nombre: "Juan Toro", cargo: "Apoyo" },
          { nombre: "Sara Gil", cargo: "Apoyo" },
        ],
        vinculados: [
          { nombre_oferente: "Vinculado 1" },
          { nombre_oferente: "Vinculado 2" },
        ],
      },
      provisionalName: "BORRADOR - CONTRATACION",
    });

    expect(buildStructuralMutationForForm("contratacion", hint).rowInsertions).toEqual([
      {
        sheetName: "5. CONTRATACIÓN INCLUYENTE",
        insertAtRow: 130,
        count: 1,
        templateRow: 127,
      },
    ]);
  });
  it("keeps Caracterizacion support sheets for audited forms and removes them for condiciones-vacante", () => {
    expect(getPrewarmSupportSheetNames("evaluacion")).toEqual([
      "Caracterización",
    ]);
    expect(getPrewarmSupportSheetNames("condiciones-vacante")).toEqual([]);
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
      "interprete-lsc": {
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
        oferentes: [{ nombre_oferente: "Ana Perez", cedula: "123", proceso: "Ruta" }],
        interpretes: [{ nombre: "Interprete 1", hora_inicial: "08:00", hora_final: "10:00" }],
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
