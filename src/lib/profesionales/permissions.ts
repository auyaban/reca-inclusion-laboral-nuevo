import type { AppRole } from "@/lib/auth/appRoles";

const AARON_ADMIN_LOGIN = "aaron_vercel";
const ADMIN_ROLE: AppRole = "inclusion_empresas_admin";

function normalizeLogin(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function canManageAdminInclusionRole(
  usuarioLogin: string | null | undefined
) {
  return normalizeLogin(usuarioLogin) === AARON_ADMIN_LOGIN;
}

function hasRole(roles: readonly AppRole[], role: AppRole) {
  return roles.includes(role);
}

export function assertCanChangeAdminInclusionRole(options: {
  actorUsuarioLogin: string | null | undefined;
  beforeRoles: readonly AppRole[];
  afterRoles: readonly AppRole[];
}) {
  const changedAdminRole =
    hasRole(options.beforeRoles, ADMIN_ROLE) !==
    hasRole(options.afterRoles, ADMIN_ROLE);

  if (
    changedAdminRole &&
    !canManageAdminInclusionRole(options.actorUsuarioLogin)
  ) {
    throw new Error("Solo aaron_vercel puede asignar o retirar Admin Inclusión.");
  }
}
