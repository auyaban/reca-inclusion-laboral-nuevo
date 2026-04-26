import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DRAFT_CLEANUP_ADMIN_LOGINS = new Set(["aaron_vercel"]);

type AuthUser = Pick<User, "app_metadata" | "email" | "id" | "user_metadata">;

type ProfesionalesLookupRow = {
  usuario_login: string | null;
};

export type DraftCleanupAdminAuthorization =
  | { ok: true; user: User; usuarioLogin: string }
  | { ok: false; status: 401 | 403; error: string };

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUsuarioLogin(value: string) {
  return value.trim().toLocaleLowerCase("es-CO");
}

function readUsuarioLoginFromAppMetadata(user: AuthUser) {
  return readNonEmptyString(
    (user.app_metadata as Record<string, unknown> | undefined)?.usuario_login
  );
}

async function lookupUsuarioLoginByEmail(user: AuthUser) {
  const email = readNonEmptyString(user.email);
  if (!email) {
    return null;
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("profesionales")
    .select("usuario_login")
    .ilike("correo_profesional", email)
    .order("usuario_login", { ascending: true })
    .limit(2);

  if (error) {
    throw error;
  }

  const rows = (Array.isArray(data) ? data : []) as ProfesionalesLookupRow[];
  const usuarioLogins = rows
    .map((row) => readNonEmptyString(row?.usuario_login))
    .filter((value): value is string => Boolean(value));

  if (usuarioLogins.length > 1) {
    console.warn("[draft-cleanup.admin] duplicate_profesional_email", {
      email,
      usuarioLogins,
    });
  }

  return usuarioLogins[0] ?? null;
}

export async function resolveDraftCleanupUsuarioLogin(user: AuthUser) {
  return readUsuarioLoginFromAppMetadata(user) ?? lookupUsuarioLoginByEmail(user);
}

export function isDraftCleanupAdminLogin(usuarioLogin: string | null | undefined) {
  return Boolean(
    usuarioLogin && DRAFT_CLEANUP_ADMIN_LOGINS.has(normalizeUsuarioLogin(usuarioLogin))
  );
}

export async function isDraftCleanupAdminUser(user: AuthUser | null) {
  if (!user) {
    return false;
  }

  const usuarioLogin = await resolveDraftCleanupUsuarioLogin(user);
  return isDraftCleanupAdminLogin(usuarioLogin);
}

export async function authorizeDraftCleanupAdmin(): Promise<DraftCleanupAdminAuthorization> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "No autenticado." };
  }

  const usuarioLogin = await resolveDraftCleanupUsuarioLogin(user);
  if (!isDraftCleanupAdminLogin(usuarioLogin)) {
    return { ok: false, status: 403, error: "No autorizado." };
  }

  return { ok: true, user, usuarioLogin: usuarioLogin! };
}
