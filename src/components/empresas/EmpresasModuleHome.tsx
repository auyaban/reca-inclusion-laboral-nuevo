import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  Handshake,
  Lock,
  UserCog,
  Users,
} from "lucide-react";
import {
  BackofficeBadge,
  BackofficePageHeader,
  BackofficeSectionCard,
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
    href: null,
    icon: Handshake,
    accent: "teal",
    enabled: false,
  },
  {
    id: "gestores",
    title: "Gestores",
    description: "Gestores de empleo",
    href: null,
    icon: UserCog,
    accent: "teal",
    enabled: false,
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
    href: null,
    icon: Users,
    accent: "teal",
    enabled: false,
  },
] as const;

export default function EmpresasModuleHome({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BackofficeSectionCard
          title="Empresas"
          description="Módulo operativo en preparación. Las vistas para profesionales se habilitarán en una fase posterior."
          icon={Building2}
        >
          <BackofficeBadge tone="warning">Próximamente</BackofficeBadge>
        </BackofficeSectionCard>
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
