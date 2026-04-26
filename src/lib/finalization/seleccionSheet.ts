import type { CellWrite, FormSheetMutation } from "@/lib/google/sheets";
import { buildUnusedAttendeeRowHides } from "@/lib/finalization/attendeeRows";
import type { SeleccionSection1Data } from "@/lib/finalization/seleccionPayload";
import { toDecimalSheetValue } from "@/lib/finalization/sheetValueFormat";
import type { SeleccionValues } from "@/lib/validations/seleccion";

export const SELECCION_SHEET_NAME = "4. SELECCIÓN INCLUYENTE";
export const SELECCION_GROUP_EXPORT_TITLE_CELL = "G1";
export const SELECCION_DESARROLLO_ACTIVIDAD_CELL = "A14";
export const SELECCION_OFERENTE_FIRST_BLOCK_START_ROW = 16;
export const SELECCION_OFERENTE_BLOCK_HEIGHT = 61;
export const SELECCION_OFERENTE_SECOND_BLOCK_INSERT_INDEX =
  SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
  SELECCION_OFERENTE_BLOCK_HEIGHT -
  1;
export const SELECCION_SECTION_5_BASE_AJUSTES_ROW = 78;
export const SELECCION_SECTION_5_BASE_NOTA_ROW = 79;
export const SELECCION_SECTION_6_BASE_START_ROW = 84;
export const SELECCION_SECTION_6_BASE_ROWS = 2;
export const SELECCION_SECTION_6_NOMBRE_COL = "E";
export const SELECCION_SECTION_6_CARGO_COL = "M";

const SECTION_1_MAP = {
  fecha_visita: "F7",
  modalidad: "N7",
  nombre_empresa: "F8",
  ciudad_empresa: "N8",
  direccion_empresa: "F9",
  nit_empresa: "N9",
  correo_1: "F10",
  telefono_empresa: "N10",
  contacto_empresa: "F11",
  cargo: "N11",
  asesor: "F12",
  sede_empresa: "N12",
} as const satisfies Record<
  | "fecha_visita"
  | "modalidad"
  | "nombre_empresa"
  | "ciudad_empresa"
  | "direccion_empresa"
  | "nit_empresa"
  | "correo_1"
  | "telefono_empresa"
  | "contacto_empresa"
  | "cargo"
  | "asesor"
  | "sede_empresa",
  string
>;

