import EmpresasModuleHome from "@/components/empresas/EmpresasModuleHome";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { countMisEmpresasNuevas } from "@/lib/empresas/lifecycle-queries";
import { redirect } from "next/navigation";

export default async function EmpresasPage() {
  const context = await getCurrentUserContext();

  if (!context.ok) {
    redirect("/hub");
  }

  const isAdmin = context.roles.includes("inclusion_empresas_admin");
  const isProfessional = context.roles.includes("inclusion_empresas_profesional");

  if (!isAdmin && !isProfessional) {
    redirect("/hub");
  }

  const newCount = isAdmin
    ? 0
    : await countMisEmpresasNuevas({
        userId: context.user.id,
        profesionalId: context.profile.id,
        nombre: context.profile.displayName,
      });

  return <EmpresasModuleHome isAdmin={isAdmin} newCount={newCount} />;
}
