import { describe, expect, it, vi } from "vitest";
import { createEmptyEvaluacionValues } from "@/lib/evaluacion";
import {
  buildEvaluacionSheetMutation,
  EVALUACION_SECTION_8_BASE_ROWS,
  EVALUACION_SECTION_8_START_ROW,
  EVALUACION_SHEET_NAME,
} from "@/lib/finalization/evaluacionSheet";

describe("buildEvaluacionSheetMutation", () => {
  it("exports section 4 and section 5 fields while excluding deferred cells", () => {
    const formData = createEmptyEvaluacionValues({
      id: "empresa-1",
      nombre_empresa: "ACME SAS",
      nit_empresa: "900123456",
      direccion_empresa: "Calle 1",
      ciudad_empresa: "Bogota",
      sede_empresa: "Principal",
      zona_empresa: null,
      correo_1: "contacto@acme.com",
      contacto_empresa: "Laura",
      telefono_empresa: "3000000000",
      cargo: "Gerente",
      profesional_asignado: "Marta Ruiz",
      correo_profesional: null,
      asesor: "Carlos Ruiz",
      correo_asesor: null,
      caja_compensacion: "Compensar",
    });
    formData.section_4.nivel_accesibilidad = "Alto";
    formData.section_4.descripcion =
      "La empresa cuenta con un alto nivel de accesibilidad.";
    formData.section_4.justificacion_nivel_accesibilidad =
      "El profesional conserva Alto por evidencia complementaria.";
    formData.section_5.discapacidad_fisica.aplica = "Aplica";
    formData.section_5.discapacidad_fisica.nota =
      "Las instalaciones cuentan con accesos amplios y rampas conformes.";
    formData.section_5.discapacidad_fisica.ajustes =
      "Eliminar barreras arquitectónicas.";
    formData.observaciones_generales = "Observaciones";
    formData.cargos_compatibles = "Analista";

    const mutation = buildEvaluacionSheetMutation({
      section1Data: {
        fecha_visita: "2026-04-17",
        modalidad: "Presencial",
        nombre_empresa: "ACME SAS",
        ciudad_empresa: "Bogota",
        direccion_empresa: "Calle 1",
        nit_empresa: "900123456",
        correo_1: "contacto@acme.com",
        telefono_empresa: "3000000000",
        contacto_empresa: "Laura",
        cargo: "Gerente",
        caja_compensacion: "Compensar",
        sede_empresa: "Principal",
        asesor: "Carlos Ruiz",
        profesional_asignado: "Marta Ruiz",
        correo_profesional: "",
        correo_asesor: "",
      },
      formData,
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Carlos Ruiz", cargo: "Asesor Agencia" },
      ],
    });

    expect(mutation.writes).toEqual(
      expect.arrayContaining([
        {
          range: `'${EVALUACION_SHEET_NAME}'!M180`,
          value: "Alto",
        },
        {
          range: `'${EVALUACION_SHEET_NAME}'!Q180`,
          value: "La empresa cuenta con un alto nivel de accesibilidad.",
        },
        {
          range: `'${EVALUACION_SHEET_NAME}'!G186`,
          value: "Aplica",
        },
        {
          range: `'${EVALUACION_SHEET_NAME}'!A187`,
          value: formData.section_5.discapacidad_fisica.nota,
        },
        {
          range: `'${EVALUACION_SHEET_NAME}'!K186`,
          value: "Eliminar barreras arquitectónicas.",
        },
      ])
    );
    expect(
      mutation.writes.some(
        (write) =>
          write.range.endsWith("!W61") ||
          write.range.endsWith("!W62") ||
          write.range.endsWith("!W69")
        )
    ).toBe(false);
    expect(
      mutation.writes.some(
        (write) =>
          write.value ===
          "El profesional conserva Alto por evidencia complementaria."
      )
    ).toBe(false);
    expect(mutation.rowInsertions).toEqual([]);
    expect(mutation.hiddenRows).toEqual([]);
  });

  it("hides unused base attendee rows", () => {
    const formData = createEmptyEvaluacionValues(null);
    const mutation = buildEvaluacionSheetMutation({
      section1Data: {
        fecha_visita: "2026-04-17",
        modalidad: "Presencial",
        nombre_empresa: "ACME SAS",
        ciudad_empresa: "Bogota",
        direccion_empresa: "Calle 1",
        nit_empresa: "900123456",
        correo_1: "contacto@acme.com",
        telefono_empresa: "3000000000",
        contacto_empresa: "Laura",
        cargo: "Gerente",
        caja_compensacion: "Compensar",
        sede_empresa: "Principal",
        asesor: "Carlos Ruiz",
        profesional_asignado: "Marta Ruiz",
        correo_profesional: "",
        correo_asesor: "",
      },
      formData,
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
    });

    expect(mutation.hiddenRows).toEqual([
      {
        sheetName: EVALUACION_SHEET_NAME,
        startRow: EVALUACION_SECTION_8_START_ROW + 1,
        count: EVALUACION_SECTION_8_BASE_ROWS - 1,
      },
    ]);
  });

  it("warns when a registry path resolves to undefined instead of failing silently", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const formData = createEmptyEvaluacionValues(null) as Record<string, unknown>;
    delete formData.section_4;

    buildEvaluacionSheetMutation({
      section1Data: {
        fecha_visita: "2026-04-17",
        modalidad: "Presencial",
        nombre_empresa: "ACME SAS",
        ciudad_empresa: "Bogota",
        direccion_empresa: "Calle 1",
        nit_empresa: "900123456",
        correo_1: "contacto@acme.com",
        telefono_empresa: "3000000000",
        contacto_empresa: "Laura",
        cargo: "Gerente",
        caja_compensacion: "Compensar",
        sede_empresa: "Principal",
        asesor: "Carlos Ruiz",
        profesional_asignado: "Marta Ruiz",
        correo_profesional: "",
        correo_asesor: "",
      },
      formData: formData as never,
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Carlos Ruiz", cargo: "Asesor Agencia" },
      ],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[evaluacion.sheet_registry_missing_value]",
      expect.objectContaining({
        path: "section_4.nivel_accesibilidad",
        sheetCell: "M180",
      })
    );
    warnSpy.mockRestore();
  });
});
