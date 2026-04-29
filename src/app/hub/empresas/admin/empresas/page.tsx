import EmpresasListView from "@/components/empresas/EmpresasListView";
import { getEmpresasAdminContextOrRedirect } from "@/lib/empresas/access";
import { getEmpresaCatalogos, listEmpresas } from "@/lib/empresas/server";
import { parseEmpresaListParams } from "@/lib/empresas/schemas";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toURLSearchParams(
  params: Record<string, string | string[] | undefined> | undefined
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === "string") {
      searchParams.set(key, value);
    } else if (Array.isArray(value) && typeof value[0] === "string") {
      searchParams.set(key, value[0]);
    }
  }

  return searchParams;
}

export default async function EmpresasAdminListPage({ searchParams }: PageProps) {
  await getEmpresasAdminContextOrRedirect();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = parseEmpresaListParams(toURLSearchParams(resolvedSearchParams));
  const [result, catalogos] = await Promise.all([
    listEmpresas({ params }),
    getEmpresaCatalogos(),
  ]);

  return (
    <EmpresasListView
      result={result}
      params={params}
      catalogFilters={{
        estados: catalogos.filtros.estados,
        gestores: catalogos.filtros.gestores,
        cajas: catalogos.filtros.cajas,
        zonas: catalogos.filtros.zonas,
        asesores: catalogos.filtros.asesores,
      }}
    />
  );
}
