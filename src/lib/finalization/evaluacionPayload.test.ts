import { describe, expect, it } from "vitest";
import { createEmptyEvaluacionValues } from "@/lib/evaluacion";
import {
  buildEvaluacionCompletionPayloads,
  EVALUACION_FORM_ID,
  EVALUACION_FORM_NAME,
} from "@/lib/finalization/evaluacionPayload";

describe("buildEvaluacionCompletionPayloads", () => {
  it("builds a sheet-only completion payload with full cache snapshot", () => {
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
    formData.observaciones_generales = "Observaciones";
    formData.cargos_compatibles = "Analista";

    const result = buildEvaluacionCompletionPayloads({
      actaRef: "ABC12345",
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
      output: {
        sheetLink: "https://docs.google.com/spreadsheets/d/demo/edit",
      },
      generatedAt: "2026-04-17T12:00:00.000Z",
      payloadSource: "form_web",
    });

    expect(result.payloadRaw.form_id).toBe(EVALUACION_FORM_ID);
    expect(result.payloadRaw.form_name).toBe(EVALUACION_FORM_NAME);
    expect(result.payloadRaw.output).toEqual({
      sheetLink: "https://docs.google.com/spreadsheets/d/demo/edit",
    });
    expect(result.payloadRaw.cache_snapshot).toEqual(
      expect.objectContaining({
        section_1: expect.any(Object),
        section_5: formData.section_5,
        section_8: [
          { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
          { nombre: "Carlos Ruiz", cargo: "Asesor Agencia" },
        ],
      })
    );
    expect(result.payloadNormalized.parsed_raw).toEqual(
      expect.objectContaining({
        nivel_accesibilidad: "Alto",
        descripcion_accesibilidad:
          "La empresa cuenta con un alto nivel de accesibilidad.",
        sheet_link: "https://docs.google.com/spreadsheets/d/demo/edit",
      })
    );
    expect("pdfLink" in result.payloadRaw.output).toBe(false);
  });
});
