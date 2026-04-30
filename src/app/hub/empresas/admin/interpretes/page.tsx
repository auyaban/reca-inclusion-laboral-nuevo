import CatalogosListView from "@/components/catalogos/CatalogosListView";
import { getEmpresasAdminContextOrRedirect } from "@/lib/empresas/access";
import { listCatalogoRecords } from "@/lib/catalogos/server";
import { parseCatalogoListParams } from "@/lib/catalogos/schemas";

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

export default async function InterpretesAdminPage({ searchParams }: PageProps) {
  await getEmpresasAdminContextOrRedirect();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = parseCatalogoListParams(
    "interpretes",
    toURLSearchParams(resolvedSearchParams)
  );
  const result = await listCatalogoRecords({ kind: "interpretes", params });

  return <CatalogosListView kind="interpretes" result={result} params={params} />;
}
