type EmpresaActivityEvent = {
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

export default function EmpresaActivityList({
  events,
}: {
  events: EmpresaActivityEvent[];
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">Actividad reciente</h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          Todavia no hay actividad registrada.
        </p>
      ) : (
        <ol className="mt-4 space-y-4">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-reca-200 pl-4">
              <p className="text-sm font-semibold text-gray-900">
                {event.resumen}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {event.actor_nombre ?? "Sistema"} · {formatDateTime(event.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
