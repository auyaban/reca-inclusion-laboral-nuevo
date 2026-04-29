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
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">Actividad reciente</h2>
      {eventos.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">Sin actividad registrada.</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {eventos.map((evento) => (
            <li key={evento.id} className="border-l-2 border-reca-100 pl-4">
              <p className="text-sm font-semibold text-gray-900">
                {evento.resumen}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {evento.actor_nombre ?? "Sistema"} · {formatDateTime(evento.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
