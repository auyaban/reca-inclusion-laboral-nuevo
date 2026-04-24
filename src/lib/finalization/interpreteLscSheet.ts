import type { CellWrite, FormSheetMutation, RowInsertion } from "@/lib/google/sheets";
import { normalizePayloadAsistentes } from "@/lib/finalization/payloads";
import {
  calculateInterpreteLscSumatoria,
  calculateInterpreteLscTotalTiempo,
  countMeaningfulInterpreteLscInterpretes,
  countMeaningfulInterpreteLscOferentes,
  formatInterpreteLscSabanaValue,
} from "@/lib/interpreteLsc";
import type { InterpreteLscSection1Data } from "@/lib/finalization/interpreteLscPayload";
import { coerceTrimmedText } from "@/lib/finalization/valueUtils";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";

export const INTERPRETE_LSC_SHEET_NAME = "Maestro";

export const INTERPRETE_LSC_OFERENTES_START_ROW = 12;
export const INTERPRETE_LSC_OFERENTES_BASE_ROWS = 7;
export const INTERPRETE_LSC_INTERPRETES_START_ROW = 19;
export const INTERPRETE_LSC_INTERPRETES_BASE_ROWS = 1;
export const INTERPRETE_LSC_SABANA_COLUMN = "Q";
export const INTERPRETE_LSC_SUMATORIA_COLUMN = "Q";
export const INTERPRETE_LSC_ASISTENTES_START_ROW = 25;
export const INTERPRETE_LSC_ASISTENTES_BASE_ROWS = 2;

const SECTION_1_MAP = {
  fecha_visita: "D6",
  ciudad_empresa: "N6",
  nombre_empresa: "D7",
  direccion_empresa: "N7",
  contacto_empresa: "D8",
  cargo: "N8",
  modalidad_interprete: "I9",
  modalidad_profesional_reca: "P9",
} as const satisfies Record<
  | "fecha_visita"
  | "ciudad_empresa"
  | "nombre_empresa"
  | "direccion_empresa"
  | "contacto_empresa"
  | "cargo"
  | "modalidad_interprete"
  | "modalidad_profesional_reca",
  string
>;

export type InterpreteLscMeaningfulCounts = {
  oferentesCount: number;
  interpretesCount: number;
  asistentesCount: number;
  oferentesOverflow: number;
  interpretesOverflow: number;
  asistentesOverflow: number;
};

export type InterpreteLscLayoutRows = InterpreteLscMeaningfulCounts & {
  interpreteStartRow: number;
  sabanaRow: number;
  sumatoriaRow: number;
  asistentesStartRow: number;
};

export type InterpreteLscStructure = InterpreteLscLayoutRows & {
  repeatedCounts: {
    oferentes: number;
    interpretes: number;
    asistentes: number;
  };
  signatureEntries: ReadonlyArray<
    readonly [
      "oferentesOverflow" | "interpretesOverflow" | "asistentesOverflow",
      number,
    ]
  >;
  structuralMutationInput: {
    oferentesCount: number;
    interpretesCount: number;
    asistentesCount: number;
  };
};

function cellRef(cell: string) {
  return `'${INTERPRETE_LSC_SHEET_NAME}'!${cell}`;
}

function toSheetValue(value: unknown) {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return String(value ?? "");
}

function getMeaningfulOferentes(formData: InterpreteLscValues) {
  return formData.oferentes.filter((row) =>
    Boolean(
      coerceTrimmedText(row.nombre_oferente) ||
        coerceTrimmedText(row.cedula) ||
        coerceTrimmedText(row.proceso)
    )
  );
}

function getMeaningfulInterpretes(formData: InterpreteLscValues) {
  return formData.interpretes.filter((row) =>
    Boolean(
      coerceTrimmedText(row.nombre) ||
        coerceTrimmedText(row.hora_inicial) ||
        coerceTrimmedText(row.hora_final) ||
        coerceTrimmedText(row.total_tiempo)
    )
  );
}

