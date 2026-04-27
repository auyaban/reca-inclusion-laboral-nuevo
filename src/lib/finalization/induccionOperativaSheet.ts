import type { CellWrite, FormSheetMutation } from "@/lib/google/sheets";
import { buildUnusedAttendeeRowHides } from "@/lib/finalization/attendeeRows";
import type { InduccionOperativaSection1Data } from "@/lib/finalization/induccionOperativaPayload";
import type { InduccionOperativaValues } from "@/lib/validations/induccionOperativa";

export const INDUCCION_OPERATIVA_SHEET_NAME = "7. INDUCCI\u00d3N OPERATIVA";
export const INDUCCION_OPERATIVA_GROUP_EXPORT_TITLE_CELL = "G1";
export const INDUCCION_OPERATIVA_SECTION_3_START_ROW = 19;
export const INDUCCION_OPERATIVA_SECTION_4_START_ROW = 32;
export const INDUCCION_OPERATIVA_SECTION_5_START_ROW = 59;
export const INDUCCION_OPERATIVA_SECTION_6_CELL = "A63";
export const INDUCCION_OPERATIVA_SECTION_7_CELL = "G65";
export const INDUCCION_OPERATIVA_SECTION_8_CELL = "A67";
export const INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW = 71;
export const INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS = 4;

const SECTION_1_MAP = {
  fecha_visita: "E7",
  modalidad: "M7",
  nombre_empresa: "E8",
  ciudad_empresa: "M8",
  direccion_empresa: "E9",
  nit_empresa: "M9",
  correo_1: "E10",
  telefono_empresa: "M10",
  contacto_empresa: "E11",
  cargo: "M11",
  caja_compensacion: "E12",
  sede_empresa: "M12",
  asesor: "E13",
  profesional_asignado: "M13",
} as const satisfies Record<
  keyof Omit<InduccionOperativaSection1Data, "correo_profesional" | "correo_asesor">,
  string
>;

const SECTION_2_MAP = {
  numero: "A16",
  nombre_oferente: "B16",
  cedula: "H16",
  telefono_oferente: "M16",
  cargo_oferente: "P16",
} as const satisfies Record<keyof InduccionOperativaValues["vinculado"], string>;

const SECTION_3_ROW_MAP = [
  "funciones_corresponden_perfil",
  "explicacion_funciones",
  "instrucciones_claras",
  "sistema_medicion",
  "induccion_maquinas",
  "presentacion_companeros",
  "presentacion_jefes",
  "uso_epp",
  "conducto_regular",
  "puesto_trabajo",
  "otros",
] as const;

const SECTION_4_ITEM_ORDER = [
  "reconoce_instrucciones",
  "proceso_atencion",
  "identifica_funciones",
  "importancia_calidad",
  "relacion_companeros",
  "recibe_sugerencias",
  "objetivos_grupales",
  "reconoce_entorno",
  "ajuste_cambios",
  "identifica_problema_laboral",
  "respeto_companeros",
  "lenguaje_corporal",
  "reporte_novedades",
  "organiza_actividades",
  "cumple_horario",
  "identifica_horarios",
  "reporta_finalizacion",
] as const;

const SECTION_4_ROW_ORDER = [
  32, 33, 35, 36, 38, 39, 40, 42, 43, 45, 47, 48, 49, 51, 52, 53, 55,
] as const;

const SECTION_4_NOTE_ROWS = {
  comprension_instrucciones: 34,
  autonomia_tareas: 37,
  trabajo_equipo: 41,
  adaptacion_flexibilidad: 44,
  solucion_problemas: 46,
  comunicacion_asertiva: 50,
  manejo_tiempo: 54,
  iniciativa_proactividad: 56,
} as const;

const SECTION_5_MAP = {
  condiciones_medicas_salud: 59,
  habilidades_basicas_vida_diaria: 60,
  habilidades_socioemocionales: 61,
} as const;

