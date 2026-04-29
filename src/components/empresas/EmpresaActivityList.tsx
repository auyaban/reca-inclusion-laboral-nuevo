import { History } from "lucide-react";
import {
  BackofficeFeedback,
  BackofficeSectionCard,
} from "@/components/backoffice";

type EmpresaActivityEvent = {
  id: string;
  tipo: string | null;
  actor_nombre: string | null;
  resumen: string;
  detalle?: string | null;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default function EmpresaActivityList({
  events,
}: {
  events: EmpresaActivityEvent[];
}) {
  return (
    <BackofficeSectionCard
      title="Actividad reciente"
      description="Cambios relevantes para seguimiento operativo."
      icon={History}
      accent="teal"
    >
      {events.length === 0 ? (
        <BackofficeFeedback variant="empty">
          Todavía no hay actividad registrada.
        </BackofficeFeedback>
      ) : (
        <ol className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="border-l-4 border-reca-200 pl-4">
              <p className="text-sm font-semibold text-gray-900">
                {event.resumen}
              </p>
              {event.detalle ? (
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {event.detalle}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-semibold text-gray-600">
                {event.actor_nombre ?? "Sistema"} · {formatDateTime(event.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </BackofficeSectionCard>
  );
}
