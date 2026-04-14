import { describe, expect, it } from "vitest";
import {
  buildFailedRawPayloadArtifact,
  buildUploadedRawPayloadArtifact,
  withRawPayloadArtifact,
} from "@/lib/finalization/payloads";
import { buildPresentacionCompletionPayloads } from "@/lib/finalization/presentacionPayload";
import { buildSensibilizacionCompletionPayloads } from "@/lib/finalization/sensibilizacionPayload";

const generatedAt = new Date("2026-04-11T15:00:00.000Z");

describe("completion payload adapters", () => {
  it("produce una base común entre presentacion y sensibilizacion", () => {
    const presentacion = buildPresentacionCompletionPayloads({
      tipoVisita: "Presentación",
      section1Data: {
        fecha_visita: "2026-04-11",
        modalidad: "Presencial",
        nit_empresa: "900123456",
        nombre_empresa: "Empresa Uno",
        direccion_empresa: "Calle 1",
        correo_1: "contacto@empresa.com",
        contacto_empresa: "Laura",
        caja_compensacion: "Compensar",
        profesional_asignado: "Ana Profesional",
        asesor: "Carlos Asesor",
        ciudad_empresa: "Bogotá",
        telefono_empresa: "1234567",
        cargo: "Gerencia",
        sede_empresa: "Centro",
        correo_profesional: "ana@reca.com",
        correo_asesor: "carlos@reca.com",
        tipo_visita: "Presentación",
      },
      motivacionSeleccionada: ["Responsabilidad Social Empresarial"],
      acuerdosObservaciones: "Se pacta seguimiento mensual.",
      asistentes: [
        { nombre: "Ana Profesional", cargo: "Profesional RECA" },
        { nombre: "Carlos Asesor", cargo: "Asesor Agencia" },
      ],
      output: {
        sheetLink: "https://sheet.example/presentacion",
        pdfLink: "https://pdf.example/presentacion",
      },
      generatedAt,
      payloadSource: "form_web",
    });

    const sensibilizacion = buildSensibilizacionCompletionPayloads({
      section1Data: {
        fecha_visita: "2026-04-11",
        modalidad: "Virtual",
        nombre_empresa: "Empresa Dos",
        ciudad_empresa: "Bogotá",
        direccion_empresa: "Carrera 2",
        nit_empresa: "900765432",
        correo_1: "rrhh@empresa.com",
        telefono_empresa: "7654321",
        contacto_empresa: "Mario",
        cargo: "RRHH",
        asesor: "Sofía Asesora",
        sede_empresa: "Norte",
        profesional_asignado: "Luisa Profesional",
        correo_profesional: "luisa@reca.com",
        correo_asesor: "sofia@reca.com",
        caja_compensacion: "Compensar",
      },
      observaciones: "La jornada tuvo buena recepción.",
      asistentes: [
        { nombre: "Luisa Profesional", cargo: "Profesional RECA" },
        { nombre: "Sofía Asesora", cargo: "Asesor Agencia" },
      ],
      output: {
        sheetLink: "https://sheet.example/sensibilizacion",
      },
      generatedAt,
      payloadSource: "form_web",
    });

    expect(presentacion.payloadRaw).toMatchObject({
      schema_version: 1,
      form_id: "presentacion_programa",
      form_name: "Presentación del Programa",
      output: {
        sheetLink: "https://sheet.example/presentacion",
        pdfLink: "https://pdf.example/presentacion",
      },
      metadata: {
        generated_at: "2026-04-11T15:00:00.000Z",
        payload_source: "form_web",
      },
    });

    expect(sensibilizacion.payloadRaw).toMatchObject({
      schema_version: 1,
      form_id: "sensibilizacion",
      form_name: "Sensibilizacion",
      output: {
        sheetLink: "https://sheet.example/sensibilizacion",
      },
      metadata: {
        generated_at: "2026-04-11T15:00:00.000Z",
        payload_source: "form_web",
      },
    });

    expect(presentacion.payloadNormalized.parsed_raw).toMatchObject({
      nit_empresa: "900123456",
      nombre_empresa: "Empresa Uno",
      modalidad_servicio: "Presencial",
      asistentes: ["Ana Profesional", "Carlos Asesor"],
      sheet_link: "https://sheet.example/presentacion",
      pdf_link: "https://pdf.example/presentacion",
      motivacion: ["Responsabilidad Social Empresarial"],
      acuerdos_observaciones: "Se pacta seguimiento mensual.",
      warnings: [],
    });

    expect(sensibilizacion.payloadNormalized.parsed_raw).toMatchObject({
      nit_empresa: "900765432",
      nombre_empresa: "Empresa Dos",
      modalidad_servicio: "Virtual",
      asistentes: ["Luisa Profesional", "Sofía Asesora"],
      sheet_link: "https://sheet.example/sensibilizacion",
      observaciones: "La jornada tuvo buena recepción.",
      warnings: [],
    });
    expect(sensibilizacion.payloadRaw.output).not.toHaveProperty("pdfLink");
    expect(sensibilizacion.payloadNormalized.parsed_raw).not.toHaveProperty(
      "pdf_link"
    );
  });

  it("filtra filas vacías de asistentes al normalizar payloads", () => {
    const sensibilizacion = buildSensibilizacionCompletionPayloads({
      section1Data: {
        fecha_visita: "2026-04-11",
        modalidad: "Virtual",
        nombre_empresa: "Empresa Dos",
        ciudad_empresa: "Bogotá",
        direccion_empresa: "Carrera 2",
        nit_empresa: "900765432",
        correo_1: "rrhh@empresa.com",
        telefono_empresa: "7654321",
        contacto_empresa: "Mario",
        cargo: "RRHH",
        asesor: "Sofía Asesora",
        sede_empresa: "Norte",
        profesional_asignado: "Luisa Profesional",
        correo_profesional: "luisa@reca.com",
        correo_asesor: "sofia@reca.com",
        caja_compensacion: "Compensar",
      },
      observaciones: "La jornada tuvo buena recepción.",
      asistentes: [
        { nombre: "Luisa Profesional", cargo: "Profesional RECA" },
        { nombre: " ", cargo: " " },
        { nombre: "Sofía Asesora", cargo: "Asesor Agencia" },
      ],
      output: {
        sheetLink: "https://sheet.example/sensibilizacion",
      },
      generatedAt,
      payloadSource: "form_web",
    });

    expect(
      sensibilizacion.payloadRaw.cache_snapshot.section_5
    ).toHaveLength(2);
    expect(sensibilizacion.payloadNormalized.parsed_raw.asistentes).toEqual([
      "Luisa Profesional",
      "Sofía Asesora",
    ]);
  });
});

