import { History } from "lucide-react";
import {
  BackofficeFeedback,
  BackofficeSectionCard,
} from "@/components/backoffice";

type ProfesionalEvent = {
  id: string;
  tipo: string | null;
  actor_nombre: string | null;
  resumen: string;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default function ProfesionalActivityList({
  eventos,
}: {
  eventos: ProfesionalEvent[];
}) {
  return (
    <BackofficeSectionCard
      title="Actividad reciente"
      description="Acciones sensibles y cambios de acceso."
      icon={History}
      accent="teal"
    >
      {eventos.length === 0 ? (
        <BackofficeFeedback variant="empty">
          Sin actividad registrada.
        </BackofficeFeedback>
      ) : (
        <ol className="space-y-4">
          {eventos.map((evento) => (
            <li key={evento.id} className="border-l-4 border-reca-200 pl-4">
              <p className="text-sm font-semibold text-gray-900">
                {evento.resumen}
              </p>
              <p className="mt-2 text-xs font-semibold text-gray-600">
                {evento.actor_nombre ?? "Sistema"} · {formatDateTime(evento.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </BackofficeSectionCard>
  );
}
