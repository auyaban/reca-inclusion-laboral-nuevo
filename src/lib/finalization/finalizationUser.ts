import { createClient as createAdminClient, type User } from "@supabase/supabase-js";

export interface FinalizationUserIdentity {
  usuarioLogin: string;
  nombreUsuario: string;
}

type FinalizationAuthUser = Pick<User, "app_metadata" | "email" | "id">;

type ProfesionalesLookupRow = {
  usuario_login: string | null;
};

let adminClient: ReturnType<typeof createAdminClient> | null = null;

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase para resolver usuario_login."
    );
  }

  adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
  return adminClient;
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

  const email = readNonEmptyString(user.email);

  if (!email) {
    throw new Error(
      "No se pudo resolver usuario_login del usuario autenticado."
    );
  }

  const { data, error } = await getAdminClient()
    .from("profesionales")
    .select("usuario_login")
    .ilike("correo_profesional", email)
    .maybeSingle<ProfesionalesLookupRow>();

  if (error) {
    throw error;
  }

  const usuarioLogin = readNonEmptyString(data?.usuario_login);

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
