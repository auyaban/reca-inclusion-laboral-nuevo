import type { FormSheetMutation, CellWrite } from "@/lib/google/sheets";
import { buildUnusedAttendeeRowHides } from "@/lib/finalization/attendeeRows";
import type { CondicionesVacanteSection1Data } from "@/lib/finalization/condicionesVacantePayload";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";

export const CONDICIONES_VACANTE_SHEET_NAME =
  "3. REVISI\u00d3N DE LAS CONDICIONES DE LA VACANTE";

export const CONDICIONES_VACANTE_SECTION_6_START_ROW = 150;
export const CONDICIONES_VACANTE_SECTION_6_BASE_ROWS = 4;
export const CONDICIONES_VACANTE_SECTION_7_CONTENT_BASE_ROW = 156;
export const CONDICIONES_VACANTE_SECTION_8_START_BASE_ROW = 158;
export const CONDICIONES_VACANTE_SECTION_8_BASE_ROWS = 3;

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
  caja_compensacion: "F12",
  sede_empresa: "N12",
  asesor: "F13",
  profesional_asignado: "N13",
} as const satisfies Record<keyof Omit<
  CondicionesVacanteSection1Data,
  "correo_profesional" | "correo_asesor"
>, string>;

const SECTION_2_MAP = {
  nombre_vacante: "I15",
  numero_vacantes: "I16",
  nivel_cargo: "I17",
  genero: "I18",
  edad: "I19",
  modalidad_trabajo: "I20",
  lugar_trabajo: "I21",
  salario_asignado: "I22",
  firma_contrato: "I23",
  aplicacion_pruebas: "I24",
  tipo_contrato: "I25",
  beneficios_adicionales: "I26",
  cargo_flexible_genero: "I27",
  beneficios_mujeres: "I28",
  requiere_certificado: "I29",
  requiere_certificado_observaciones: "M29",
} as const satisfies Record<
  | "nombre_vacante"
  | "numero_vacantes"
  | "nivel_cargo"
  | "genero"
  | "edad"
  | "modalidad_trabajo"
  | "lugar_trabajo"
  | "salario_asignado"
  | "firma_contrato"
  | "aplicacion_pruebas"
  | "tipo_contrato"
  | "beneficios_adicionales"
  | "cargo_flexible_genero"
  | "beneficios_mujeres"
  | "requiere_certificado"
  | "requiere_certificado_observaciones",
  string
>;

const SECTION_2_COMPETENCIAS_CELLS = [
  "I30",
  "L30",
  "I31",
  "L31",
  "I32",
  "L32",
  "I33",
  "L33",
] as const;

const SECTION_2_1_MAP = {
  nivel_primaria: "G36",
  nivel_bachiller: "L36",
  nivel_tecnico_profesional: "R36",
  nivel_profesional: "G37",
  nivel_especializacion: "L37",
  nivel_tecnologo: "R37",
  especificaciones_formacion: "I39",
  conocimientos_basicos: "I40",
  horarios_asignados: "I42",
  hora_ingreso: "I43",
  hora_salida: "I44",
  tiempo_almuerzo: "I45",
  break_descanso: "I46",
  dias_laborables: "I47",
  dias_flexibles: "I48",
  observaciones: "I49",
  experiencia_meses: "I50",
  funciones_tareas: "A53",
  herramientas_equipos: "A56",
} as const;

const SECTION_3_MAP = {
  lectura: "L61",
  comprension_lectora: "L62",
  escritura: "L63",
  comunicacion_verbal: "L64",
  razonamiento_logico: "L65",
  conteo_reporte: "L66",
  clasificacion_objetos: "L67",
  velocidad_ejecucion: "L68",
  concentracion: "L69",
  memoria: "L70",
  ubicacion_espacial: "L71",
  atencion: "L72",
  observaciones_cognitivas: "E73",
  agarre: "L77",
  precision: "L78",
  digitacion: "L79",
  agilidad_manual: "L80",
  coordinacion_ojo_mano: "L81",
  observaciones_motricidad_fina: "E82",
  esfuerzo_fisico: "L86",
  equilibrio_corporal: "L87",
  lanzar_objetos: "L88",
  observaciones_motricidad_gruesa: "E89",
  seguimiento_instrucciones: "L93",
  resolucion_conflictos: "L94",
  autonomia_tareas: "L95",
  trabajo_equipo: "L96",
  adaptabilidad: "L97",
  flexibilidad: "L98",
  comunicacion_asertiva: "L99",
  manejo_tiempo: "L100",
  liderazgo: "L101",
  escucha_activa: "L102",
  proactividad: "L103",
  observaciones_transversales: "E104",
} as const;

const SECTION_4_MAP = {
  sentado_tiempo: "H108",
  sentado_frecuencia: "L108",
  semisentado_tiempo: "H109",
  semisentado_frecuencia: "L109",
  de_pie_tiempo: "H110",
  de_pie_frecuencia: "L110",
  agachado_tiempo: "H111",
  agachado_frecuencia: "L111",
  uso_extremidades_superiores_tiempo: "H112",
  uso_extremidades_superiores_frecuencia: "L112",
} as const;

