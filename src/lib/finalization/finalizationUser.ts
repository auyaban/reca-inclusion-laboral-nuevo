import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface FinalizationUserIdentity {
  usuarioLogin: string;
  nombreUsuario: string;
}

type FinalizationAuthUser = Pick<User, "app_metadata" | "email" | "id">;

type ProfesionalesLookupRow = {
  usuario_login: string | null;
};

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNombreUsuario(
  user: Pick<FinalizationAuthUser, "email">,
  usuarioLogin: string
) {
  const email = readNonEmptyString(user.email);

  if (!email) {
    return usuarioLogin;
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart ? localPart : usuarioLogin;
}

function readUsuarioLoginFromAppMetadata(user: FinalizationAuthUser) {
  return readNonEmptyString(
    (user.app_metadata as Record<string, unknown> | undefined)?.usuario_login
  );
}

export async function getFinalizationUserIdentity(
  user: FinalizationAuthUser
): Promise<FinalizationUserIdentity> {
  const usuarioLoginFromMetadata = readUsuarioLoginFromAppMetadata(user);

  if (usuarioLoginFromMetadata) {
    return {
      usuarioLogin: usuarioLoginFromMetadata,
      nombreUsuario: getNombreUsuario(user, usuarioLoginFromMetadata),
    };
  }

  const adminClient = createSupabaseAdminClient({
    missingEnvMessage:
      "Faltan variables de entorno de Supabase para resolver usuario_login.",
  });

  // Intento canonico: matchear por auth_user_id. Es estable e inmune a typos
  // o variantes en el correo (puntos, casing, dominios distintos), que es la
  // causa observada cuando `profesionales.correo_profesional` no coincide con
  // el email registrado en Supabase Auth.
  const authUserId = readNonEmptyString(user.id);

  if (authUserId) {
    const { data: byAuthIdData, error: byAuthIdError } = await adminClient
      .from("profesionales")
      .select("usuario_login")
      .eq("auth_user_id", authUserId)
      .limit(1);

    if (byAuthIdError) {
      throw byAuthIdError;
    }

    const byAuthIdRow = Array.isArray(byAuthIdData)
      ? (byAuthIdData[0] as ProfesionalesLookupRow | undefined)
      : undefined;
    const usuarioLoginByAuthId = readNonEmptyString(byAuthIdRow?.usuario_login);

    if (usuarioLoginByAuthId) {
      return {
        usuarioLogin: usuarioLoginByAuthId,
        nombreUsuario: getNombreUsuario(user, usuarioLoginByAuthId),
      };
    }
  }

  // Fallback historico: matchear por correo. Se mantiene por compatibilidad
  // con usuarios que aun no tengan `auth_user_id` poblado en `profesionales`.
  const email = readNonEmptyString(user.email);

  if (!email) {
    throw new Error(
      "No se pudo resolver usuario_login del usuario autenticado."
    );
  }

  const { data, error } = await adminClient
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
    console.warn("[finalization.user_identity] duplicate_profesional_email", {
      email,
      usuarioLogins,
    });
  }

  const usuarioLogin = usuarioLogins[0] ?? null;

  if (!usuarioLogin) {
    throw new Error(
      `No se encontro usuario_login para el correo autenticado: ${email}`
    );
  }

  return {
    usuarioLogin,
    nombreUsuario: getNombreUsuario(user, usuarioLogin),
  };
}
