import { notFound } from "next/navigation";
import ProfesionalActions from "@/components/profesionales/ProfesionalActions";
import ProfesionalActivityList from "@/components/profesionales/ProfesionalActivityList";
import ProfesionalForm from "@/components/profesionales/ProfesionalForm";
import { getEmpresasAdminContextOrRedirect } from "@/lib/empresas/access";
import {
  getProfesionalDetail,
  listProfesionalEventos,
} from "@/lib/profesionales/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProfesionalDetailPage({ params }: PageProps) {
  await getEmpresasAdminContextOrRedirect();
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);

  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const profesional = await getProfesionalDetail({
    id,
    includeDeleted: true,
  });

  if (!profesional) {
    notFound();
  }

  const eventos = await listProfesionalEventos({
    profesionalId: id,
    limit: 20,
  });

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
      <div className="min-w-0">
        <ProfesionalForm mode="edit" initialData={profesional} />
        <div className="mt-6">
          <ProfesionalActivityList eventos={eventos} />
        </div>
      </div>
      <ProfesionalActions profesional={profesional} />
    </div>
  );
}
