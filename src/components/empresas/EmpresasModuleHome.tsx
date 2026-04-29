import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  Handshake,
  Lock,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_SECTIONS = [
  {
    id: "empresas",
    title: "Empresas",
    description: "Gestión de empresas y clientes",
    href: "/hub/empresas/admin/empresas",
    icon: Building2,
    enabled: true,
  },
  {
    id: "asesores",
    title: "Asesores",
    description: "Asesores de Compensar",
    href: null,
    icon: Handshake,
    enabled: false,
  },
  {
    id: "gestores",
    title: "Gestores",
    description: "Gestores de empleo",
    href: null,
    icon: UserCog,
    enabled: false,
  },
  {
    id: "profesionales",
    title: "Profesionales",
    description: "Profesionales de RECA",
    href: "/hub/empresas/admin/profesionales",
    icon: BriefcaseBusiness,
    enabled: true,
  },
  {
    id: "interpretes",
    title: "Intérpretes",
    description: "Intérpretes de lengua de señas",
    href: null,
    icon: Users,
    enabled: false,
  },
] as const;

export default function EmpresasModuleHome({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-reca text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
            Módulo operativo en preparación. Las vistas para profesionales se
            habilitarán en una fase posterior.
          </p>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-reca-800 to-reca-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Empresas</h1>
          <p className="mt-2 max-w-2xl text-sm text-reca-100 sm:text-base">
            Backoffice de gerencia para administrar empresas, asignaciones y
            datos maestros del módulo.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ADMIN_SECTIONS.map((section) => {
            const Icon = section.icon;
            const content = (
              <>
                <div
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                    section.enabled ? "bg-reca text-white" : "bg-gray-100 text-gray-400"
                  )}
                >
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
                  <p className="mt-1 text-sm text-gray-500">
                    {section.description}
                  </p>
                </div>
                {!section.enabled ? (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Próximamente
                  </span>
                ) : null}
              </>
            );

            if (!section.enabled || !section.href) {
              return (
                <div
                  key={section.id}
                  aria-disabled="true"
                  className="relative flex min-h-36 flex-col justify-between rounded-lg border border-gray-200 bg-gray-50/80 p-5 opacity-85"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={section.id}
                href={section.href}
                className="relative flex min-h-36 flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-reca-300 hover:shadow-md"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
