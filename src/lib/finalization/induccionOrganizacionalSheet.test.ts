import { describe, expect, it } from "vitest";
import {
  buildInduccionOrganizacionalSheetMutation,
  INDUCCION_ORGANIZACIONAL_SHEET_NAME,
  INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS,
  INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW,
} from "@/lib/finalization/induccionOrganizacionalSheet";
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

describe("buildInduccionOrganizacionalSheetMutation", () => {
  it("hides unused base attendee rows when fewer attendees are exported", () => {
    const mutation = buildInduccionOrganizacionalSheetMutation({
      section1Data: SECTION_1,
      formData: buildValidInduccionOrganizacionalValues(),
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
    });

    expect(mutation.rowInsertions).toEqual([]);
    expect(mutation.hiddenRows).toEqual([
      {
        sheetName: INDUCCION_ORGANIZACIONAL_SHEET_NAME,
        startRow: INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW + 1,
        count: INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS - 1,
      },
    ]);
  });

  it("writes section 1, single vinculado and the attendee block with row insertion", () => {
    const asistentes = [
      { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
      { nombre: "Laura Gomez", cargo: "Gerente" },
      { nombre: "Carlos Ruiz", cargo: "Asesor" },
      { nombre: "Andrea Torres", cargo: "Apoyo" },
      { nombre: "Julian Perez", cargo: "Observador" },
    ];

    const mutation = buildInduccionOrganizacionalSheetMutation({
      section1Data: SECTION_1,
      formData: buildValidInduccionOrganizacionalValues(),
      asistentes,
    });

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: INDUCCION_ORGANIZACIONAL_SHEET_NAME,
        insertAtRow:
          INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW +
          INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS -
          1,
        count: 1,
        templateRow:
          INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW +
          INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS -
          1,
      },
    ]);
    expect(mutation.hiddenRows).toEqual([]);
    expect(
      mutation.writes.find((write) => write.range.endsWith("!A16"))?.value
    ).toBe("1");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!A68"))?.value
    ).toBe("Observaciones amplias de la induccion organizacional.");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!A64"))?.value
    ).toBe("Video");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!G64"))?.value
    ).toContain("Subtitulos precisos");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!A66"))?.value
    ).toBe("No aplica");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!G66"))?.value
    ).toBe("No aplica");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!H21"))?.value
    ).toBe("Si");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!C71"))?.value
    ).toBe("Marta Ruiz");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!C75"))?.value
    ).toBe("Julian Perez");
  });
});
