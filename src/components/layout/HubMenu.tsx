"use client";

import { type ElementType, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDraftsCount } from "@/hooks/useDraftsCount";
import DraftsDrawer from "@/components/layout/DraftsHub";
import { getActaTabLinkProps } from "@/lib/actaTabs";
import {
  Building2,
  ClipboardCheck,
  Briefcase,
  UserCheck,
  FileSignature,
  BookOpen,
  Wrench,
  Users,
  BarChart3,
  LogOut,
  ChevronRight,
  Bell,
  ExternalLink,
  FileClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormCard {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  color: string;
  href: string;
  badge?: string;
}

const FORMS: FormCard[] = [
  {
    id: "presentacion",
    title: "Presentación del Programa",
    description: "Registro inicial de visita y presentación a la empresa.",
    icon: Building2,
    color: "from-violet-500 to-purple-600",
    href: "/formularios/presentacion",
  },
  {
    id: "evaluacion",
    title: "Evaluación de Accesibilidad",
    description: "Diagnóstico de condiciones físicas y actitudinales de la empresa.",
    icon: ClipboardCheck,
    color: "from-blue-500 to-indigo-600",
    href: "/formularios/evaluacion",
  },
  {
    id: "condiciones-vacante",
    title: "Condiciones de la Vacante",
    description: "Análisis y perfilamiento del cargo a cubrir.",
    icon: Briefcase,
    color: "from-cyan-500 to-blue-600",
    href: "/formularios/condiciones-vacante",
  },
  {
    id: "seleccion",
    title: "Selección Incluyente",
    description: "Acompañamiento al proceso de selección de candidatos.",
    icon: UserCheck,
    color: "from-teal-500 to-cyan-600",
    href: "/formularios/seleccion",
  },
  {
    id: "contratacion",
    title: "Contratación Incluyente",
    description: "Seguimiento al proceso de contratación con enfoque inclusivo.",
    icon: FileSignature,
    color: "from-green-500 to-teal-600",
    href: "/formularios/contratacion",
  },
  {
    id: "induccion-organizacional",
    title: "Inducción Organizacional",
    description: "Registro del proceso de inducción general a la empresa.",
    icon: BookOpen,
    color: "from-lime-500 to-green-600",
    href: "/formularios/induccion-organizacional",
  },
  {
    id: "induccion-operativa",
    title: "Inducción Operativa",
    description: "Registro del entrenamiento específico en el puesto de trabajo.",
    icon: Wrench,
    color: "from-amber-500 to-orange-600",
    href: "/formularios/induccion-operativa",
  },
  {
    id: "sensibilizacion",
    title: "Sensibilización",
    description: "Talleres y actividades de sensibilización al equipo de trabajo.",
    icon: Users,
    color: "from-orange-500 to-red-500",
    href: "/formularios/sensibilizacion",
  },
  {
    id: "seguimientos",
    title: "Seguimientos",
    description: "Registro periódico de seguimiento al trabajador vinculado.",
    icon: BarChart3,
    color: "from-rose-500 to-pink-600",
    href: "/formularios/seguimientos",
    badge: "Nuevo",
  },
];

export default function HubMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const { draftsCount } = useDraftsCount();
  const userName = user?.email?.split("@")[0] ?? "Profesional";
  const draftsPanelOpen = searchParams.get("panel") === "drafts";

  useEffect(() => {
    document.title = draftsPanelOpen ? "Hub | Borradores" : "Hub";
  }, [draftsPanelOpen]);

  function setDraftsPanel(open: boolean) {
    const params = new URLSearchParams(searchParams.toString());

    if (open) {
      params.set("panel", "drafts");
    } else {
      params.delete("panel");
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.push(nextUrl, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-reca shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-white">RECA</p>
                <p className="mt-0.5 text-xs leading-none text-reca-200">
                  Inclusión Laboral
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftsPanel(!draftsPanelOpen)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-white transition-colors",
                  draftsPanelOpen
                    ? "border-white/20 bg-white/20"
                    : "border-white/15 bg-white/10 hover:bg-white/20"
                )}
              >
                <FileClock className="h-4 w-4" />
                Borradores ({draftsCount})
              </button>
              <button
                className="rounded-lg p-2 text-reca-100 transition-colors hover:bg-white/10"
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="mx-1 h-6 w-px bg-white/20" />
              <div className="flex items-center gap-2">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-medium leading-none text-white">
                    {userName}
                  </p>
                  <p className="mt-0.5 text-xs leading-none text-reca-200">
                    En línea
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                  {userName.charAt(0)}
                </div>
              </div>
              <button
                onClick={signOut}
                className="rounded-lg p-2 text-reca-100 transition-colors hover:bg-white/10"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-reca-800 to-reca-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Buenas prácticas de empleo inclusivo
          </h1>
          <p className="mt-2 max-w-xl text-sm text-reca-100 sm:text-base">
            Selecciona el formulario que necesitas diligenciar. Cada acta se abrirá
            en una pestaña nueva y el hub quedará disponible como tablero principal.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FORMS.map((form) => (
            <FormCardItem key={form.id} form={form} />
          ))}
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-400">
            RECA – Red Empleo con Apoyo · Buenas prácticas de empleo inclusivo
          </p>
        </div>
      </main>

      <DraftsDrawer
        open={draftsPanelOpen}
        onClose={() => setDraftsPanel(false)}
      />
    </div>
  );
}

function FormCardItem({ form }: { form: FormCard }) {
  const Icon = form.icon;

  return (
    <a
      {...getActaTabLinkProps(form.href)}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-reca-300 hover:shadow-lg"
      )}
    >
      {form.badge && (
        <span className="absolute right-4 top-4 rounded-full bg-reca px-2 py-0.5 text-[10px] font-bold text-white">
          {form.badge}
        </span>
      )}

      <div
        className={cn(
          "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br",
          form.color
        )}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>

      <h3 className="mb-1.5 text-sm font-semibold leading-tight text-gray-900">
        {form.title}
      </h3>
      <p className="flex-1 text-xs leading-relaxed text-gray-500">
        {form.description}
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-reca transition-all group-hover:gap-2">
        Abrir en nueva pestaña
        <ExternalLink className="h-3.5 w-3.5" />
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </a>
  );
}