function cellRef(cell: string) {
  return `'${INDUCCION_OPERATIVA_SHEET_NAME}'!${cell}`;
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

function buildSection3Writes(formData: InduccionOperativaValues) {
  return SECTION_3_ROW_MAP.flatMap((itemId, index) => [
    {
      range: cellRef(`H${INDUCCION_OPERATIVA_SECTION_3_START_ROW + index}`),
      value: formData.section_3[itemId].ejecucion,
    },
    {
      range: cellRef(`K${INDUCCION_OPERATIVA_SECTION_3_START_ROW + index}`),
      value: formData.section_3[itemId].observaciones,
    },
  ]);
}

function buildSection4Writes(formData: InduccionOperativaValues) {
  return SECTION_4_ITEM_ORDER.flatMap((itemId, index) => {
    const row = SECTION_4_ROW_ORDER[index] ?? SECTION_4_ROW_ORDER.at(-1)!;
    return [
      {
        range: cellRef(`J${row}`),
        value: formData.section_4.items[itemId].nivel_apoyo,
      },
      {
        range: cellRef(`N${row}`),
        value: formData.section_4.items[itemId].observaciones,
      },
    ];
  });
}

function buildAutoResizeExcludedRows(totalAttendees: number) {
  const excludedRows = new Set<number>([34, 37, 41, 44, 46, 50, 54, 56]);

  for (let index = 0; index < Math.max(1, totalAttendees); index += 1) {
    const blockStartRow =
      INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW +
      index * INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS;
    excludedRows.add(blockStartRow + 1);
    excludedRows.add(blockStartRow + 2);
  }

  return {
    [INDUCCION_OPERATIVA_SHEET_NAME]: [...excludedRows].sort(
      (left, right) => left - right
    ),
  };
}

export function buildInduccionOperativaSheetMutation({
  section1Data,
  formData,
  asistentes,
}: {
  section1Data: InduccionOperativaSection1Data;
  formData: InduccionOperativaValues;
  asistentes: Array<{ nombre: string; cargo: string }>;
}): FormSheetMutation {
  const writes: CellWrite[] = [];
  const totalAttendees = Math.max(1, asistentes.length);
  const attendeesStartRow = INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW;

  appendMapWrites(writes, SECTION_1_MAP, section1Data);

  writes.push({
    range: cellRef(INDUCCION_OPERATIVA_GROUP_EXPORT_TITLE_CELL),
    value: "PROCESO DE INDUCCION OPERATIVA",
  });

  appendMapWrites(writes, SECTION_2_MAP, formData.vinculado);
  writes.push(...buildSection3Writes(formData));
  writes.push(...buildSection4Writes(formData));

  Object.entries(SECTION_4_NOTE_ROWS).forEach(([blockId, row]) => {
    writes.push({
      range: cellRef(`B${row}`),
      value: formData.section_4.notes[blockId as keyof typeof SECTION_4_NOTE_ROWS],
    });
  });

  Object.entries(SECTION_5_MAP).forEach(([rowId, row]) => {
    writes.push({
      range: cellRef(`H${row}`),
      value: formData.section_5[rowId as keyof typeof SECTION_5_MAP].nivel_apoyo_requerido,
    });
    writes.push({
      range: cellRef(`M${row}`),
      value: formData.section_5[rowId as keyof typeof SECTION_5_MAP].observaciones,
    });
  });

  writes.push({ range: cellRef(INDUCCION_OPERATIVA_SECTION_6_CELL), value: formData.ajustes_requeridos });
  writes.push({
    range: cellRef(INDUCCION_OPERATIVA_SECTION_7_CELL),
    value: formData.fecha_primer_seguimiento,
  });
  writes.push({
    range: cellRef(INDUCCION_OPERATIVA_SECTION_8_CELL),
    value: formData.observaciones_recomendaciones,
  });

  asistentes.forEach((asistente, index) => {
    const row = attendeesStartRow + index;
    writes.push({
      range: cellRef(`C${row}`),
      value: asistente.nombre,
    });
    writes.push({
      range: cellRef(`L${row}`),
      value: asistente.cargo,
    });
  });

  const attendeesExtraRows = Math.max(
    0,
    asistentes.length - INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS
  );

  return {
    writes,
    templateBlockInsertions: [],
    rowInsertions:
      attendeesExtraRows > 0
        ? [
            {
              sheetName: INDUCCION_OPERATIVA_SHEET_NAME,
              insertAtRow:
                attendeesStartRow + INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS - 1,
              count: attendeesExtraRows,
              templateRow:
                attendeesStartRow + INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS - 1,
            },
          ]
        : [],
    hiddenRows: buildUnusedAttendeeRowHides({
      sheetName: INDUCCION_OPERATIVA_SHEET_NAME,
      startRow: attendeesStartRow,
      baseRows: INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS,
      usedRows: asistentes.length,
    }),
    autoResizeExcludedRows: buildAutoResizeExcludedRows(totalAttendees),
  };
}
