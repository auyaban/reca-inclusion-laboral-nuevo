import ProfesionalForm from "@/components/profesionales/ProfesionalForm";
import { getEmpresasAdminContextOrRedirect } from "@/lib/empresas/access";

export default async function NuevoProfesionalPage() {
  await getEmpresasAdminContextOrRedirect();

  return <ProfesionalForm mode="create" />;
}
