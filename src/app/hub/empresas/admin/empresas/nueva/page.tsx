import EmpresaForm from "@/components/empresas/EmpresaForm";
import { BackofficePageHeader } from "@/components/backoffice";
import { getEmpresasAdminContextOrRedirect } from "@/lib/empresas/access";
import { getEmpresaCatalogos } from "@/lib/empresas/server";

export default async function NuevaEmpresaPage() {
  await getEmpresasAdminContextOrRedirect();
  const catalogos = await getEmpresaCatalogos();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="Empresas"
        title="Nueva empresa"
        description="Registra la información base y la asignación de gerencia."
        backHref="/hub/empresas/admin/empresas"
        backLabel="Volver"
      />
      <EmpresaForm mode="create" catalogos={catalogos} />
    </main>
  );
}