const SECTION_5_MAP = {
  ruido: "M117",
  iluminacion: "M118",
  temperaturas_externas: "M119",
  vibraciones: "M120",
  presion_atmosferica: "M121",
  radiaciones: "M122",
  polvos_organicos_inorganicos: "M123",
  fibras: "M124",
  liquidos: "M125",
  gases_vapores: "M126",
  humos_metalicos: "M127",
  humos_no_metalicos: "M128",
  material_particulado: "M129",
  electrico: "M130",
  locativo: "M131",
  accidentes_transito: "M132",
  publicos: "M133",
  mecanico: "M134",
  gestion_organizacional: "M135",
  caracteristicas_organizacion: "M136",
  caracteristicas_grupo_social: "M137",
  condiciones_tarea: "M138",
  interfase_persona_tarea: "M139",
  jornada_trabajo: "M140",
  postura_trabajo: "M141",
  puesto_trabajo: "M142",
  movimientos_repetitivos: "M143",
  manipulacion_cargas: "M144",
  herramientas_equipos_riesgo: "M145",
  organizacion_trabajo: "M146",
  observaciones_peligros: "E147",
} as const;

const SECTION_2_1_CHECKBOX_CELLS = ["G36", "L36", "R36", "G37", "L37", "R37"] as const;

function cellRef(cell: string) {
  return `'${CONDICIONES_VACANTE_SHEET_NAME}'!${cell}`;
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

function getMeaningfulDiscapacidades(
  rows: CondicionesVacanteValues["discapacidades"]
) {
  return rows.filter((row) => row.discapacidad.trim());
}

export function buildCondicionesVacanteSheetMutation({
  section1Data,
  formData,
  asistentes,
}: {
  section1Data: CondicionesVacanteSection1Data;
  formData: CondicionesVacanteValues;
  asistentes: Array<{ nombre: string; cargo: string }>;
}): FormSheetMutation {
  const writes: CellWrite[] = [];

  appendMapWrites(writes, SECTION_1_MAP, section1Data);
  appendMapWrites(writes, SECTION_2_MAP, formData);
  appendMapWrites(writes, SECTION_2_1_MAP, formData);
  appendMapWrites(writes, SECTION_3_MAP, formData);
  appendMapWrites(writes, SECTION_4_MAP, formData);
  appendMapWrites(writes, SECTION_5_MAP, formData);

  SECTION_2_COMPETENCIAS_CELLS.forEach((cell, index) => {
    writes.push({
      range: cellRef(cell),
      value: toSheetValue(formData.competencias[index]),
    });
  });

  const meaningfulDiscapacidades = getMeaningfulDiscapacidades(
    formData.discapacidades
  );
  const section6ExtraRows = Math.max(
    0,
    meaningfulDiscapacidades.length - CONDICIONES_VACANTE_SECTION_6_BASE_ROWS
  );
  const section7ContentRow =
    CONDICIONES_VACANTE_SECTION_7_CONTENT_BASE_ROW + section6ExtraRows;
  const section8StartRow =
    CONDICIONES_VACANTE_SECTION_8_START_BASE_ROW + section6ExtraRows;

  meaningfulDiscapacidades.forEach((row, index) => {
    writes.push({
      range: cellRef(`A${CONDICIONES_VACANTE_SECTION_6_START_ROW + index}`),
      value: row.discapacidad,
    });
    writes.push({
      range: cellRef(`G${CONDICIONES_VACANTE_SECTION_6_START_ROW + index}`),
      value: toSheetValue(row.descripcion),
    });
  });

  writes.push({
    range: cellRef(`A${section7ContentRow}`),
    value: toSheetValue(formData.observaciones_recomendaciones),
  });

  asistentes.forEach((asistente, index) => {
    const row = section8StartRow + index;
    writes.push({
      range: cellRef(`E${row}`),
      value: asistente.nombre,
    });
    writes.push({
      range: cellRef(`L${row}`),
      value: asistente.cargo,
    });
  });

  const section8ExtraRows = Math.max(
    0,
    asistentes.length - CONDICIONES_VACANTE_SECTION_8_BASE_ROWS
  );

  return {
    writes,
    rowInsertions: [
      ...(section6ExtraRows > 0
        ? [
            {
              sheetName: CONDICIONES_VACANTE_SHEET_NAME,
              insertAtRow:
                CONDICIONES_VACANTE_SECTION_6_START_ROW +
                CONDICIONES_VACANTE_SECTION_6_BASE_ROWS -
                1,
              count: section6ExtraRows,
              templateRow:
                CONDICIONES_VACANTE_SECTION_6_START_ROW +
                CONDICIONES_VACANTE_SECTION_6_BASE_ROWS -
                1,
            },
          ]
        : []),
      ...(section8ExtraRows > 0
        ? [
            {
              sheetName: CONDICIONES_VACANTE_SHEET_NAME,
              insertAtRow:
                section8StartRow + CONDICIONES_VACANTE_SECTION_8_BASE_ROWS - 1,
              count: section8ExtraRows,
              templateRow:
                section8StartRow + CONDICIONES_VACANTE_SECTION_8_BASE_ROWS - 1,
            },
          ]
        : []),
    ],
    hiddenRows: buildUnusedAttendeeRowHides({
      sheetName: CONDICIONES_VACANTE_SHEET_NAME,
      startRow: section8StartRow,
      baseRows: CONDICIONES_VACANTE_SECTION_8_BASE_ROWS,
      usedRows: asistentes.length,
    }),
    checkboxValidations: [
      {
        sheetName: CONDICIONES_VACANTE_SHEET_NAME,
        cells: [...SECTION_2_1_CHECKBOX_CELLS],
      },
    ],
  };
}
