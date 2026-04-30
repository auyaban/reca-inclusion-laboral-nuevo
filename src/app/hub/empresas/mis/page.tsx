import { redirect } from "next/navigation";
import MisEmpresasView from "@/components/empresas/MisEmpresasView";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { listMisEmpresas } from "@/lib/empresas/lifecycle-queries";
import { parseMisEmpresasListParams } from "@/lib/empresas/lifecycle-schemas";

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

export default async function MisEmpresasPage({ searchParams }: PageProps) {
  const context = await getCurrentUserContext();
  if (
    !context.ok ||
    (!context.roles.includes("inclusion_empresas_admin") &&
      !context.roles.includes("inclusion_empresas_profesional"))
  ) {
    redirect("/hub");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = parseMisEmpresasListParams(toURLSearchParams(resolvedSearchParams));
  const result = await listMisEmpresas({
    actor: {
      userId: context.user.id,
      profesionalId: context.profile.id,
      nombre: context.profile.displayName,
    },
    params,
  });

  return <MisEmpresasView result={result} params={params} />;
}
