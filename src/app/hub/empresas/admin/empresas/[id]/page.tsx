import { notFound } from "next/navigation";
import { BackofficePageHeader } from "@/components/backoffice";
import EmpresaActivityList from "@/components/empresas/EmpresaActivityList";
import EmpresaForm from "@/components/empresas/EmpresaForm";
import { getEmpresasAdminContextOrRedirect } from "@/lib/empresas/access";
import {
  getEmpresaCatalogos,
  getEmpresaDetail,
  listEmpresaEventos,
} from "@/lib/empresas/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmpresaDetailPage({ params }: PageProps) {
  await getEmpresasAdminContextOrRedirect();
  const { id } = await params;
  const [empresa, catalogos, events] = await Promise.all([
    getEmpresaDetail({ id }),
    getEmpresaCatalogos(),
    listEmpresaEventos({ empresaId: id, limit: 20 }),
  ]);

  if (!empresa) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="Empresas"
        title={empresa.nombre_empresa}
        description="Edita los datos de la empresa y revisa su actividad reciente."
        backHref="/hub/empresas/admin/empresas"
        backLabel="Volver"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <EmpresaForm mode="edit" empresa={empresa} catalogos={catalogos} />
        <EmpresaActivityList events={events} />
      </div>
    </main>
  );
}
