import { describe, expect, it } from "vitest";
import { buildInduccionOrganizacionalCompletionPayloads } from "@/lib/finalization/induccionOrganizacionalPayload";
import { buildValidInduccionOrganizacionalValues } from "@/lib/testing/induccionOrganizacionalFixtures";

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

describe("buildInduccionOrganizacionalCompletionPayloads", () => {
  it("derives a single participant from the linked person and marks the attachment kind", () => {
    const result = buildInduccionOrganizacionalCompletionPayloads({
      actaRef: "A7K29QF2",
      section1Data: SECTION_1,
      formData: buildValidInduccionOrganizacionalValues(),
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      output: { sheetLink: "https://sheet.example", pdfLink: "https://pdf.example" },
      generatedAt: "2026-04-15T12:00:00.000Z",
      payloadSource: "form_web",
    });

    expect(result.payloadRaw.form_id).toBe("induccion_organizacional");
    expect(result.payloadNormalized.metadata.acta_ref).toBe("A7K29QF2");
    expect(result.payloadNormalized.attachment.document_kind).toBe(
      "organizational_induction"
    );
    expect(result.payloadNormalized.parsed_raw.participantes).toEqual([
      {
        nombre_usuario: "Ana Perez",
        cedula_usuario: "123456",
        cargo_servicio: "Analista",
      },
    ]);
    expect(result.payloadRaw.cache_snapshot.section_4[2]?.medio).toBe("No aplica");
  });
});
