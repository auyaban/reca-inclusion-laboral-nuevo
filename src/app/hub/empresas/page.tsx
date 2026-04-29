import EmpresasModuleHome from "@/components/empresas/EmpresasModuleHome";
import { hasEmpresasAdminRole } from "@/lib/empresas/access";
import { redirect } from "next/navigation";

export default async function EmpresasPage() {
  const isAdmin = await hasEmpresasAdminRole();

  if (!isAdmin) {
    redirect("/hub");
  }

  return <EmpresasModuleHome isAdmin={isAdmin} />;
}
