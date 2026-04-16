import { describe, expect, it } from "vitest";
import {
  buildSeleccionSheetMutation,
  SELECCION_DESARROLLO_ACTIVIDAD_CELL,
  SELECCION_OFERENTE_BLOCK_HEIGHT,
  SELECCION_OFERENTE_FIRST_BLOCK_START_ROW,
  SELECCION_SECTION_5_BASE_AJUSTES_ROW,
  SELECCION_SECTION_5_BASE_NOTA_ROW,
  SELECCION_SECTION_6_BASE_ROWS,
  SELECCION_SECTION_6_BASE_START_ROW,
  SELECCION_SHEET_NAME,
} from "@/lib/finalization/seleccionSheet";
import { buildValidSeleccionValues } from "@/lib/testing/seleccionFixtures";

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

describe("buildSeleccionSheetMutation", () => {
  it("duplicates the oferente block when there are multiple oferentes", () => {
    const formData = buildValidSeleccionValues({
      oferentes: [
        buildValidSeleccionValues().oferentes[0],
        {
          ...buildValidSeleccionValues().oferentes[0],
          numero: "2",
          nombre_oferente: "Juan Ruiz",
        },
      ],
    });

    const mutation = buildSeleccionSheetMutation({
      section1Data: SECTION_1,
      formData,
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
    });

    expect(mutation.templateBlockInsertions).toEqual([
      {
        sheetName: SELECCION_SHEET_NAME,
        insertAtRow:
          SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
          SELECCION_OFERENTE_BLOCK_HEIGHT -
          1,
        templateStartRow: SELECCION_OFERENTE_FIRST_BLOCK_START_ROW,
        templateEndRow:
          SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
          SELECCION_OFERENTE_BLOCK_HEIGHT -
          1,
        repeatCount: 1,
        copyRowHeights: true,
      },
    ]);
    expect(
      mutation.writes.find((write) =>
        write.range.endsWith(`!${SELECCION_DESARROLLO_ACTIVIDAD_CELL}`)
      )?.value
    ).toBe("Actividad compartida");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!A77"))?.value
    ).toBe("OFERENTE 2");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!K19"))?.value
    ).toBe(45);
  });

  it("shifts section_5 and attendees after the repeated blocks and inserts extra attendee rows", () => {
    const formData = buildValidSeleccionValues({
      oferentes: [
        buildValidSeleccionValues().oferentes[0],
        { ...buildValidSeleccionValues().oferentes[0], numero: "2", nombre_oferente: "Juan Ruiz" },
      ],
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Laura Gomez", cargo: "Gerente" },
        { nombre: "Carlos Ruiz", cargo: "Asesor" },
      ],
    });

    const mutation = buildSeleccionSheetMutation({
      section1Data: SECTION_1,
      formData,
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Laura Gomez", cargo: "Gerente" },
        { nombre: "Carlos Ruiz", cargo: "Asesor" },
      ],
    });

    expect(
      mutation.writes.find((write) =>
        write.range.endsWith(
          `!A${SELECCION_SECTION_5_BASE_AJUSTES_ROW + SELECCION_OFERENTE_BLOCK_HEIGHT}`
        )
      )?.value
    ).toBe("Ajuste final");
    expect(
      mutation.writes.find((write) =>
        write.range.endsWith(
          `!A${SELECCION_SECTION_5_BASE_NOTA_ROW + SELECCION_OFERENTE_BLOCK_HEIGHT}`
        )
      )?.value
    ).toBe("Nota: Nota final");
    expect(
      mutation.writes.find((write) =>
        write.range.endsWith(
          `!E${
            SELECCION_SECTION_6_BASE_START_ROW +
            SELECCION_OFERENTE_BLOCK_HEIGHT +
            SELECCION_SECTION_6_BASE_ROWS
          }`
        )
      )?.value
    ).toBe("Carlos Ruiz");
    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: SELECCION_SHEET_NAME,
        insertAtRow:
          SELECCION_SECTION_6_BASE_START_ROW +
          SELECCION_OFERENTE_BLOCK_HEIGHT +
          SELECCION_SECTION_6_BASE_ROWS -
          1,
        count: 1,
        templateRow:
          SELECCION_SECTION_6_BASE_START_ROW +
          SELECCION_OFERENTE_BLOCK_HEIGHT +
          SELECCION_SECTION_6_BASE_ROWS -
          1,
      },
    ]);
    expect(mutation.autoResizeExcludedRows).toEqual({
      [SELECCION_SHEET_NAME]: [
        17,
        76,
        77,
        SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
          SELECCION_OFERENTE_BLOCK_HEIGHT +
          1,
        SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
          SELECCION_OFERENTE_BLOCK_HEIGHT +
          60,
        SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
          SELECCION_OFERENTE_BLOCK_HEIGHT +
          61,
      ],
    });
  });
});
