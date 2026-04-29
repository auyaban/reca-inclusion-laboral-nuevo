import { Building2, Clock3 } from "lucide-react";

export default function EmpresasPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-reca text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Próximamente las pestañas de Mis empresas, Reclamar y Calendario.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <Clock3 className="h-4 w-4" />
            En preparación
          </div>
        </div>
      </section>
    </main>
  );
}
