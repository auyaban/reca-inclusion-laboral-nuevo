import { describe, expect, it } from "vitest";
import {
  buildInduccionOperativaSheetMutation,
  INDUCCION_OPERATIVA_SHEET_NAME,
  INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS,
  INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW,
} from "@/lib/finalization/induccionOperativaSheet";
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
    asistentes: [
      { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
      { nombre: "Laura Gomez", cargo: "Gerente" },
      { nombre: "Carlos Ruiz", cargo: "Asesor" },
      { nombre: "Andrea Torres", cargo: "Apoyo" },
      { nombre: "Julian Perez", cargo: "Observador" },
    ],
  };
}

describe("buildInduccionOperativaSheetMutation", () => {
  it("hides unused base attendee rows when fewer attendees are exported", () => {
    const values = buildValidValues();
    const mutation = buildInduccionOperativaSheetMutation({
      section1Data: SECTION_1,
      formData: values,
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
    });

    expect(mutation.rowInsertions).toEqual([]);
    expect(mutation.hiddenRows).toEqual([
      {
        sheetName: INDUCCION_OPERATIVA_SHEET_NAME,
        startRow: INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW + 1,
        count: INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS - 1,
      },
    ]);
  });

  it("writes the linked person and attendee block with row insertion", () => {
    const values = buildValidValues();
    values.section_4.items.identifica_horarios = {
      nivel_apoyo: "2. Requiere apoyo intermitente.",
      observaciones: "2. Requiere recordatorios.",
    };
    values.section_4.items.reporta_finalizacion = {
      nivel_apoyo: "1. Requiere acompanamiento puntual.",
      observaciones: "1. Reporta con acompanamiento.",
    };
    values.section_4.notes.manejo_tiempo = "Nota manejo tiempo";
    values.section_4.notes.iniciativa_proactividad =
      "Nota iniciativa y proactividad";

    const mutation = buildInduccionOperativaSheetMutation({
      section1Data: SECTION_1,
      formData: values,
      asistentes: values.asistentes,
    });

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: INDUCCION_OPERATIVA_SHEET_NAME,
        insertAtRow:
          INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW +
          INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS -
          1,
        count: 1,
        templateRow:
          INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW +
          INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS -
          1,
      },
    ]);
    expect(mutation.hiddenRows).toEqual([]);
    expect(
      mutation.writes.find((write) => write.range.endsWith("!A16"))?.value
    ).toBe("1");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!C71"))?.value
    ).toBe("Marta Ruiz");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!C75"))?.value
    ).toBe("Julian Perez");
    expect(
      mutation.writes.some(
        (write) =>
          write.range.endsWith("!E14") || write.range.endsWith("!M14")
      )
    ).toBe(false);
    expect(
      mutation.writes.find((write) => write.range.endsWith("!J53"))?.value
    ).toBe("2. Requiere apoyo intermitente.");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!N53"))?.value
    ).toBe("2. Requiere recordatorios.");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!B54"))?.value
    ).toBe("Nota manejo tiempo");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!J55"))?.value
    ).toBe("1. Requiere acompanamiento puntual.");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!N55"))?.value
    ).toBe("1. Reporta con acompanamiento.");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!B56"))?.value
    ).toBe("Nota iniciativa y proactividad");
  });
});