function getCanonicalMeaningfulInterpretes(formData: InterpreteLscValues) {
  return getMeaningfulInterpretes(formData).map((row) => ({
    ...row,
    total_tiempo: calculateInterpreteLscTotalTiempo(
      row.hora_inicial,
      row.hora_final
    ),
  }));
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

export function deriveInterpreteLscStructure(options: {
  oferentesCount: number;
  interpretesCount: number;
  asistentesCount: number;
}): InterpreteLscStructure {
  const counts: InterpreteLscMeaningfulCounts = {
    oferentesCount: options.oferentesCount,
    interpretesCount: options.interpretesCount,
    asistentesCount: options.asistentesCount,
    oferentesOverflow: Math.max(
      0,
      options.oferentesCount - INTERPRETE_LSC_OFERENTES_BASE_ROWS
    ),
    interpretesOverflow: Math.max(
      0,
      options.interpretesCount - INTERPRETE_LSC_INTERPRETES_BASE_ROWS
    ),
    asistentesOverflow: Math.max(
      0,
      options.asistentesCount - INTERPRETE_LSC_ASISTENTES_BASE_ROWS
    ),
  };
  const interpreteStartRow =
    INTERPRETE_LSC_INTERPRETES_START_ROW + counts.oferentesOverflow;
  const sabanaRow = interpreteStartRow + counts.interpretesCount;
  const sumatoriaRow = sabanaRow + 1;
  const asistentesStartRow =
    INTERPRETE_LSC_ASISTENTES_START_ROW +
    counts.oferentesOverflow +
    counts.interpretesOverflow;

  return {
    ...counts,
    interpreteStartRow,
    sabanaRow,
    sumatoriaRow,
    asistentesStartRow,
    repeatedCounts: {
      oferentes: counts.oferentesCount,
      interpretes: counts.interpretesCount,
      asistentes: counts.asistentesCount,
    },
    signatureEntries: [
      ["oferentesOverflow", counts.oferentesOverflow],
      ["interpretesOverflow", counts.interpretesOverflow],
      ["asistentesOverflow", counts.asistentesOverflow],
    ],
    structuralMutationInput: {
      oferentesCount: counts.oferentesCount,
      interpretesCount: counts.interpretesCount,
      asistentesCount: counts.asistentesCount,
    },
  };
}

export function getInterpreteLscMeaningfulCounts(options: {
  formData: InterpreteLscValues;
}): InterpreteLscMeaningfulCounts {
  return deriveInterpreteLscStructure({
    oferentesCount: Math.max(
      1,
      countMeaningfulInterpreteLscOferentes(options.formData.oferentes)
    ),
    interpretesCount: Math.max(
      1,
      countMeaningfulInterpreteLscInterpretes(options.formData.interpretes)
    ),
    asistentesCount: Math.max(
      0,
      normalizePayloadAsistentes(options.formData.asistentes).length
    ),
  });
}

export function getInterpreteLscLayoutRows(options: {
  formData: InterpreteLscValues;
}): InterpreteLscLayoutRows {
  return deriveInterpreteLscStructure(getInterpreteLscMeaningfulCounts(options));
}

export function buildInterpreteLscStructuralMutation(options: {
  oferentesCount: number;
  interpretesCount: number;
  asistentesCount: number;
}): Pick<FormSheetMutation, "writes" | "rowInsertions"> {
  const structure = deriveInterpreteLscStructure(options);
  const rowInsertions: RowInsertion[] = [];

  if (structure.oferentesOverflow > 0) {
    rowInsertions.push({
      sheetName: INTERPRETE_LSC_SHEET_NAME,
      insertAtRow:
        INTERPRETE_LSC_OFERENTES_START_ROW + INTERPRETE_LSC_OFERENTES_BASE_ROWS - 1,
      count: structure.oferentesOverflow,
      templateRow:
        INTERPRETE_LSC_OFERENTES_START_ROW + INTERPRETE_LSC_OFERENTES_BASE_ROWS - 1,
    });
  }

  if (structure.interpretesOverflow > 0) {
    rowInsertions.push({
      sheetName: INTERPRETE_LSC_SHEET_NAME,
      insertAtRow: structure.interpreteStartRow,
      count: structure.interpretesOverflow,
      templateRow: structure.interpreteStartRow,
    });
  }

  if (structure.asistentesOverflow > 0) {
    rowInsertions.push({
      sheetName: INTERPRETE_LSC_SHEET_NAME,
      insertAtRow:
        structure.asistentesStartRow + INTERPRETE_LSC_ASISTENTES_BASE_ROWS - 1,
      count: structure.asistentesOverflow,
      templateRow: structure.asistentesStartRow,
    });
  }

  return {
    writes: [],
    rowInsertions,
  };
}

export function buildInterpreteLscSheetMutation({
  section1Data,
  formData,
}: {
  section1Data: InterpreteLscSection1Data;
  formData: InterpreteLscValues;
}): FormSheetMutation {
  const writes: CellWrite[] = [];
  const meaningfulOferentes = getMeaningfulOferentes(formData);
  const meaningfulInterpretes = getCanonicalMeaningfulInterpretes(formData);
  const meaningfulAsistentes = normalizePayloadAsistentes(formData.asistentes);
  const canonicalSumatoriaHoras = calculateInterpreteLscSumatoria(
    meaningfulInterpretes,
    formData.sabana
  );
  const layout = getInterpreteLscLayoutRows({ formData });

  appendMapWrites(writes, SECTION_1_MAP, section1Data);

  meaningfulOferentes.forEach((row, index) => {
    const targetRow = INTERPRETE_LSC_OFERENTES_START_ROW + index;
    writes.push(
      {
        range: cellRef(`A${targetRow}`),
        value: String(index + 1),
      },
      {
        range: cellRef(`B${targetRow}`),
        value: coerceTrimmedText(row.nombre_oferente),
      },
      {
        range: cellRef(`F${targetRow}`),
        value: coerceTrimmedText(row.cedula),
      },
      {
        range: cellRef(`J${targetRow}`),
        value: coerceTrimmedText(row.proceso),
      }
    );
  });

  meaningfulInterpretes.forEach((row, index) => {
    const targetRow = layout.interpreteStartRow + index;
    writes.push(
      {
        range: cellRef(`D${targetRow}`),
        value: coerceTrimmedText(row.nombre),
      },
      {
        range: cellRef(`J${targetRow}`),
        value: coerceTrimmedText(row.hora_inicial),
      },
      {
        range: cellRef(`M${targetRow}`),
        value: coerceTrimmedText(row.hora_final),
      },
      {
        range: cellRef(`Q${targetRow}`),
        value: coerceTrimmedText(row.total_tiempo),
      }
    );
  });

  writes.push(
    {
      range: cellRef(`${INTERPRETE_LSC_SABANA_COLUMN}${layout.sabanaRow}`),
      value: formatInterpreteLscSabanaValue(formData.sabana),
    },
    {
      range: cellRef(`${INTERPRETE_LSC_SUMATORIA_COLUMN}${layout.sumatoriaRow}`),
      value: canonicalSumatoriaHoras,
    }
  );

  meaningfulAsistentes.forEach((asistente, index) => {
    const targetRow = layout.asistentesStartRow + index;
    writes.push(
      {
        range: cellRef(`C${targetRow}`),
        value: coerceTrimmedText(asistente.nombre),
      },
      {
        range: cellRef(`K${targetRow}`),
        value: coerceTrimmedText(asistente.cargo),
      }
    );
  });

  return {
    writes,
    rowInsertions: buildInterpreteLscStructuralMutation({
      oferentesCount: layout.oferentesCount,
      interpretesCount: layout.interpretesCount,
      asistentesCount: layout.asistentesCount,
    }).rowInsertions,
  };
}
