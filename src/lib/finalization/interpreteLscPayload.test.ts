import { describe, expect, it } from "vitest";

import { normalizeInterpreteLscValues } from "@/lib/interpreteLsc";
import {
  buildInterpreteLscCompletionPayloads,
  INTERPRETE_LSC_FORM_ID,
  INTERPRETE_LSC_FORM_NAME,
} from "@/lib/finalization/interpreteLscPayload";

function createEmpresa() {
  return {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno",
    nit_empresa: "9001",
    direccion_empresa: null,
    ciudad_empresa: null,
    sede_empresa: null,
    zona_empresa: null,
    correo_1: null,
    contacto_empresa: null,
    telefono_empresa: null,
    cargo: null,
    profesional_asignado: "Profesional RECA",
    correo_profesional: null,
    asesor: "Asesor Agencia",
    correo_asesor: null,
    caja_compensacion: "Compensar",
  };
}

describe("buildInterpreteLscCompletionPayloads", () => {
  it("builds raw, normalized and metadata payloads for ODS", () => {
    const formData = normalizeInterpreteLscValues(
      {
        fecha_visita: "2026-04-22",
        modalidad_interprete: "Mixta",
        modalidad_profesional_reca: "Virtual",
        nit_empresa: "9001",
        oferentes: [
          {
            nombre_oferente: "Ana Perez",
            cedula: "123",
            proceso: "Vinculacion",
          },
          {
            nombre_oferente: "Carlos Ruiz",
            cedula: "456",
            proceso: "Seguimiento",
          },
        ],
        interpretes: [
          {
            nombre: "Luis Mora",
            hora_inicial: "9",
            hora_final: "10:30",
          },
          {
            nombre: "Luis Mora",
            hora_inicial: "11:00",
            hora_final: "12:00",
          },
        ],
        sabana: {
          activo: true,
          horas: 1.5,
        },
        asistentes: [
          { nombre: "Profesional RECA", cargo: "Profesional RECA" },
          { nombre: "Invitado", cargo: "Talento humano" },
        ],
      },
      createEmpresa()
    );

    const result = buildInterpreteLscCompletionPayloads({
      actaRef: " ACTA-LSC-1 ",
      section1Data: {
        fecha_visita: "2026-04-22",
        modalidad_interprete: "Mixta",
        modalidad_profesional_reca: "Virtual",
        nombre_empresa: "Empresa Uno",
        ciudad_empresa: "Bogota",
        direccion_empresa: "Calle 1",
        nit_empresa: "9001",
        contacto_empresa: "Lider RRHH",
        cargo: "Coordinadora",
        asesor: "Asesor Agencia",
        sede_empresa: "Principal",
        profesional_asignado: "Profesional RECA",
        correo_profesional: "pro@example.com",
        correo_asesor: "asesor@example.com",
        caja_compensacion: "Compensar",
      },
      formData,
      asistentes: formData.asistentes,
      output: {
        sheetLink: "https://example.com/sheet",
        pdfLink: "https://example.com/pdf",
      },
      generatedAt: "2026-04-22T16:00:00.000Z",
      payloadSource: "manual",
    });

    expect(result.payloadRaw.form_id).toBe(INTERPRETE_LSC_FORM_ID);
    expect(result.payloadRaw.form_name).toBe(INTERPRETE_LSC_FORM_NAME);
    expect(result.payloadRaw.output).toEqual({
      sheetLink: "https://example.com/sheet",
      pdfLink: "https://example.com/pdf",
    });
    expect(result.payloadRaw.cache_snapshot).toMatchObject({
      section_1: {
        nombre_empresa: "Empresa Uno",
        modalidad_interprete: "Mixta",
        modalidad_profesional_reca: "Virtual",
      },
      section_3: {
        sumatoria_horas: "4:00",
        sabana: { activo: true, horas: 1.5 },
      },
    });

    expect(result.payloadNormalized.attachment).toEqual({
      document_kind: "lsc_interpretation",
      document_label: INTERPRETE_LSC_FORM_NAME,
      is_ods_candidate: true,
    });

    expect(result.payloadNormalized.parsed_raw).toMatchObject({
      nit_empresa: "9001",
      nombre_empresa: "Empresa Uno",
      fecha_servicio: "2026-04-22",
      nombre_profesional: "Profesional RECA",
      modalidad_servicio: "Virtual",
      modalidad_interprete: "Mixta",
      modalidad_profesional_reca: "Virtual",
      tipo_acta: "interprete_lsc",
      participantes: [
        {
          nombre_usuario: "Ana Perez",
          cedula_usuario: "123",
          proceso: "Vinculacion",
        },
        {
          nombre_usuario: "Carlos Ruiz",
          cedula_usuario: "456",
          proceso: "Seguimiento",
        },
      ],
      interpretes: [
        {
          nombre: "Luis Mora",
          hora_inicial: "09:00",
          hora_final: "10:30",
          total_tiempo: "1:30",
        },
        {
          nombre: "Luis Mora",
          hora_inicial: "11:00",
          hora_final: "12:00",
          total_tiempo: "1:00",
        },
      ],
      interpretes_nombres: ["Luis Mora"],
      sumatoria_horas: "4:00",
      sabana: { activo: true, horas: 1.5 },
      sheet_link: "https://example.com/sheet",
      pdf_link: "https://example.com/pdf",
    });

    expect(result.payloadMetadata).toEqual({
      generated_at: "2026-04-22T16:00:00.000Z",
      payload_source: "manual",
      acta_ref: "ACTA-LSC-1",
    });
    expect(result.payloadRaw.metadata).toEqual(result.payloadMetadata);
    expect(result.payloadNormalized.metadata).toEqual(result.payloadMetadata);
  });
});
