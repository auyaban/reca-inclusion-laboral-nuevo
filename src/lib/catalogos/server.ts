import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  catalogoRecordSchema,
  type CatalogoKind,
  type CatalogoListParams,
} from "@/lib/catalogos/schemas";

export class CatalogoServerError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

type CatalogoConfig = {
  table: "asesores" | "gestores" | "interpretes";
  select: string;
  searchFields: string[];
};

const CONFIGS: Record<CatalogoKind, CatalogoConfig> = {
  asesores: {
    table: "asesores",
    select: "id, nombre, email, telefono, sede, localidad, gestor, deleted_at",
    searchFields: ["nombre", "email", "telefono", "sede", "localidad", "gestor"],
  },
  gestores: {
    table: "gestores",
    select: "id, nombre, email, telefono, sede, localidades, deleted_at",
    searchFields: ["nombre", "email", "telefono", "sede", "localidades"],
  },
  interpretes: {
    table: "interpretes",
    select: "id, nombre, nombre_key, created_at, deleted_at",
    searchFields: ["nombre"],
  },
};

export type CatalogoRecord = {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  sede?: string | null;
  localidad?: string | null;
  gestor?: string | null;
  localidades?: string | null;
  nombre_key?: string | null;
  created_at?: string | null;
  deleted_at: string | null;
};

function escapeSearchTerm(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function getConfig(kind: CatalogoKind) {
  return CONFIGS[kind];
}

function isUniqueViolation(error: unknown) {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    (error as { code?: string }).code === "23505"
  );
}

function isNoRowsReturned(error: unknown) {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    (error as { code?: string }).code === "PGRST116"
  );
}

function throwCatalogoMutationError(error: unknown, kind: CatalogoKind): never {
  if (isNoRowsReturned(error)) {
    throw new CatalogoServerError(404, "Registro no encontrado.");
  }
  if (isUniqueViolation(error)) {
    throw new CatalogoServerError(409, mapUniqueError(kind));
  }
  throw error;
}

function mapUniqueError(kind: CatalogoKind) {
  if (kind === "interpretes") {
    return "Ya existe un intérprete con ese nombre. Si está eliminado, restaura el registro.";
  }
  if (kind === "asesores") {
    return "Ya existe un asesor con ese nombre. Si está eliminado, restaura el registro.";
  }
  return "Ya existe un registro con esos datos.";
}

export async function listCatalogoRecords(options: {
  kind: CatalogoKind;
  params: CatalogoListParams;
}) {
  const admin = createSupabaseAdminClient();
  const config = getConfig(options.kind);
  let query = admin
    .from(config.table)
    .select(config.select, { count: "exact" });

  if (options.params.estado === "activos") {
    query = query.is("deleted_at", null);
  } else if (options.params.estado === "eliminados") {
    query = query.not("deleted_at", "is", null);
  }

  if (options.params.q) {
    const term = `%${escapeSearchTerm(options.params.q)}%`;
    query = query.or(config.searchFields.map((field) => `${field}.ilike.${term}`).join(","));
  }

  const from = (options.params.page - 1) * options.params.pageSize;
  const to = from + options.params.pageSize - 1;
  const { data, error, count } = await query
    .order(options.params.sort, {
      ascending: options.params.direction === "asc",
      nullsFirst: false,
    })
    .range(from, to);

  if (error) {
    throw error;
  }

  const total = count ?? 0;
  return {
    items: (data ?? []) as unknown as CatalogoRecord[],
    total,
    page: options.params.page,
    pageSize: options.params.pageSize,
    totalPages: Math.ceil(total / options.params.pageSize),
  };
}

export async function getCatalogoRecord(options: {
  kind: CatalogoKind;
  id: string;
}) {
  const admin = createSupabaseAdminClient();
  const config = getConfig(options.kind);
  const { data, error } = await admin
    .from(config.table)
    .select(config.select)
    .eq("id", options.id)
    .single();

  if (error) {
    if (isNoRowsReturned(error)) {
      return null;
    }
    throw error;
  }

  return data as unknown as CatalogoRecord;
}

export async function createCatalogoRecord(options: {
  kind: CatalogoKind;
  input: unknown;
}) {
  const admin = createSupabaseAdminClient();
  const config = getConfig(options.kind);
  const input = catalogoRecordSchema(options.kind).parse(options.input);
  const { data, error } = await admin
    .from(config.table)
    .insert(input)
    .select(config.select)
    .single();

  if (error) {
    throwCatalogoMutationError(error, options.kind);
  }

  return data as unknown as CatalogoRecord;
}

export async function updateCatalogoRecord(options: {
  kind: CatalogoKind;
  id: string;
  input: unknown;
}) {
  const admin = createSupabaseAdminClient();
  const config = getConfig(options.kind);
  const input = catalogoRecordSchema(options.kind).parse(options.input);
  const { data, error } = await admin
    .from(config.table)
    .update(input)
    .eq("id", options.id)
    .select(config.select)
    .single();

  if (error) {
    throwCatalogoMutationError(error, options.kind);
  }

  return data as unknown as CatalogoRecord;
}

export async function deleteCatalogoRecord(options: {
  kind: CatalogoKind;
  id: string;
}) {
  const admin = createSupabaseAdminClient();
  const config = getConfig(options.kind);
  const { data, error } = await admin
    .from(config.table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", options.id)
    .select(config.select)
    .single();

  if (error) {
    throwCatalogoMutationError(error, options.kind);
  }

  return data as unknown as CatalogoRecord;
}

export async function restoreCatalogoRecord(options: {
  kind: CatalogoKind;
  id: string;
}) {
  const admin = createSupabaseAdminClient();
  const config = getConfig(options.kind);
  const { data, error } = await admin
    .from(config.table)
    .update({ deleted_at: null })
    .eq("id", options.id)
    .select(config.select)
    .single();

  if (error) {
    throwCatalogoMutationError(error, options.kind);
  }

  return data as unknown as CatalogoRecord;
}
