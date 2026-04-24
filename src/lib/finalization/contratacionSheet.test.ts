import { describe, expect, it } from "vitest";
import {
  buildContratacionSheetMutation,
  CONTRATACION_DESARROLLO_ACTIVIDAD_CELL,
  CONTRATACION_SECTION_6_BASE_AJUSTES_ROW,
  CONTRATACION_SECTION_7_BASE_ROWS,
  CONTRATACION_SECTION_7_BASE_START_ROW,
  CONTRATACION_SHEET_NAME,
  CONTRATACION_VINCULADO_BLOCK_HEIGHT,
  CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW,
} from "@/lib/finalization/contratacionSheet";
import { normalizeContratacionValues } from "@/lib/contratacion";

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

describe("buildContratacionSheetMutation", () => {
  it("duplicates the vinculado block when there are multiple vinculados", () => {
    const formData = normalizeContratacionValues({
      fecha_visita: "2026-04-15",
      modalidad: "Presencial",
      nit_empresa: "900123456",
      desarrollo_actividad: "Actividad compartida",
      ajustes_recomendaciones: "Ajuste final",
      vinculados: [
        {
          nombre_oferente: "Ana Perez",
          certificado_porcentaje: "45%",
          grupo_etnico: "Si",
          grupo_etnico_cual: "No aplica",
        },
        { nombre_oferente: "Juan Ruiz" },
      ],
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
    });

    const mutation = buildContratacionSheetMutation({
      section1Data: SECTION_1,
      formData,
      asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
    });

    expect(mutation.templateBlockInsertions).toEqual([
      {
        sheetName: CONTRATACION_SHEET_NAME,
        insertAtRow:
          CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
          CONTRATACION_VINCULADO_BLOCK_HEIGHT -
          1,
        templateStartRow: CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW,
        templateEndRow:
          CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
          CONTRATACION_VINCULADO_BLOCK_HEIGHT -
          1,
        repeatCount: 1,
        copyRowHeights: true,
      },
    ]);
    expect(
      mutation.writes.find((write) =>
        write.range.endsWith(`!${CONTRATACION_DESARROLLO_ACTIVIDAD_CELL}`)
      )?.value
    ).toBe("Actividad compartida");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!O22"))?.value
    ).toBe("No aplica");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!K20"))?.value
    ).toBe(45);
  });

  it("shifts ajustes and attendees after the repeated blocks and inserts extra attendee rows", () => {
    const formData = normalizeContratacionValues({
      fecha_visita: "2026-04-15",
      modalidad: "Presencial",
      nit_empresa: "900123456",
      desarrollo_actividad: "Actividad compartida",
      ajustes_recomendaciones: "Ajuste final",
      vinculados: [{ nombre_oferente: "Ana Perez" }, { nombre_oferente: "Juan Ruiz" }],
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Laura Gomez", cargo: "Gerente" },
        { nombre: "Carlos Ruiz", cargo: "Asesor" },
        { nombre: "Juan Perez", cargo: "Coordinador" },
        { nombre: "Ana Torres", cargo: "Psicologa" },
      ],
    });

    const mutation = buildContratacionSheetMutation({
      section1Data: SECTION_1,
      formData,
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Laura Gomez", cargo: "Gerente" },
        { nombre: "Carlos Ruiz", cargo: "Asesor" },
        { nombre: "Juan Perez", cargo: "Coordinador" },
        { nombre: "Ana Torres", cargo: "Psicologa" },
      ],
    });

    expect(
      mutation.writes.find((write) =>
        write.range.endsWith(
          `!A${CONTRATACION_SECTION_6_BASE_AJUSTES_ROW + (2 - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT}`
        )
      )?.value
    ).toBe("Ajuste final");
    expect(
      mutation.writes.find((write) =>
        write.range.endsWith(
          `!C${
            CONTRATACION_SECTION_7_BASE_START_ROW +
            (2 - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT +
            CONTRATACION_SECTION_7_BASE_ROWS +
            0
          }`
        )
      )?.value
    ).toBe("Ana Torres");
    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: CONTRATACION_SHEET_NAME,
        insertAtRow:
          CONTRATACION_SECTION_7_BASE_START_ROW +
          (2 - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT +
          CONTRATACION_SECTION_7_BASE_ROWS -
          1,
        count: 1,
        templateRow:
          CONTRATACION_SECTION_7_BASE_START_ROW +
          (2 - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT,
      },
    ]);
    expect(mutation.autoResizeExcludedRows).toEqual({
      [CONTRATACION_SHEET_NAME]: [
        17,
        66,
        67,
        CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
          CONTRATACION_VINCULADO_BLOCK_HEIGHT +
          1,
        CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
          CONTRATACION_VINCULADO_BLOCK_HEIGHT +
          50,
        CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
          CONTRATACION_VINCULADO_BLOCK_HEIGHT +
          51,
      ],
    });
  });

  it("reanchors attendee overflow to the first reusable attendee row for high vinculado counts", () => {
    const formData = normalizeContratacionValues({
      fecha_visita: "2026-04-15",
      modalidad: "Presencial",
      nit_empresa: "900123456",
      desarrollo_actividad: "Actividad compartida",
      ajustes_recomendaciones: "Ajuste final",
      vinculados: Array.from({ length: 6 }, (_, index) => ({
        nombre_oferente: `Vinculado ${index + 1}`,
      })),
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Laura Gomez", cargo: "Gerente" },
        { nombre: "Carlos Ruiz", cargo: "Asesor" },
        { nombre: "Juan Perez", cargo: "Coordinador" },
        { nombre: "Ana Torres", cargo: "Psicologa" },
      ],
    });

    const mutation = buildContratacionSheetMutation({
      section1Data: SECTION_1,
      formData,
      asistentes: [
        { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
        { nombre: "Laura Gomez", cargo: "Gerente" },
        { nombre: "Carlos Ruiz", cargo: "Asesor" },
        { nombre: "Juan Perez", cargo: "Coordinador" },
        { nombre: "Ana Torres", cargo: "Psicologa" },
      ],
    });

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: CONTRATACION_SHEET_NAME,
        insertAtRow:
          CONTRATACION_SECTION_7_BASE_START_ROW +
          (6 - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT +
          CONTRATACION_SECTION_7_BASE_ROWS -
          1,
        count: 1,
        templateRow:
          CONTRATACION_SECTION_7_BASE_START_ROW +
          (6 - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT,
      },
    ]);
  });
});
