import { redirect } from "next/navigation";
import EmpresaOperativaDetailView from "@/components/empresas/EmpresaOperativaDetailView";
import { getCurrentUserContext } from "@/lib/auth/roles";
import {
  getEmpresaOperativaDetail,
  listEmpresaEventosOperativos,
} from "@/lib/empresas/lifecycle-queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmpresaOperativaDetailPage({ params }: PageProps) {
  const context = await getCurrentUserContext();
  if (
    !context.ok ||
    (!context.roles.includes("inclusion_empresas_admin") &&
      !context.roles.includes("inclusion_empresas_profesional"))
  ) {
    redirect("/hub");
  }

  const { id } = await params;
  const actor = {
    userId: context.user.id,
    profesionalId: context.profile.id,
    nombre: context.profile.displayName,
  };
  const [empresa, notes, recentEvents] = await Promise.all([
    getEmpresaOperativaDetail({ empresaId: id, actor }),
    listEmpresaEventosOperativos({
      empresaId: id,
      params: { tipo: "nota", page: 1, pageSize: 5 },
    }),
    listEmpresaEventosOperativos({
      empresaId: id,
      params: { tipo: "todo", page: 1, pageSize: 8 },
    }),
  ]);

  return (
    <EmpresaOperativaDetailView
      empresa={empresa}
      notes={notes.items}
      recentEvents={recentEvents.items}
    />
  );
}
