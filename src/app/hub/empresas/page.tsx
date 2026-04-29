import EmpresasModuleHome from "@/components/empresas/EmpresasModuleHome";
import { hasEmpresasAdminRole } from "@/lib/empresas/access";

export default async function EmpresasPage() {
  const isAdmin = await hasEmpresasAdminRole();

  return <EmpresasModuleHome isAdmin={isAdmin} />;
}
