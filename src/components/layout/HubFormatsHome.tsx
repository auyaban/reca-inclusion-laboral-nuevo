import { Suspense, type ElementType } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileSignature,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { getHubDraftsData } from "@/lib/drafts/hubInitialData";
import { cn } from "@/lib/utils";

interface FormCard {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  color: string;
  href: string;
  available: boolean;
  badge?: string;
}

type FormBadgeVariant = "static" | "draft" | "disabled";

export const FORMS: FormCard[] = [
  {
    id: "presentacion",
    title: "Presentación del Programa",
    description: "Registro inicial de visita y presentación a la empresa.",
    icon: Building2,
    color: "from-violet-500 to-purple-600",
    href: "/formularios/presentacion",
    available: true,
  },
  {
    id: "evaluacion",
    title: "Evaluación de Accesibilidad",
    description: "Diagnóstico de condiciones físicas y actitudinales de la empresa.",
    icon: ClipboardCheck,
    color: "from-blue-500 to-indigo-600",
    href: "/formularios/evaluacion",
    available: true,
  },
  {
    id: "condiciones-vacante",
    title: "Condiciones de la Vacante",
    description: "Análisis y perfilamiento del cargo a cubrir.",
    icon: Briefcase,
    color: "from-cyan-500 to-blue-600",
    href: "/formularios/condiciones-vacante",
    available: true,
  },
  {
    id: "seleccion",
    title: "Selección Incluyente",
    description: "Acompañamiento al proceso de selección de candidatos.",
    icon: UserCheck,
    color: "from-teal-500 to-cyan-600",
    href: "/formularios/seleccion",
    available: true,
  },
  {
    id: "contratacion",
    title: "Contratación Incluyente",
    description: "Seguimiento al proceso de contratación con enfoque inclusivo.",
    icon: FileSignature,
    color: "from-green-500 to-teal-600",
    href: "/formularios/contratacion",
    available: true,
  },
  {
    id: "induccion-organizacional",
    title: "Inducción Organizacional",
    description: "Registro del proceso de inducción general a la empresa.",
    icon: BookOpen,
    color: "from-lime-500 to-green-600",
    href: "/formularios/induccion-organizacional",
    available: true,
  },
  {
    id: "induccion-operativa",
    title: "Inducción Operativa",
    description: "Registro del entrenamiento específico en el puesto de trabajo.",
    icon: Wrench,
    color: "from-amber-500 to-orange-600",
    href: "/formularios/induccion-operativa",
    available: true,
  },
  {
    id: "sensibilizacion",
    title: "Sensibilización",
    description: "Talleres y actividades de sensibilización al equipo de trabajo.",
    icon: Users,
    color: "from-orange-500 to-red-500",
    href: "/formularios/sensibilizacion",
    available: true,
  },
  {
    id: "interprete-lsc",
    title: "Intérprete LSC",
    description: "Servicio de interpretación LSC con control de participantes, intérpretes y horas.",
    icon: Users,
    color: "from-fuchsia-500 to-pink-600",
    href: "/formularios/interprete-lsc",
    available: true,
    badge: "Nuevo",
  },
  {
    id: "seguimientos",
    title: "Seguimientos",
    description: "Registro periódico de seguimiento al trabajador vinculado.",
    icon: BarChart3,
    color: "from-rose-500 to-pink-600",
    href: "/formularios/seguimientos",
    available: true,
    badge: "Nuevo",
  },
];

export default function HubFormatsHome({
  initialUserId,
}: {
  initialUserId: string | null;
}) {
  return (
    <>
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
            <FormCardItem
              key={form.id}
              form={form}
              userId={initialUserId}
            />
          ))}
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-400">
            RECA - Red Empleo con Apoyo · Buenas prácticas de empleo inclusivo
          </p>
        </div>
      </main>
    </>
  );
}

function FormBadge({
  label,
  variant,
}: {
  label: string;
  variant: FormBadgeVariant;
}) {
  return (
    <span
      className={cn(
        "absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold",
        variant === "disabled"
          ? "bg-amber-100 text-amber-800"
          : variant === "draft"
            ? "bg-blue-100 text-blue-800"
            : "bg-reca text-white"
      )}
    >
      {label}
    </span>
  );
}

function getDraftBadgeLabel(count: number) {
  return `${count} ${count === 1 ? "borrador" : "borradores"}`;
}

export async function HubFormDraftBadge({
  formId,
  staticBadge,
  userId,
}: {
  formId: string;
  staticBadge?: string;
  userId: string | null;
}) {
  const { initialRemoteDrafts } = await getHubDraftsData(userId);
  const draftCount = initialRemoteDrafts.filter(
    (draft) => draft.form_slug === formId
  ).length;

  if (draftCount > 0) {
    return <FormBadge label={getDraftBadgeLabel(draftCount)} variant="draft" />;
  }

  if (staticBadge) {
    return <FormBadge label={staticBadge} variant="static" />;
  }

  return null;
}

function FormCardItem({
  form,
  userId,
}: {
  form: FormCard;
  userId: string | null;
}) {
  const Icon = form.icon;
  const badgeFallback = form.badge ? (
    <FormBadge label={form.badge} variant="static" />
  ) : null;
  const content = (
    <>
      {!form.available ? (
        <FormBadge label="Próximamente" variant="disabled" />
      ) : (
        <Suspense fallback={badgeFallback}>
          <HubFormDraftBadge
            formId={form.id}
            staticBadge={form.badge}
            userId={userId}
          />
        </Suspense>
      )}

      <div
        className={cn(
          "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br",
          form.available ? form.color : "from-gray-400 to-gray-500"
        )}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>

      <h3 className="mb-1.5 text-sm font-semibold leading-tight text-gray-900">
        {form.title}
      </h3>
      <p
        className={cn(
          "flex-1 text-xs leading-relaxed",
          form.available ? "text-gray-500" : "text-gray-400"
        )}
      >
        {form.description}
      </p>

      <div
        className={cn(
          "mt-4 flex items-center gap-1 text-xs font-semibold",
          form.available
            ? "text-reca transition-all group-hover:gap-2"
            : "text-gray-400"
        )}
      >
        {form.available ? "Abrir en nueva pestaña" : "Disponible pronto"}
        {form.available ? (
          <>
            <ExternalLink className="h-3.5 w-3.5" />
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        ) : null}
      </div>
    </>
  );
  const cardClassName = cn(
    "group relative flex w-full flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm",
    form.available
      ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-reca-300 hover:shadow-lg"
      : "cursor-not-allowed border-gray-200 bg-gray-50/80 opacity-80"
  );

  if (!form.available) {
    return (
      <div
        data-testid={`hub-form-card-${form.id}`}
        aria-disabled
        className={cardClassName}
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={form.href}
      target="_blank"
      rel="noopener noreferrer"
      data-analytics-event="hub_form_opened"
      data-form-id={form.id}
      data-testid={`hub-form-card-${form.id}`}
      className={cardClassName}
    >
      {content}
    </a>
  );
}
