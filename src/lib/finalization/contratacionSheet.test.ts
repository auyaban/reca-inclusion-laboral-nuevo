import { describe, expect, it } from "vitest";
import {
  buildContratacionSheetMutation,
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
      vinculados: [{ nombre_oferente: "Ana Perez" }, { nombre_oferente: "Juan Ruiz" }],
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
      mutation.writes.find((write) => write.range.endsWith("!A15"))?.value
    ).toBe("Actividad compartida");
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
      mutation.writes.find((write) => write.range.endsWith("!A122"))?.value
    ).toBe("Ajuste final");
    expect(
      mutation.writes.find((write) => write.range.endsWith("!C131"))?.value
    ).toBe("Ana Torres");
    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: CONTRATACION_SHEET_NAME,
        insertAtRow: 130,
        count: 1,
        templateRow: 130,
      },
    ]);
    expect(mutation.autoResizeExcludedRows).toEqual({
      [CONTRATACION_SHEET_NAME]: [17, 66, 67, 69, 118, 119],
    });
  });
});
