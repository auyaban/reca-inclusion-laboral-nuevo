import Link from "next/link";
import { notFound } from "next/navigation";
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-reca">Empresas</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {empresa.nombre_empresa}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Edita los datos de la empresa y revisa su actividad reciente.
          </p>
        </div>
        <Link
          href="/hub/empresas/admin/empresas"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Volver
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <EmpresaForm mode="edit" empresa={empresa} catalogos={catalogos} />
        <EmpresaActivityList events={events} />
      </div>
    </main>
  );
}
