export const APP_ROLES = [
  "inclusion_empresas_admin",
  "inclusion_empresas_profesional",
  "ods_operador",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  inclusion_empresas_admin: "Admin Inclusión",
  inclusion_empresas_profesional: "Profesional Inclusión",
  ods_operador: "ODS Operador",
};

export function isAppRole(value: unknown): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function getAppRoleLabel(role: AppRole) {
  return APP_ROLE_LABELS[role];
}

export function listAppRoleOptions() {
  return APP_ROLES.map((role) => ({
    value: role,
    label: getAppRoleLabel(role),
  }));
}
