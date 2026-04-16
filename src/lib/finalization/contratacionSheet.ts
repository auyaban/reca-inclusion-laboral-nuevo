import type { CellWrite, FormSheetMutation } from "@/lib/google/sheets";
import type { ContratacionSection1Data } from "@/lib/finalization/contratacionPayload";
import { normalizeGrupoEtnicoCual } from "@/lib/contratacion";
import type { ContratacionValues } from "@/lib/validations/contratacion";

export const CONTRATACION_SHEET_NAME = "5. CONTRATACI\u00d3N INCLUYENTE";
export const CONTRATACION_GROUP_EXPORT_TITLE_CELL = "F1";
export const CONTRATACION_DESARROLLO_ACTIVIDAD_CELL = "A15";
export const CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW = 16;
export const CONTRATACION_VINCULADO_BLOCK_HEIGHT = 52;
export const CONTRATACION_VINCULADO_SECOND_BLOCK_INSERT_INDEX =
  CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
  CONTRATACION_VINCULADO_BLOCK_HEIGHT -
  1;
export const CONTRATACION_SECTION_6_BASE_AJUSTES_ROW = 70;
export const CONTRATACION_SECTION_7_BASE_START_ROW = 75;
export const CONTRATACION_SECTION_7_BASE_ROWS = 4;

const SECTION_1_MAP = {
  fecha_visita: "D7",
  modalidad: "L7",
  nombre_empresa: "D8",
  ciudad_empresa: "L8",
  direccion_empresa: "D9",
  nit_empresa: "L9",
  correo_1: "D10",
  telefono_empresa: "L10",
  contacto_empresa: "D11",
  cargo: "L11",
  caja_compensacion: "D12",
  sede_empresa: "L12",
  asesor: "D13",
  profesional_asignado: "L13",
} as const satisfies Record<
  keyof Omit<
    ContratacionSection1Data,
    "correo_profesional" | "correo_asesor"
  >,
  string
>;

const VINCULADO_CELL_MAP = {
  numero: "A20",
  nombre_oferente: "C20",
  cedula: "H20",
  certificado_porcentaje: "K20",
  discapacidad: "L20",
  telefono_oferente: "O20",
  genero: "C21",
  correo_oferente: "G21",
  fecha_nacimiento: "M21",
  edad: "Q21",
  lgtbiq: "E22",
  grupo_etnico: "L22",
  grupo_etnico_cual: "O22",
  cargo_oferente: "C23",
  contacto_emergencia: "I23",
  parentesco: "M23",
  telefono_emergencia: "Q23",
  certificado_discapacidad: "F24",
  lugar_firma_contrato: "L24",
  fecha_firma_contrato: "Q24",
  tipo_contrato: "G26",
  fecha_fin: "N26",
  contrato_lee_nivel_apoyo: "G30",
  contrato_lee_observacion: "L30",
  contrato_lee_nota: "M31",
  contrato_comprendido_nivel_apoyo: "G32",
  contrato_comprendido_observacion: "L32",
  contrato_comprendido_nota: "M33",
  contrato_tipo_nivel_apoyo: "G34",
  contrato_tipo_observacion: "L34",
  contrato_tipo_contrato: "L35",
  contrato_jornada: "L36",
  contrato_clausulas: "L37",
  contrato_tipo_nota: "M38",
  condiciones_salariales_nivel_apoyo: "G39",
  condiciones_salariales_observacion: "L39",
  condiciones_salariales_frecuencia_pago: "L40",
  condiciones_salariales_forma_pago: "L41",
  condiciones_salariales_nota: "M42",
  prestaciones_cesantias_nivel_apoyo: "G45",
  prestaciones_cesantias_observacion: "L45",
  prestaciones_cesantias_nota: "M46",
  prestaciones_auxilio_transporte_nivel_apoyo: "G47",
  prestaciones_auxilio_transporte_observacion: "L47",
  prestaciones_auxilio_transporte_nota: "M48",
  prestaciones_prima_nivel_apoyo: "G49",
  prestaciones_prima_observacion: "L49",
  prestaciones_prima_nota: "M50",
  prestaciones_seguridad_social_nivel_apoyo: "G51",
  prestaciones_seguridad_social_observacion: "L51",
  prestaciones_seguridad_social_nota: "M52",
  prestaciones_vacaciones_nivel_apoyo: "G53",
  prestaciones_vacaciones_observacion: "L53",
  prestaciones_vacaciones_nota: "M54",
  prestaciones_auxilios_beneficios_nivel_apoyo: "G55",
  prestaciones_auxilios_beneficios_observacion: "L55",
  prestaciones_auxilios_beneficios_nota: "M56",
  conducto_regular_nivel_apoyo: "G59",
  conducto_regular_observacion: "L59",
  descargos_observacion: "L60",
  tramites_observacion: "L61",
  permisos_observacion: "L62",
  conducto_regular_nota: "M63",
  causales_fin_nivel_apoyo: "G64",
  causales_fin_observacion: "L64",
  causales_fin_nota: "M65",
  rutas_atencion_nivel_apoyo: "G66",
  rutas_atencion_observacion: "L66",
  rutas_atencion_nota: "M67",
} as const satisfies Record<keyof ContratacionValues["vinculados"][number], string>;

