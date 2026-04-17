import { describe, expect, it } from "vitest";
import { buildInduccionOperativaCompletionPayloads } from "@/lib/finalization/induccionOperativaPayload";
import {
  INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_4_BLOCKS,
  INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_5_ROWS,
  type InduccionOperativaValues,
} from "@/lib/induccionOperativa";

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

function buildValidValues(): InduccionOperativaValues {
  const section3 = Object.fromEntries(
    Object.keys(INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS).map((itemId) => [
      itemId,
      { ejecucion: "Si", observaciones: "Observacion" },
    ])
  ) as InduccionOperativaValues["section_3"];

  const section4Items = Object.fromEntries(
    Object.keys(INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS).map((itemId) => [
      itemId,
      { nivel_apoyo: "0. No requiere apoyo.", observaciones: "0. Cumple autonomamente." },
    ])
  ) as InduccionOperativaValues["section_4"]["items"];

  const section4Notes = Object.fromEntries(
    INDUCCION_OPERATIVA_SECTION_4_BLOCKS.map((block) => [block.id, "Nota"])
  ) as InduccionOperativaValues["section_4"]["notes"];

  const section5 = Object.fromEntries(
    INDUCCION_OPERATIVA_SECTION_5_ROWS.map((row) => [
      row.id,
      { nivel_apoyo_requerido: "0. No requiere apoyo.", observaciones: "Observacion" },
    ])
  ) as InduccionOperativaValues["section_5"];

  return {
    fecha_visita: "2026-04-15",
    modalidad: "Presencial",
    nit_empresa: "900123456",
    vinculado: {
      numero: "1",
      nombre_oferente: "Ana Perez",
      cedula: "123456",
      telefono_oferente: "3001234567",
      cargo_oferente: "Analista",
    },
    section_3: section3,
    section_4: { items: section4Items, notes: section4Notes },
    section_5: section5,
    ajustes_requeridos: "Ajustes requeridos",
    fecha_primer_seguimiento: "2026-04-20",
    observaciones_recomendaciones: "Observaciones amplias",
    asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
  };
}

describe("buildInduccionOperativaCompletionPayloads", () => {
  it("derives a single participant from the linked person", () => {
    const result = buildInduccionOperativaCompletionPayloads({
      actaRef: "A7K29QF2",
      section1Data: SECTION_1,
      formData: buildValidValues(),
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      output: { sheetLink: "https://sheet.example", pdfLink: "https://pdf.example" },
      generatedAt: "2026-04-15T12:00:00.000Z",
      payloadSource: "form_web",
    });

    expect(result.payloadRaw.form_id).toBe("induccion_operativa");
    expect(result.payloadNormalized.metadata.acta_ref).toBe("A7K29QF2");
    expect(result.payloadNormalized.attachment.document_kind).toBe(
      "operational_induction"
    );
    expect(result.payloadNormalized.parsed_raw.participantes).toEqual([
      {
        nombre_usuario: "Ana Perez",
        cedula_usuario: "123456",
        cargo_servicio: "Analista",
      },
    ]);
    expect(result.payloadRaw.cache_snapshot.section_9).toEqual([
      { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
    ]);
  });
});
