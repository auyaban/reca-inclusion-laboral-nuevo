"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
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
  FileClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
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
  const { user, signOut } = useAuth();
  const { allDrafts } = useFormDraft({ loadAllDrafts: true });
  const userName = user?.email?.split("@")[0] ?? "Profesional";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-reca shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + nombre */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">RECA</p>
                <p className="text-reca-200 text-xs leading-none mt-0.5">
                  Inclusión Laboral
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <Link
                href="/hub/borradores"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              >
                <FileClock className="w-4 h-4" />
                Borradores ({allDrafts.length})
              </Link>
              <button
                className="p-2 rounded-lg text-reca-100 hover:bg-white/10 transition-colors"
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-white/20 mx-1" />
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-white text-xs font-medium leading-none">
                    {userName}
                  </p>
                  <p className="text-reca-200 text-xs leading-none mt-0.5">
                    En línea
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                  {userName.charAt(0)}
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-reca-100 hover:bg-white/10 transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero / bienvenida */}
      <div className="bg-gradient-to-r from-reca-800 to-reca-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Buenas prácticas de empleo inclusivo
          </h1>
          <p className="mt-2 text-reca-100 text-sm sm:text-base max-w-xl">
            Selecciona el formulario que necesitas diligenciar para registrar
            la visita a la empresa.
          </p>
        </div>
      </div>

      {/* Grid de formularios */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FORMS.map((form) => (
            <FormCardItem key={form.id} form={form} />
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-400 text-xs">
            RECA – Red Empleo con Apoyo · Buenas prácticas de empleo inclusivo
          </p>
        </div>
      </main>
    </div>
  );
}

function FormCardItem({ form }: { form: FormCard }) {
  const Icon = form.icon;

  return (
    <a
      href={form.href}
      className={cn(
        "group relative flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm p-5",
        "transition-all duration-200",
        "hover:shadow-lg hover:border-reca-300 hover:-translate-y-0.5"
      )}
    >
      {/* Badge */}
      {form.badge && (
        <span className="absolute top-4 right-4 bg-reca text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {form.badge}
        </span>
      )}

      {/* Ícono con gradiente */}
      <div
        className={cn(
          "inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br mb-4",
          form.color
        )}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Texto */}
      <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1.5">
        {form.title}
      </h3>
      <p className="text-xs text-gray-500 leading-relaxed flex-1">
        {form.description}
      </p>

      {/* CTA */}
      <div className="flex items-center gap-1 mt-4 text-reca text-xs font-semibold group-hover:gap-2 transition-all">
        Diligenciar
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </a>
  );
}
