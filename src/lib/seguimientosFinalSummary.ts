import type { SeguimientosFormulaIntegrity } from "@/lib/seguimientos";

export const SEGUIMIENTOS_FINAL_SHEET_NAME = "PONDERADO FINAL";

export type SeguimientosFinalFormulaCellSpec = {
  cell: string;
  sourceCell: string;
  fieldKey: string;
  fieldLabel: string;
  formula: string;
};

export type SeguimientosFinalReadFieldSpec = {
  cell: string;
  fieldKey: string;
  fieldLabel: string;
};

export type SeguimientosFinalFormulaSpec = {
  validationMode: "canonical" | "direct_write_only";
  formulaCells: SeguimientosFinalFormulaCellSpec[];
  readFields: SeguimientosFinalReadFieldSpec[];
};

export type SeguimientosFormulaEvaluation = {
  integrity: SeguimientosFormulaIntegrity;
  issues: string[];
  mismatchedCells: string[];
  writeBacks: Array<{ cell: string; formula: string }>;
};

const SEGUIMIENTOS_DIRECT_WRITE_ERROR_VALUES = new Set([
  "#REF!",
  "#N/A",
  "#VALUE!",
  "#ERROR!",
]);

const FINAL_COMPANY_READ_FIELDS: SeguimientosFinalReadFieldSpec[] = [
  { cell: "D6", fieldKey: "fecha_visita", fieldLabel: "Fecha de la visita" },
  { cell: "Q6", fieldKey: "modalidad", fieldLabel: "Modalidad" },
  {
    cell: "D7",
    fieldKey: "nombre_empresa",
    fieldLabel: "Nombre de la empresa",
  },
  {
    cell: "Q7",
    fieldKey: "ciudad_empresa",
    fieldLabel: "Ciudad / municipio",
  },
  {
    cell: "D8",
    fieldKey: "direccion_empresa",
    fieldLabel: "Direccion de la empresa",
  },
  { cell: "Q8", fieldKey: "nit_empresa", fieldLabel: "Numero de NIT" },
  {
    cell: "D9",
    fieldKey: "correo_1",
    fieldLabel: "Correo electronico",
  },
  { cell: "Q9", fieldKey: "telefono_empresa", fieldLabel: "Telefonos" },
  {
    cell: "D10",
    fieldKey: "contacto_empresa",
    fieldLabel: "Persona que atiende la visita",
  },
  { cell: "Q10", fieldKey: "cargo", fieldLabel: "Cargo" },
  {
    cell: "D11",
    fieldKey: "caja_compensacion",
    fieldLabel: "Caja de compensacion",
  },
  {
    cell: "Q11",
    fieldKey: "sede_empresa",
    fieldLabel: "Sede Compensar",
  },
  { cell: "D12", fieldKey: "asesor", fieldLabel: "Asesor" },
  {
    cell: "Q12",
    fieldKey: "profesional_asignado",
    fieldLabel: "Profesional asignado RECA",
  },
];

const FINAL_USER_READ_FIELDS: SeguimientosFinalReadFieldSpec[] = [
  {
    cell: "K15",
    fieldKey: "nombre_vinculado",
    fieldLabel: "Nombre del vinculado",
  },
  { cell: "Q15", fieldKey: "cedula", fieldLabel: "Cedula" },
  {
    cell: "S15",
    fieldKey: "telefono_vinculado",
    fieldLabel: "Telefono del vinculado",
  },
  {
    cell: "U15",
    fieldKey: "correo_vinculado",
    fieldLabel: "Correo del vinculado",
  },
  {
    cell: "K17",
    fieldKey: "cargo_vinculado",
    fieldLabel: "Cargo del vinculado",
  },
  {
    cell: "Q17",
    fieldKey: "certificado_discapacidad",
    fieldLabel: "Certificado discapacidad",
  },
  {
    cell: "U17",
    fieldKey: "certificado_porcentaje",
    fieldLabel: "Porcentaje certificado",
  },
  {
    cell: "N18",
    fieldKey: "fecha_firma_contrato",
    fieldLabel: "Fecha firma contrato",
  },
  {
    cell: "U18",
    fieldKey: "discapacidad",
    fieldLabel: "Tipo de discapacidad",
  },
];

