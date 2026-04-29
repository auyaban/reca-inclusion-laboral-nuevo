import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/roles";

const EMPRESAS_ADMIN_ROLE = "inclusion_empresas_admin";

export async function getEmpresasAdminContextOrRedirect() {
  const context = await getCurrentUserContext();

  if (!context.ok || !context.roles.includes(EMPRESAS_ADMIN_ROLE)) {
    redirect("/hub/empresas");
  }

  return context;
}

export async function hasEmpresasAdminRole() {
  const context = await getCurrentUserContext();
  return context.ok && context.roles.includes(EMPRESAS_ADMIN_ROLE);
}