export const SELECCION_OFERENTE_CELL_MAP = {
  numero: "A19",
  nombre_oferente: "C19",
  cedula: "H19",
  certificado_porcentaje: "K19",
  discapacidad: "L19",
  telefono_oferente: "O19",
  resultado_certificado: "R19",
  cargo_oferente: "A21",
  nombre_contacto_emergencia: "F21",
  parentesco: "I21",
  telefono_emergencia: "K21",
  fecha_nacimiento: "N21",
  edad: "S21",
  pendiente_otros_oferentes: "G22",
  lugar_firma_contrato: "L22",
  fecha_firma_contrato: "R22",
  cuenta_pension: "I23",
  tipo_pension: "Q23",
  medicamentos_nivel_apoyo: "I27",
  medicamentos_conocimiento: "N27",
  medicamentos_horarios: "N28",
  medicamentos_nota: "O29",
  alergias_nivel_apoyo: "I30",
  alergias_tipo: "N30",
  alergias_nota: "O31",
  restriccion_nivel_apoyo: "I32",
  restriccion_conocimiento: "N32",
  restriccion_nota: "O33",
  controles_nivel_apoyo: "I34",
  controles_asistencia: "N34",
  controles_frecuencia: "N35",
  controles_nota: "O36",
  desplazamiento_nivel_apoyo: "I39",
  desplazamiento_modo: "N39",
  desplazamiento_transporte: "N40",
  desplazamiento_nota: "O41",
  ubicacion_nivel_apoyo: "I42",
  ubicacion_ciudad: "N42",
  ubicacion_aplicaciones: "N43",
  ubicacion_nota: "O44",
  dinero_nivel_apoyo: "I45",
  dinero_reconocimiento: "N45",
  dinero_manejo: "N46",
  dinero_medios: "N47",
  dinero_nota: "O48",
  presentacion_nivel_apoyo: "I49",
  presentacion_personal: "N49",
  presentacion_nota: "O50",
  comunicacion_escrita_nivel_apoyo: "I51",
  comunicacion_escrita_apoyo: "N51",
  comunicacion_escrita_nota: "O52",
  comunicacion_verbal_nivel_apoyo: "I53",
  comunicacion_verbal_apoyo: "N53",
  comunicacion_verbal_nota: "O54",
  decisiones_nivel_apoyo: "I55",
  toma_decisiones: "N55",
  toma_decisiones_nota: "O56",
  aseo_nivel_apoyo: "I57",
  alimentacion: "N57",
  aseo_criar_apoyo: "Q58",
  aseo_comunicacion_apoyo: "Q59",
  aseo_ayudas_apoyo: "Q60",
  aseo_alimentacion: "U58",
  aseo_movilidad_funcional: "U59",
  aseo_higiene_aseo: "U60",
  aseo_nota: "O61",
  instrumentales_nivel_apoyo: "I62",
  instrumentales_actividades: "N62",
  instrumentales_criar_apoyo: "Q63",
  instrumentales_finanzas: "U63",
  instrumentales_comunicacion_apoyo: "Q64",
  instrumentales_cocina_limpieza: "U64",
  instrumentales_movilidad_apoyo: "Q65",
  instrumentales_crear_hogar: "U65",
  instrumentales_salud_cuenta_apoyo: "U66",
  instrumentales_nota: "O67",
  actividades_nivel_apoyo: "I68",
  actividades_apoyo: "N68",
  actividades_esparcimiento_apoyo: "Q69",
  actividades_esparcimiento_cuenta_apoyo: "U69",
  actividades_complementarios_apoyo: "Q70",
  actividades_complementarios_cuenta_apoyo: "U70",
  actividades_subsidios_cuenta_apoyo: "U71",
  actividades_nota: "O72",
  discriminacion_nivel_apoyo: "I73",
  discriminacion: "N73",
  discriminacion_violencia_apoyo: "Q74",
  discriminacion_violencia_cuenta_apoyo: "U74",
  discriminacion_vulneracion_apoyo: "Q75",
  discriminacion_vulneracion_cuenta_apoyo: "U75",
  discriminacion_nota: "O76",
} as const satisfies Record<keyof SeleccionValues["oferentes"][number], string>;

function cellRef(cell: string) {
  return `'${SELECCION_SHEET_NAME}'!${cell}`;
}

