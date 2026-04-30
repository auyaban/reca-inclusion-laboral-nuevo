import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Handshake,
  Lock,
  NotebookTabs,
  UserCog,
  Users,
} from "lucide-react";
import {
  BackofficeBadge,
  BackofficePageHeader,
} from "@/components/backoffice";
import { cn } from "@/lib/utils";

const ADMIN_SECTIONS = [
  {
    id: "empresas",
    title: "Empresas",
    description: "Gestión de empresas y clientes",
    href: "/hub/empresas/admin/empresas",
    icon: Building2,
    accent: "reca",
    enabled: true,
  },
  {
    id: "asesores",
    title: "Asesores",
    description: "Asesores de Compensar",
    href: "/hub/empresas/admin/asesores",
    icon: Handshake,
    accent: "teal",
    enabled: true,
  },
  {
    id: "gestores",
    title: "Gestores",
    description: "Gestores de empleo",
    href: "/hub/empresas/admin/gestores",
    icon: UserCog,
    accent: "teal",
    enabled: true,
  },
  {
    id: "profesionales",
    title: "Profesionales",
    description: "Profesionales de RECA",
    href: "/hub/empresas/admin/profesionales",
    icon: BriefcaseBusiness,
    accent: "teal",
    enabled: true,
  },
  {
    id: "interpretes",
    title: "Intérpretes",
    description: "Intérpretes de lengua de señas",
    href: "/hub/empresas/admin/interpretes",
    icon: Users,
    accent: "teal",
    enabled: true,
  },
] as const;

export default function EmpresasModuleHome({
  isAdmin,
  newCount = 0,
}: {
  isAdmin: boolean;
  newCount?: number;
}) {
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <BackofficePageHeader
          eyebrow="Empresas"
          title="Gestión de empresas"
          description="Consulta tus empresas asignadas, busca empresas activas y deja notas de seguimiento."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/hub/empresas/mis"
            className="relative flex min-h-40 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-reca-300 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-reca text-white">
                <NotebookTabs className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Mis empresas</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  Empresas asignadas, búsqueda operativa y notas explícitas.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <BackofficeBadge tone={newCount > 0 ? "danger" : "neutral"}>
                {newCount} {newCount === 1 ? "empresa nueva" : "empresas nuevas"}
              </BackofficeBadge>
              <span className="text-sm font-bold text-reca-800">Abrir</span>
            </div>
          </Link>

          <Link
            href="/hub/empresas/calendario"
            className="relative flex min-h-40 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Calendario</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  Planeación semanal y proyecciones del trabajo. En preparación.
                </p>
              </div>
            </div>
            <BackofficeBadge tone="warning">En preparación</BackofficeBadge>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="Backoffice"
        title="Empresas"
        description="Backoffice de gerencia para administrar empresas, asignaciones y datos maestros del módulo."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          const iconClassName = cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-xl",
            section.enabled
              ? section.accent === "teal"
                ? "bg-teal-600 text-white"
                : "bg-reca text-white"
              : "bg-gray-200 text-gray-700"
          );
          const content = (
            <>
              <div className={iconClassName}>
                {section.enabled ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <Lock className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-gray-700">
                  {section.description}
                </p>
              </div>
              {!section.enabled ? (
                <BackofficeBadge tone="warning" className="absolute right-4 top-4">
                  Próximamente
                </BackofficeBadge>
              ) : null}
            </>
          );

          if (!section.enabled || !section.href) {
            return (
              <div
                key={section.id}
                aria-disabled="true"
                className="relative flex min-h-36 flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={section.id}
              href={section.href}
              className="relative flex min-h-36 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-reca-300 hover:shadow-md"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
