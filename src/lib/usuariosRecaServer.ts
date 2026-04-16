import { createClient as createAdmin } from "@supabase/supabase-js";
import {
  normalizeCedulaUsuario,
  normalizeUsuarioRecaRecord,
  normalizeUsuarioRecaSearchResult,
  USUARIOS_RECA_CONFLICT_COLUMN,
  USUARIOS_RECA_DETAIL_FIELDS,
  USUARIOS_RECA_SEARCH_FIELDS,
  type UsuarioRecaRecord,
  type UsuarioRecaSearchResult,
  type UsuarioRecaUpsertRow,
} from "@/lib/usuariosReca";

const USUARIOS_RECA_TABLE = "usuarios_reca";
let usuariosRecaAdminClient:
  | ReturnType<typeof createUsuariosRecaAdminClient>
  | null = null;

function createUsuariosRecaAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return createAdmin(url, serviceRoleKey);
}

function getUsuariosRecaAdminClient() {
  if (!usuariosRecaAdminClient) {
    usuariosRecaAdminClient = createUsuariosRecaAdminClient();
  }

  return usuariosRecaAdminClient;
}

export async function searchUsuariosRecaByCedulaPrefix(query: string) {
  const normalizedQuery = normalizeCedulaUsuario(query);
  if (normalizedQuery.length < 3) {
    return [] as UsuarioRecaSearchResult[];
  }

  const admin = getUsuariosRecaAdminClient();
  const { data, error } = await admin
    .from(USUARIOS_RECA_TABLE)
    .select(USUARIOS_RECA_SEARCH_FIELDS.join(","))
    .ilike("cedula_usuario", `${normalizedQuery}%`)
    .order("cedula_usuario", { ascending: true })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((entry) =>
      normalizeUsuarioRecaSearchResult(
        entry as Partial<UsuarioRecaSearchResult> | null | undefined
      )
    )
    .filter((entry): entry is UsuarioRecaSearchResult => entry !== null);
}

export async function getUsuarioRecaByCedula(cedula: string) {
  const normalizedCedula = normalizeCedulaUsuario(cedula);
  if (!normalizedCedula) {
    return null;
  }

  const admin = getUsuariosRecaAdminClient();
  const { data, error } = await admin
    .from(USUARIOS_RECA_TABLE)
    .select(USUARIOS_RECA_DETAIL_FIELDS.join(","))
    .eq("cedula_usuario", normalizedCedula)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeUsuarioRecaRecord(data as Partial<UsuarioRecaRecord> | null);
}

export async function upsertUsuariosRecaRows(rows: readonly UsuarioRecaUpsertRow[]) {
  const validRows = rows.filter((row) => normalizeCedulaUsuario(row.cedula_usuario));

  if (validRows.length === 0) {
    return 0;
  }

  const admin = getUsuariosRecaAdminClient();
  const { error } = await admin
    .from(USUARIOS_RECA_TABLE)
    .upsert(validRows, {
      onConflict: USUARIOS_RECA_CONFLICT_COLUMN,
      // Merge-on-conflict is intentional: finalization should refresh the
      // mapped columns for the matched cédula without relying on duplicate rows.
      ignoreDuplicates: false,
    });

  if (error) {
    throw error;
  }

  return validRows.length;
}