function parseCell(cell: string) {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Celda invalida: ${cell}`);
  }

  return {
    column: match[1],
    row: Number(match[2]),
  };
}

function toSheetValue(value: unknown) {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return String(value ?? "");
}

function appendMapWrites<TData extends object>(
  writes: CellWrite[],
  mapping: Record<string, string>,
  data: TData
) {
  const source = data as Record<string, unknown>;

  for (const [fieldName, cell] of Object.entries(mapping)) {
    writes.push({
      range: cellRef(cell),
      value: toSheetValue(source[fieldName]),
    });
  }
}

function buildGroupExportTitle(totalOferentes: number) {
  if (totalOferentes <= 1) {
    return "PROCESO DE SELECCION INCLUYENTE INDIVIDUAL";
  }

  if (totalOferentes <= 4) {
    return "PROCESO DE SELECCION INCLUYENTE GRUPAL - 2 A 4 OFERENTES";
  }

  if (totalOferentes <= 7) {
    return "PROCESO DE SELECCION INCLUYENTE GRUPAL - 5 A 7 OFERENTES";
  }

  if (totalOferentes <= 10) {
    return "PROCESO DE SELECCION INCLUYENTE GRUPAL - 8 A 10 OFERENTES";
  }

  return "PROCESO DE SELECCION INCLUYENTE GRUPAL - MAS DE 10 OFERENTES";
}

function buildOferenteEntryWrites(
  row: SeleccionValues["oferentes"][number],
  rowOffset: number
) {
  const writes: CellWrite[] = [];

  for (const [fieldName, baseCell] of Object.entries(SELECCION_OFERENTE_CELL_MAP)) {
    const { column, row: baseRow } = parseCell(baseCell);
    const rawValue = row[fieldName as keyof typeof row];
    const value =
      fieldName === "certificado_porcentaje"
        ? toDecimalSheetValue(rawValue)
        : toSheetValue(rawValue);

    writes.push({
      range: cellRef(`${column}${baseRow + rowOffset}`),
      value,
    });
  }

  return writes;
}

function buildAutoResizeExcludedRows(totalOferentes: number) {
  const excludedRows = new Set<number>();

  for (let index = 0; index < Math.max(1, totalOferentes); index += 1) {
    const blockStartRow =
      SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
      index * SELECCION_OFERENTE_BLOCK_HEIGHT;
    excludedRows.add(blockStartRow + 1);
    excludedRows.add(blockStartRow + 60);
    excludedRows.add(blockStartRow + 61);
  }

  return {
    [SELECCION_SHEET_NAME]: [...excludedRows].sort((left, right) => left - right),
  };
}

export function buildSeleccionSheetMutation({
  section1Data,
  formData,
  asistentes,
}: {
  section1Data: SeleccionSection1Data;
  formData: SeleccionValues;
  asistentes: Array<{ nombre: string; cargo: string }>;
}): FormSheetMutation {
  const writes: CellWrite[] = [];
  const totalOferentes = Math.max(1, formData.oferentes.length);
  const sectionShift = (totalOferentes - 1) * SELECCION_OFERENTE_BLOCK_HEIGHT;
  const asistentesStartRow = SELECCION_SECTION_6_BASE_START_ROW + sectionShift;

  appendMapWrites(writes, SECTION_1_MAP, section1Data);

  writes.push({
    range: cellRef(SELECCION_GROUP_EXPORT_TITLE_CELL),
    value: buildGroupExportTitle(totalOferentes),
  });
  writes.push({
    range: cellRef(SELECCION_DESARROLLO_ACTIVIDAD_CELL),
    value: formData.desarrollo_actividad,
  });

  formData.oferentes.forEach((row, index) => {
    const rowOffset = index * SELECCION_OFERENTE_BLOCK_HEIGHT;
    writes.push({
      range: cellRef(`A${SELECCION_OFERENTE_FIRST_BLOCK_START_ROW + rowOffset}`),
      value: `OFERENTE ${index + 1}`,
    });
    writes.push(...buildOferenteEntryWrites(row, rowOffset));
  });

  writes.push({
    range: cellRef(`A${SELECCION_SECTION_5_BASE_AJUSTES_ROW + sectionShift}`),
    value: formData.ajustes_recomendaciones,
  });
  writes.push({
    range: cellRef(`A${SELECCION_SECTION_5_BASE_NOTA_ROW + sectionShift}`),
    value: `Nota: ${formData.nota}`,
  });

  asistentes.forEach((asistente, index) => {
    const row = asistentesStartRow + index;
    writes.push({
      range: cellRef(`${SELECCION_SECTION_6_NOMBRE_COL}${row}`),
      value: asistente.nombre,
    });
    writes.push({
      range: cellRef(`${SELECCION_SECTION_6_CARGO_COL}${row}`),
      value: asistente.cargo,
    });
  });

  const asistentesExtraRows = Math.max(
    0,
    asistentes.length - SELECCION_SECTION_6_BASE_ROWS
  );

  return {
    writes,
    templateBlockInsertions:
      totalOferentes > 1
        ? [
            {
              sheetName: SELECCION_SHEET_NAME,
              insertAtRow: SELECCION_OFERENTE_SECOND_BLOCK_INSERT_INDEX,
              templateStartRow: SELECCION_OFERENTE_FIRST_BLOCK_START_ROW,
              templateEndRow:
                SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
                SELECCION_OFERENTE_BLOCK_HEIGHT -
                1,
              repeatCount: totalOferentes - 1,
              copyRowHeights: true,
            },
          ]
        : [],
    rowInsertions:
      asistentesExtraRows > 0
        ? [
            {
              sheetName: SELECCION_SHEET_NAME,
              insertAtRow:
                asistentesStartRow + SELECCION_SECTION_6_BASE_ROWS - 1,
              count: asistentesExtraRows,
              templateRow:
                asistentesStartRow + SELECCION_SECTION_6_BASE_ROWS - 1,
            },
          ]
        : [],
    hiddenRows: buildUnusedAttendeeRowHides({
      sheetName: SELECCION_SHEET_NAME,
      startRow: asistentesStartRow,
      baseRows: SELECCION_SECTION_6_BASE_ROWS,
      usedRows: asistentes.length,
    }),
    autoResizeExcludedRows: buildAutoResizeExcludedRows(totalOferentes),
  };
}
