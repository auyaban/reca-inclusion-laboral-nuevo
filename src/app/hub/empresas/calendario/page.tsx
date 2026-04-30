import { redirect } from "next/navigation";
import {
  BackofficeBadge,
  BackofficePageHeader,
  BackofficeSectionCard,
} from "@/components/backoffice";
import { getCurrentUserContext } from "@/lib/auth/roles";

export default async function EmpresasCalendarioPage() {
  const context = await getCurrentUserContext();
  if (
    !context.ok ||
    (!context.roles.includes("inclusion_empresas_admin") &&
      !context.roles.includes("inclusion_empresas_profesional"))
  ) {
    redirect("/hub");
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="Empresas"
        title="Calendario"
        description="La planeación semanal se construirá en la siguiente fase. Por ahora esta entrada queda visible para alinear el flujo operativo."
      />
      <BackofficeSectionCard
        title="Calendario en preparación"
        description="Primero se habilita Mis empresas con búsqueda, notas y detalle read-only. La integración de calendario interno llega después."
      >
        <BackofficeBadge tone="warning">En preparación</BackofficeBadge>
      </BackofficeSectionCard>
    </main>
  );
}
