import { notFound, redirect } from "next/navigation";
import { BackofficePageHeader } from "@/components/backoffice";
import EmpresaLifecycleTreeView from "@/components/empresas/EmpresaLifecycleTreeView";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getEmpresaLifecycleTree } from "@/lib/empresas/lifecycle-tree-server";
import { EmpresaServerError } from "@/lib/empresas/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmpresaLifecyclePage({ params }: PageProps) {
  const context = await getCurrentUserContext();
  if (
    !context.ok ||
    (!context.roles.includes("inclusion_empresas_admin") &&
      !context.roles.includes("inclusion_empresas_profesional"))
  ) {
    redirect("/hub");
  }

  if (context.profile.authPasswordTemp) {
    redirect("/auth/cambiar-contrasena-temporal");
  }

  const { id } = await params;
  let tree;
  try {
    tree = await getEmpresaLifecycleTree({ empresaId: id });
  } catch (error) {
    if (error instanceof EmpresaServerError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        backHref={`/hub/empresas/${id}`}
        backLabel="Volver al detalle"
        description="Vista read-only construida desde evidencia finalizada."
        eyebrow="Ciclo de vida"
        title={tree.empresa.nombreEmpresa ?? "Empresa sin nombre"}
      />
      <EmpresaLifecycleTreeView tree={tree} />
    </main>
  );
}
