import type { CellWrite, FormSheetMutation } from "@/lib/google/sheets";
import type { FinalizationSection1Data } from "@/lib/finalization/routeHelpers";
import {
  INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS,
  type InduccionOrganizacionalSection3ItemId,
  type InduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";

export const INDUCCION_ORGANIZACIONAL_SHEET_NAME =
  "6. INDUCCIÓN ORGANIZACIONAL";

export const INDUCCION_ORGANIZACIONAL_SECTION_1_MAP = {
  fecha_visita: "D7",
  modalidad: "N7",
  nombre_empresa: "D8",
  ciudad_empresa: "N8",
  direccion_empresa: "D9",
  nit_empresa: "N9",
  correo_1: "D10",
  telefono_empresa: "N10",
  contacto_empresa: "D11",
  cargo: "N11",
  caja_compensacion: "D12",
  sede_empresa: "N12",
  asesor: "D13",
  profesional_asignado: "N13",
  correo_profesional: "D14",
  correo_asesor: "N14",
} as const satisfies Record<string, string>;

export const INDUCCION_ORGANIZACIONAL_SECTION_2_MAP = {
  numero: "A16",
  nombre_oferente: "B16",
  cedula: "H16",
  telefono_oferente: "M16",
  cargo_oferente: "P16",
} as const satisfies Record<string, string>;

export const INDUCCION_ORGANIZACIONAL_SECTION_3_FIRST_ROW = 21;
export const INDUCCION_ORGANIZACIONAL_SECTION_3_ROW_GAP = 0;
export const INDUCCION_ORGANIZACIONAL_SECTION_4_FIRST_ROW = 64;
export const INDUCCION_ORGANIZACIONAL_SECTION_5_ROW = 67;
export const INDUCCION_ORGANIZACIONAL_SECTION_5_TEXT_ROW = 68;
export const INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW = 71;
export const INDUCCION_ORGANIZACIONAL_SECTION_6_NOMBRE_COL = "C";
export const INDUCCION_ORGANIZACIONAL_SECTION_6_CARGO_COL = "L";
export const INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS = 4;

const SECTION_3_ITEM_ROW_MAP = Object.fromEntries(
  INDUCCION_ORGANIZACIONAL_SECTION_3_SUBSECTIONS.flatMap((group) =>
    group.items.map((item) => [item.id, item.row])
  )
) as Record<InduccionOrganizacionalSection3ItemId, number>;

const SECTION_3_COLUMNS = {
  visto: "H",
  responsable: "K",
  medio_socializacion: "M",
  descripcion: "P",
} as const;

const SECTION_4_COLUMNS = {
  medio: "A",
  recomendacion: "G",
} as const;

function cellRef(sheetName: string, cell: string) {
  return `'${sheetName}'!${cell}`;
}

function toSheetValue(value: unknown) {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return String(value ?? "");
}

function appendMapWrites<TData extends object>(
  writes: CellWrite[],
  sheetName: string,
  mapping: Record<string, string>,
  data: TData
) {
  const source = data as Record<string, unknown>;

  for (const [fieldName, cell] of Object.entries(mapping)) {
    writes.push({
      range: cellRef(sheetName, cell),
      value: toSheetValue(source[fieldName]),
    });
  }
}

function buildSection3Writes(
  sheetName: string,
  formData: InduccionOrganizacionalValues
) {
  const writes: CellWrite[] = [];

  for (const [itemId, row] of Object.entries(formData.section_3)) {
    const targetRow = SECTION_3_ITEM_ROW_MAP[itemId as keyof typeof SECTION_3_ITEM_ROW_MAP];
    if (!targetRow) {
      continue;
    }

    if (row.visto) {
      writes.push({
        range: cellRef(sheetName, `${SECTION_3_COLUMNS.visto}${targetRow}`),
        value: row.visto,
      });
    }

    if (row.responsable) {
      writes.push({
        range: cellRef(sheetName, `${SECTION_3_COLUMNS.responsable}${targetRow}`),
        value: row.responsable,
      });
    }

    if (row.medio_socializacion) {
      writes.push({
        range: cellRef(
          sheetName,
          `${SECTION_3_COLUMNS.medio_socializacion}${targetRow}`
        ),
        value: row.medio_socializacion,
      });
    }

    if (row.descripcion) {
      writes.push({
        range: cellRef(sheetName, `${SECTION_3_COLUMNS.descripcion}${targetRow}`),
        value: row.descripcion,
      });
    }
  }

  return writes;
}

function buildSection4Writes(
  sheetName: string,
  formData: InduccionOrganizacionalValues
) {
  const writes: CellWrite[] = [];

  formData.section_4.forEach((row, index) => {
    const targetRow = INDUCCION_ORGANIZACIONAL_SECTION_4_FIRST_ROW + index;
    if (row.medio) {
      writes.push({
        range: cellRef(sheetName, `${SECTION_4_COLUMNS.medio}${targetRow}`),
        value: row.medio,
      });
      writes.push({
        range: cellRef(
          sheetName,
          `${SECTION_4_COLUMNS.recomendacion}${targetRow}`
        ),
        value: row.recomendacion,
      });
    }
  });

  return writes;
}

function buildSection6Writes(
  sheetName: string,
  asistentes: Array<{ nombre: string; cargo: string }>
) {
  const writes: CellWrite[] = [];

  asistentes.forEach((asistente, index) => {
    const row = INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW + index;
    if (asistente.nombre) {
      writes.push({
        range: cellRef(sheetName, `${INDUCCION_ORGANIZACIONAL_SECTION_6_NOMBRE_COL}${row}`),
        value: asistente.nombre,
      });
    }

    if (asistente.cargo) {
      writes.push({
        range: cellRef(sheetName, `${INDUCCION_ORGANIZACIONAL_SECTION_6_CARGO_COL}${row}`),
        value: asistente.cargo,
      });
    }
  });

  return writes;
}

export function buildInduccionOrganizacionalSheetMutation({
  sheetName = INDUCCION_ORGANIZACIONAL_SHEET_NAME,
  section1Data,
  formData,
  asistentes,
}: {
  sheetName?: string;
  section1Data: FinalizationSection1Data;
  formData: InduccionOrganizacionalValues;
  asistentes: Array<{ nombre: string; cargo: string }>;
}): FormSheetMutation {
  const writes: CellWrite[] = [];

  appendMapWrites(writes, sheetName, INDUCCION_ORGANIZACIONAL_SECTION_1_MAP, section1Data);
  appendMapWrites(writes, sheetName, INDUCCION_ORGANIZACIONAL_SECTION_2_MAP, formData.vinculado);
  writes.push(...buildSection3Writes(sheetName, formData));
  writes.push(...buildSection4Writes(sheetName, formData));
  writes.push({
    range: cellRef(sheetName, `A${INDUCCION_ORGANIZACIONAL_SECTION_5_TEXT_ROW}`),
    value: formData.section_5.observaciones,
  });
  writes.push(...buildSection6Writes(sheetName, asistentes));

  const asistentesExtraRows = Math.max(
    0,
    asistentes.length - INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS
  );

  return {
    writes,
    rowInsertions:
      asistentesExtraRows > 0
        ? [
            {
              sheetName,
              insertAtRow:
                INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW +
                INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS -
                1,
              count: asistentesExtraRows,
              templateRow:
                INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW +
                INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS -
                1,
            },
          ]
        : [],
  };
}