describe("raw payload artifact metadata", () => {
  it("anexa metadata de artifacto exitoso solo en payload_normalized", () => {
    const presentacion = buildPresentacionCompletionPayloads({
      tipoVisita: "Presentación",
      section1Data: {
        fecha_visita: "2026-04-11",
        modalidad: "Presencial",
        nit_empresa: "900123456",
        nombre_empresa: "Empresa Uno",
        direccion_empresa: "Calle 1",
        correo_1: "contacto@empresa.com",
        contacto_empresa: "Laura",
        caja_compensacion: "Compensar",
        profesional_asignado: "Ana Profesional",
        asesor: "Carlos Asesor",
        ciudad_empresa: "Bogotá",
        telefono_empresa: "1234567",
        cargo: "Gerencia",
        sede_empresa: "Centro",
        correo_profesional: "ana@reca.com",
        correo_asesor: "carlos@reca.com",
        tipo_visita: "Presentación",
      },
      motivacionSeleccionada: [],
      acuerdosObservaciones: "Texto",
      asistentes: [],
      output: {
        sheetLink: "https://sheet.example/presentacion",
        pdfLink: "https://pdf.example/presentacion",
      },
      generatedAt,
      payloadSource: "form_web",
    });

    const artifact = buildUploadedRawPayloadArtifact({
      folderName: ".reca_payloads",
      fileId: "drive-file-id",
      webViewLink: "https://drive.example/file",
      fileName: "2026-04-11_10-00-00_presentacion_programa_uuid.json",
      uploadedAt: generatedAt,
    });

    const enriched = withRawPayloadArtifact(
      presentacion.payloadNormalized,
      artifact
    );

    expect(enriched.metadata.raw_payload_artifact).toEqual({
      storage: "google_drive",
      folder_name: ".reca_payloads",
      file_id: "drive-file-id",
      web_view_link: "https://drive.example/file",
      file_name: "2026-04-11_10-00-00_presentacion_programa_uuid.json",
      status: "uploaded",
      uploaded_at: "2026-04-11T15:00:00.000Z",
    });
    expect(presentacion.payloadRaw.metadata.raw_payload_artifact).toBeUndefined();
  });

  it("representa fallos sin meter el error crudo dentro del payload", () => {
    const artifact = buildFailedRawPayloadArtifact({
      folderName: ".reca_payloads",
      fileName: "2026-04-11_10-00-00_sensibilizacion_uuid.json",
    });

    expect(artifact).toEqual({
      storage: "google_drive",
      folder_name: ".reca_payloads",
      file_name: "2026-04-11_10-00-00_sensibilizacion_uuid.json",
      status: "failed",
    });
  });
});
