import ProfesionalesListView from "@/components/profesionales/ProfesionalesListView";
import { getEmpresasAdminContextOrRedirect } from "@/lib/empresas/access";
import { listProfesionales } from "@/lib/profesionales/server";
import { parseProfesionalListParams } from "@/lib/profesionales/schemas";

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

export default async function ProfesionalesAdminListPage({
  searchParams,
}: PageProps) {
  await getEmpresasAdminContextOrRedirect();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = parseProfesionalListParams(
    toURLSearchParams(resolvedSearchParams)
  );
  const result = await listProfesionales({ params });

  return <ProfesionalesListView result={result} params={params} />;
}