const FINAL_FUNCTION_READ_FIELDS: SeguimientosFinalReadFieldSpec[] = [
  {
    cell: "L20",
    fieldKey: "funcion_1",
    fieldLabel: "Funcion 1",
  },
  {
    cell: "R20",
    fieldKey: "funcion_6",
    fieldLabel: "Funcion 6",
  },
  {
    cell: "L21",
    fieldKey: "funcion_2",
    fieldLabel: "Funcion 2",
  },
  {
    cell: "R21",
    fieldKey: "funcion_7",
    fieldLabel: "Funcion 7",
  },
  {
    cell: "L22",
    fieldKey: "funcion_3",
    fieldLabel: "Funcion 3",
  },
  {
    cell: "R22",
    fieldKey: "funcion_8",
    fieldLabel: "Funcion 8",
  },
  {
    cell: "L23",
    fieldKey: "funcion_4",
    fieldLabel: "Funcion 4",
  },
  {
    cell: "R23",
    fieldKey: "funcion_9",
    fieldLabel: "Funcion 9",
  },
  {
    cell: "L24",
    fieldKey: "funcion_5",
    fieldLabel: "Funcion 5",
  },
  {
    cell: "R24",
    fieldKey: "funcion_10",
    fieldLabel: "Funcion 10",
  },
];

export function sanitizeSeguimientosDirectWriteValue(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (SEGUIMIENTOS_DIRECT_WRITE_ERROR_VALUES.has(normalized.toUpperCase())) {
    return "";
  }

  return normalized;
}

export function buildSeguimientosFinalFormulaSpec() {
  return {
    validationMode: "direct_write_only",
    formulaCells: [] as SeguimientosFinalFormulaCellSpec[],
    readFields: [
      ...FINAL_COMPANY_READ_FIELDS,
      ...FINAL_USER_READ_FIELDS,
      ...FINAL_FUNCTION_READ_FIELDS,
    ],
  } satisfies SeguimientosFinalFormulaSpec;
}

export function normalizeSeguimientosFormula(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/^=\((.+)\)$/u, "=$1");
}

export function evaluateSeguimientosFinalFormulas(
  spec: SeguimientosFinalFormulaSpec,
  actualFormulasByCell: Record<string, string>
) {
  const issues: string[] = [];
  const mismatchedCells: string[] = [];
  const writeBacks: Array<{ cell: string; formula: string }> = [];
  let hasBrokenCell = false;

  for (const formulaCell of spec.formulaCells) {
    const actualFormula = String(actualFormulasByCell[formulaCell.cell] ?? "").trim();
    const actualFormulaNormalized = normalizeSeguimientosFormula(actualFormula);
    const expectedFormulaNormalized = normalizeSeguimientosFormula(
      formulaCell.formula
    );

    if (actualFormulaNormalized === expectedFormulaNormalized) {
      continue;
    }

    mismatchedCells.push(formulaCell.cell);
    writeBacks.push({
      cell: formulaCell.cell,
      formula: formulaCell.formula,
    });

    const looksLikeFormula = actualFormula.startsWith("=");
    if (!looksLikeFormula) {
      hasBrokenCell = true;
      issues.push(
        `La formula ${formulaCell.cell} no existe o fue reemplazada por un valor manual.`
      );
      continue;
    }

    issues.push(
      `La formula ${formulaCell.cell} no coincide con la especificacion canonica.`
    );
  }

  if (mismatchedCells.length === 0) {
    return {
      integrity: "healthy",
      issues,
      mismatchedCells,
      writeBacks,
    } satisfies SeguimientosFormulaEvaluation;
  }

  return {
    integrity: hasBrokenCell ? "broken" : "stale",
    issues,
    mismatchedCells,
    writeBacks,
  } satisfies SeguimientosFormulaEvaluation;
}

export function buildSeguimientosFinalFields(
  spec: SeguimientosFinalFormulaSpec,
  valuesByCell: Record<string, string>
) {
  return spec.readFields.reduce<Record<string, string>>((accumulator, field) => {
    accumulator[field.fieldKey] = sanitizeSeguimientosDirectWriteValue(
      valuesByCell[field.cell] ?? ""
    );
    return accumulator;
  }, {});
}
