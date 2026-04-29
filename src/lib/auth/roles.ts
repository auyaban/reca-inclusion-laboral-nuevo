import { NextResponse } from "next/server";
import { isAppRole, type AppRole } from "@/lib/auth/appRoles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AuthUser = {
  id: string;
  email: string | null;
};

type ProfessionalRow = {
  id: number;
  nombre_profesional: string | null;
  usuario_login: string | null;
  correo_profesional: string | null;
  auth_user_id: string | null;
};

type RoleRow = {
  role: string | null;
};

export type CurrentUserProfile = {
  id: number;
  authUserId: string;
  displayName: string;
  usuarioLogin: string | null;
  email: string | null;
};

export type CurrentUserContext =
  | {
      ok: true;
      user: AuthUser;
      profile: CurrentUserProfile;
      roles: AppRole[];
    }
  | {
      ok: false;
      status: 401 | 404;
      error: string;
    };

export type AppRoleAuthorization =
  | {
      ok: true;
      context: Extract<CurrentUserContext, { ok: true }>;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function serializeProfessional(user: AuthUser, row: ProfessionalRow): CurrentUserProfile {
  const displayName =
    readNonEmptyString(row.nombre_profesional) ??
    readNonEmptyString(row.usuario_login) ??
    readNonEmptyString(row.correo_profesional) ??
    readNonEmptyString(user.email) ??
    "Profesional";

  return {
    id: row.id,
    authUserId: user.id,
    displayName,
    usuarioLogin: readNonEmptyString(row.usuario_login),
    email: readNonEmptyString(row.correo_profesional) ?? readNonEmptyString(user.email),
  };
}

async function findProfessionalByAuthUser(user: AuthUser) {
  const admin = createSupabaseAdminClient();
  const selectFields = [
    "id",
    "nombre_profesional",
    "usuario_login",
    "correo_profesional",
    "auth_user_id",
  ].join(", ");

  const { data: byAuthId, error: byAuthIdError } = await admin
    .from("profesionales")
    .select(selectFields)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuthIdError) {
    throw byAuthIdError;
  }

  if (byAuthId) {
    return byAuthId as unknown as ProfessionalRow;
  }

  const email = readNonEmptyString(user.email);
  if (!email) {
    return null;
  }

  const { data: byEmail, error: byEmailError } = await admin
    .from("profesionales")
    .select(selectFields)
    .ilike("correo_profesional", email)
    .order("usuario_login", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (byEmailError) {
    throw byEmailError;
  }

  return (byEmail as unknown as ProfessionalRow | null) ?? null;
}

async function listProfessionalRoles(profesionalId: number) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profesional_roles")
    .select("role")
    .eq("profesional_id", profesionalId);

  if (error) {
    throw error;
  }

  const uniqueRoles = new Set<AppRole>();
  for (const row of (data ?? []) as RoleRow[]) {
    if (isAppRole(row.role)) {
      uniqueRoles.add(row.role);
    }
  }

  return [...uniqueRoles];
}

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      status: 401,
      error: "No autenticado.",
    };
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email ?? null,
  };
  const professional = await findProfessionalByAuthUser(authUser);

  if (!professional) {
    return {
      ok: false,
      status: 404,
      error: "Profesional no encontrado.",
    };
  }

  const roles = await listProfessionalRoles(professional.id);

  return {
    ok: true,
    user: authUser,
    profile: serializeProfessional(authUser, professional),
    roles,
  };
}

export async function requireAppRole(
  requiredRoles: readonly AppRole[]
): Promise<AppRoleAuthorization> {
  const context = await getCurrentUserContext();

  if (!context.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: context.error },
        { status: context.status === 401 ? 401 : 403 }
      ),
    };
  }

  const hasRequiredRole = requiredRoles.some((role) =>
    context.roles.includes(role)
  );

  if (!hasRequiredRole) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    };
  }

  return {
    ok: true,
    context,
  };
}
