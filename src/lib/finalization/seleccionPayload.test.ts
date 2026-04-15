import { describe, expect, it } from "vitest";
import { buildSeleccionCompletionPayloads } from "@/lib/finalization/seleccionPayload";
import {
  buildValidSeleccionValues,
  SELECCION_TEST_EMPRESA,
} from "@/lib/testing/seleccionFixtures";

const SECTION_1 = {
  fecha_visita: "2026-04-15",
  modalidad: "Presencial",
  nombre_empresa: "ACME SAS",
  ciudad_empresa: "Bogota",
  direccion_empresa: "Calle 1 # 2-3",
  nit_empresa: "900123456",
  correo_1: "contacto@acme.com",
  telefono_empresa: "3000000000",
  contacto_empresa: "Laura Gomez",
  cargo: "Gerente",
  caja_compensacion: "Compensar",
  sede_empresa: "Principal",
  asesor: "Carlos Ruiz",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  correo_asesor: "carlos@reca.com",
};

describe("buildSeleccionCompletionPayloads", () => {
  it("copies desarrollo_actividad into each section_2 row for legacy-compatible payloads", () => {
    const result = buildSeleccionCompletionPayloads({
      section1Data: SECTION_1,
      formData: buildValidSeleccionValues(),
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      output: { sheetLink: "https://sheet.example", pdfLink: "https://pdf.example" },
      generatedAt: "2026-04-15T12:00:00.000Z",
      payloadSource: "form_web",
    });

    expect(result.payloadRaw.cache_snapshot.section_2[0]?.desarrollo_actividad).toBe(
      "Actividad compartida"
    );
    expect(result.payloadRaw.cache_snapshot.section_5.nota).toBe("Nota final");
    expect(result.payloadNormalized.attachment.document_kind).toBe(
      "seleccion_individual"
    );
    expect(result.payloadNormalized.parsed_raw.extra_name).toBe("Ana Perez");
  });

  it("uses the total count as extra_name for group payloads", () => {
    const formData = buildValidSeleccionValues({
      oferentes: [
        buildValidSeleccionValues().oferentes[0],
        { ...buildValidSeleccionValues().oferentes[0], numero: "2", nombre_oferente: "Juan Ruiz" },
      ],
    });

    const result = buildSeleccionCompletionPayloads({
      section1Data: {
        ...SECTION_1,
        nombre_empresa: SELECCION_TEST_EMPRESA.nombre_empresa,
      },
      formData,
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      output: { sheetLink: "https://sheet.example" },
      generatedAt: "2026-04-15T12:00:00.000Z",
      payloadSource: "form_web",
    });

    expect(result.payloadNormalized.attachment.document_kind).toBe(
      "seleccion_grupal"
    );
    expect(result.payloadNormalized.parsed_raw.extra_name).toBe("2");
  });
});
