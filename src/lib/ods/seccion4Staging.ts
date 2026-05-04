import type { OdsPersonaRow } from "@/hooks/useOdsStore";
import { usuarioNuevoSchema, type UsuarioNuevo } from "@/lib/ods/schemas";

type LookupUsuarioExists = (cedula: string) => boolean | Promise<boolean>;

type SyncSeccion4UsuariosNuevosInput = {
  rows: OdsPersonaRow[];
  usuariosNuevos: UsuarioNuevo[];
  lookupUsuarioExists: LookupUsuarioExists;
};

type SyncSeccion4UsuariosNuevosResult = {
  usuariosNuevos: UsuarioNuevo[];
  errors: string[];
};

type PreparedRow = {
  index: number;
  row: OdsPersonaRow;
  cedula: string;
};

const FIELD_LABELS: Record<string, string> = {
  cedula_usuario: "cédula",
  nombre_usuario: "nombre",
  discapacidad_usuario: "discapacidad",
  genero_usuario: "género",
  fecha_ingreso: "fecha de ingreso",
  tipo_contrato: "tipo de contrato",
  cargo_servicio: "cargo",
};

function normalizeCedula(value: string): string {
  return value.replace(/\D/g, "");
}

function trimToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isSeccion4RowEmpty(row: Pick<OdsPersonaRow, "cedula_usuario" | "nombre_usuario" | "discapacidad_usuario" | "genero_usuario">): boolean {
  return (
    row.cedula_usuario.trim().length === 0 &&
    row.nombre_usuario.trim().length === 0 &&
    row.discapacidad_usuario.trim().length === 0 &&
    row.genero_usuario.trim().length === 0
  );
}

function buildCandidate(row: OdsPersonaRow, cedula: string): UsuarioNuevo {
  return {
    cedula_usuario: cedula,
    nombre_usuario: row.nombre_usuario.trim(),
    discapacidad_usuario: row.discapacidad_usuario as UsuarioNuevo["discapacidad_usuario"],
    genero_usuario: row.genero_usuario as UsuarioNuevo["genero_usuario"],
    fecha_ingreso: trimToUndefined(row.fecha_ingreso),
    tipo_contrato: trimToUndefined(row.tipo_contrato) as UsuarioNuevo["tipo_contrato"],
    cargo_servicio: trimToUndefined(row.cargo_servicio),
  };
}

function missingFieldErrors(prepared: PreparedRow): string[] {
  const rowNumber = prepared.index + 1;
  const errors: string[] = [];

  if (!prepared.cedula) {
    errors.push(`Sección 4 (Oferentes): completa la cédula de la fila ${rowNumber}.`);
  }
  if (!prepared.row.nombre_usuario.trim()) {
    errors.push(`Sección 4 (Oferentes): completa el nombre de la fila ${rowNumber}.`);
  }
  if (!prepared.row.discapacidad_usuario.trim()) {
    errors.push(`Sección 4 (Oferentes): completa la discapacidad de la fila ${rowNumber}.`);
  }
  if (!prepared.row.genero_usuario.trim()) {
    errors.push(`Sección 4 (Oferentes): completa el género de la fila ${rowNumber}.`);
  }

  return errors;
}

function schemaErrors(prepared: PreparedRow, candidate: UsuarioNuevo): string[] {
  const parsed = usuarioNuevoSchema.safeParse(candidate);
  if (parsed.success) return [];

  const rowNumber = prepared.index + 1;
  return parsed.error.issues.map((issue) => {
    const field = String(issue.path[0] || "");
    const label = FIELD_LABELS[field] || field || "campo";
    const value = String((candidate as Record<string, unknown>)[field] ?? "");
    return `Sección 4 (Oferentes): fila ${rowNumber} tiene ${label} inválido: "${value}".`;
  });
}

async function resolveExists(row: OdsPersonaRow, cedula: string, lookupUsuarioExists: LookupUsuarioExists): Promise<boolean> {
  if (row.usuario_reca_exists === true) return true;
  if (row.usuario_reca_exists === false) return false;

  try {
    return await lookupUsuarioExists(cedula);
  } catch {
    return false;
  }
}

export async function syncSeccion4UsuariosNuevos({
  rows,
  usuariosNuevos,
  lookupUsuarioExists,
}: SyncSeccion4UsuariosNuevosInput): Promise<SyncSeccion4UsuariosNuevosResult> {
  const preparedRows: PreparedRow[] = rows
    .map((row, index) => ({ index, row, cedula: normalizeCedula(row.cedula_usuario) }))
    .filter(({ row }) => !isSeccion4RowEmpty(row));

  const errors: string[] = [];
  const seenCedulas = new Map<string, number>();

  for (const prepared of preparedRows) {
    if (!prepared.cedula) continue;
    const previousIndex = seenCedulas.get(prepared.cedula);
    if (previousIndex !== undefined) {
      errors.push(
        `Sección 4 (Oferentes): la cédula ${prepared.cedula} está duplicada en las filas ${previousIndex + 1} y ${prepared.index + 1}.`
      );
      continue;
    }
    seenCedulas.set(prepared.cedula, prepared.index);
  }

  for (const prepared of preparedRows) {
    const missing = missingFieldErrors(prepared);
    if (missing.length > 0) {
      errors.push(...missing);
      continue;
    }

    const candidate = buildCandidate(prepared.row, prepared.cedula);
    errors.push(...schemaErrors(prepared, candidate));
  }

  if (errors.length > 0) {
    return { usuariosNuevos: [], errors };
  }

  const currentCedulas = new Set(preparedRows.map((prepared) => prepared.cedula));
  const syncedByCedula = new Map<string, UsuarioNuevo>();

  for (const usuario of usuariosNuevos) {
    const cedula = normalizeCedula(usuario.cedula_usuario);
    if (cedula && currentCedulas.has(cedula)) {
      syncedByCedula.set(cedula, { ...usuario, cedula_usuario: cedula });
    }
  }

  for (const prepared of preparedRows) {
    const exists = await resolveExists(prepared.row, prepared.cedula, lookupUsuarioExists);
    if (exists) {
      syncedByCedula.delete(prepared.cedula);
      continue;
    }
    syncedByCedula.set(prepared.cedula, buildCandidate(prepared.row, prepared.cedula));
  }

  return { usuariosNuevos: [...syncedByCedula.values()], errors: [] };
}
