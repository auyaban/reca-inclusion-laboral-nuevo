import Link from "next/link";
import EmpresaForm from "@/components/empresas/EmpresaForm";
import { getEmpresasAdminContextOrRedirect } from "@/lib/empresas/access";
import { getEmpresaCatalogos } from "@/lib/empresas/server";

export default async function NuevaEmpresaPage() {
  await getEmpresasAdminContextOrRedirect();
  const catalogos = await getEmpresaCatalogos();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-reca">Empresas</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Nueva empresa
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Registra la información base y la asignación de gerencia.
          </p>
        </div>
        <Link
          href="/hub/empresas/admin/empresas"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Volver
        </Link>
      </div>
      <EmpresaForm mode="create" catalogos={catalogos} />
    </main>
  );
}