function cellRef(cell: string) {
  return `'${CONTRATACION_SHEET_NAME}'!${cell}`;
}

function toSheetValue(value: unknown) {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return String(value ?? "");
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

function buildGroupExportTitle(totalVinculados: number) {
  if (totalVinculados <= 1) {
    return "PROCESO DE CONTRATACION INCLUYENTE INDIVIDUAL";
  }

  if (totalVinculados <= 4) {
    return "PROCESO CONTRATACION INCLUYENTE GRUPAL - 2 A 4 VINCULADOS";
  }

  if (totalVinculados <= 7) {
    return "PROCESO CONTRATACION INCLUYENTE GRUPAL - 5 A 7 VINCULADOS";
  }

  if (totalVinculados <= 10) {
    return "PROCESO CONTRATACION INCLUYENTE GRUPAL - 8 A 10 VINCULADOS";
  }

  return "PROCESO CONTRATACION INCLUYENTE GRUPAL - MAS DE 10 VINCULADOS";
}

function buildVinculadoEntryWrites(
  row: ContratacionValues["vinculados"][number],
  rowOffset: number
) {
  const writes: CellWrite[] = [];

  for (const [fieldName, baseCell] of Object.entries(VINCULADO_CELL_MAP)) {
    const { column, row: baseRow } = parseCell(baseCell);
    const value =
      fieldName === "grupo_etnico_cual"
        ? normalizeGrupoEtnicoCual(row.grupo_etnico, row.grupo_etnico_cual)
        : row[fieldName as keyof typeof row];

    writes.push({
      range: cellRef(`${column}${baseRow + rowOffset}`),
      value: toSheetValue(value),
    });
  }

  return writes;
}

function buildAutoResizeExcludedRows(totalVinculados: number) {
  const excludedRows = new Set<number>();

  for (let index = 0; index < Math.max(1, totalVinculados); index += 1) {
    const blockStartRow =
      CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
      index * CONTRATACION_VINCULADO_BLOCK_HEIGHT;
    excludedRows.add(blockStartRow + 1);
    excludedRows.add(blockStartRow + 50);
    excludedRows.add(blockStartRow + 51);
  }

  return {
    [CONTRATACION_SHEET_NAME]: [...excludedRows].sort((left, right) => left - right),
  };
}

export function buildContratacionSheetMutation({
  section1Data,
  formData,
  asistentes,
}: {
  section1Data: ContratacionSection1Data;
  formData: ContratacionValues;
  asistentes: Array<{ nombre: string; cargo: string }>;
}): FormSheetMutation {
  const writes: CellWrite[] = [];
  const totalVinculados = Math.max(1, formData.vinculados.length);
  const sectionShift =
    (totalVinculados - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT;
  const asistentesStartRow = CONTRATACION_SECTION_7_BASE_START_ROW + sectionShift;

  appendMapWrites(writes, SECTION_1_MAP, section1Data);

  writes.push({
    range: cellRef(CONTRATACION_GROUP_EXPORT_TITLE_CELL),
    value: buildGroupExportTitle(totalVinculados),
  });
  writes.push({
    range: cellRef(CONTRATACION_DESARROLLO_ACTIVIDAD_CELL),
    value: formData.desarrollo_actividad,
  });

  formData.vinculados.forEach((row, index) => {
    writes.push(
      ...buildVinculadoEntryWrites(
        row,
        index * CONTRATACION_VINCULADO_BLOCK_HEIGHT
      )
    );
  });

  writes.push({
    range: cellRef(`A${CONTRATACION_SECTION_6_BASE_AJUSTES_ROW + sectionShift}`),
    value: formData.ajustes_recomendaciones,
  });

  asistentes.forEach((asistente, index) => {
    const row = asistentesStartRow + index;
    writes.push({
      range: cellRef(`C${row}`),
      value: asistente.nombre,
    });
    writes.push({
      range: cellRef(`K${row}`),
      value: asistente.cargo,
    });
  });

  const asistentesExtraRows = Math.max(
    0,
    asistentes.length - CONTRATACION_SECTION_7_BASE_ROWS
  );

  return {
    writes,
    templateBlockInsertions:
      totalVinculados > 1
        ? [
            {
              sheetName: CONTRATACION_SHEET_NAME,
              insertAtRow: CONTRATACION_VINCULADO_SECOND_BLOCK_INSERT_INDEX,
              templateStartRow: CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW,
              templateEndRow:
                CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
                CONTRATACION_VINCULADO_BLOCK_HEIGHT -
                1,
              repeatCount: totalVinculados - 1,
              copyRowHeights: true,
            },
          ]
        : [],
    rowInsertions:
      asistentesExtraRows > 0
        ? [
            {
              sheetName: CONTRATACION_SHEET_NAME,
              insertAtRow:
                asistentesStartRow + CONTRATACION_SECTION_7_BASE_ROWS - 1,
              count: asistentesExtraRows,
              templateRow:
                asistentesStartRow + CONTRATACION_SECTION_7_BASE_ROWS - 1,
            },
          ]
        : [],
    autoResizeExcludedRows: buildAutoResizeExcludedRows(totalVinculados),
  };
}
