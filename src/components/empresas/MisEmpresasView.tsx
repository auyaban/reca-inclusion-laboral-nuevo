import Link from "next/link";
import { NotebookTabs } from "lucide-react";
import {
  BackofficeBadge,
  BackofficePageHeader,
  BackofficeTableCard,
  SortableTableHeader,
} from "@/components/backoffice";
import EmpresaOperativaSearch from "@/components/empresas/EmpresaOperativaSearch";
import { BROWSER_AUTOFILL_SEARCH_GUARD_PROPS } from "@/lib/browserAutofill";
import type {
  EmpresaMisListParams,
  MisEmpresasSortField,
} from "@/lib/empresas/lifecycle-schemas";
import type { MisEmpresasResult } from "@/lib/empresas/lifecycle-queries";

type MisEmpresasViewProps = {
  result: MisEmpresasResult;
  params: EmpresaMisListParams;
};

function estadoTone(value: string | null) {
  if (value === "Activa") {
    return "success" as const;
  }
  if (value === "En Proceso" || value === "Pausada") {
    return "warning" as const;
  }
  if (value === "Cerrada" || value === "Inactiva") {
    return "neutral" as const;
  }
  return "info" as const;
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default function MisEmpresasView({ result, params }: MisEmpresasViewProps) {
  const previousPage = Math.max(result.page - 1, 1);
  const nextPage = Math.min(result.page + 1, Math.max(result.totalPages, 1));
  const buildHref = (
    overrides: Partial<{
      page: number;
      sort: MisEmpresasSortField;
      direction: "asc" | "desc";
      nuevas: boolean;
    }>
  ) => {
    const searchParams = new URLSearchParams();
    if (params.q) {
      searchParams.set("q", params.q);
    }
    if (params.estado) {
      searchParams.set("estado", params.estado);
    }
    if (overrides.nuevas ?? params.nuevas) {
      searchParams.set("nuevas", "true");
    }
    searchParams.set("sort", overrides.sort ?? params.sort);
    searchParams.set("direction", overrides.direction ?? params.direction);
    searchParams.set("page", String(overrides.page ?? result.page));
    searchParams.set("pageSize", String(result.pageSize));
    return `?${searchParams.toString()}`;
  };
  const sortHref = (sort: MisEmpresasSortField) => {
    const active = params.sort === sort;
    return buildHref({
      page: 1,
      sort,
      direction: active && params.direction === "asc" ? "desc" : "asc",
    });
  };
  const sortableHeader = (label: string, sort: MisEmpresasSortField) => (
    <SortableTableHeader
      label={label}
      href={sortHref(sort)}
      active={params.sort === sort}
      direction={params.direction}
    />
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="Profesional Inclusión"
        title="Mis empresas"
        description="Empresas asignadas, búsqueda de empresas activas y seguimiento operativo."
      />

      <Link
        href={buildHref({ page: 1, nuevas: true })}
        className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm transition hover:border-red-300 hover:bg-red-100 sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white">
            <NotebookTabs className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-bold text-red-950">
              {result.newCount}{" "}
              {result.newCount === 1 ? "empresa nueva" : "empresas nuevas"}
            </span>
            <span className="mt-1 block text-sm font-semibold text-red-900">
              Revisa las empresas asignadas recientemente y deja una nota explícita
              para cerrar la alerta.
            </span>
          </span>
        </span>
        <span className="text-sm font-bold text-red-900">Ver nuevas</span>
      </Link>

      <EmpresaOperativaSearch />

      <form
        action="/hub/empresas/mis"
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_220px_auto]"
      >
        <input type="hidden" name="sort" value={params.sort} />
        <input type="hidden" name="direction" value={params.direction} />
        <input type="hidden" name="pageSize" value={result.pageSize} />
        <label className="text-sm font-bold text-gray-900">
          Buscar mis empresas
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Nombre o NIT"
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-reca focus:outline-none focus:ring-2 focus:ring-reca/20"
            {...BROWSER_AUTOFILL_SEARCH_GUARD_PROPS}
          />
        </label>
        <label className="text-sm font-bold text-gray-900">
          Estado
          <select
            name="estado"
            defaultValue={params.estado}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-reca focus:outline-none focus:ring-2 focus:ring-reca/20"
          >
            <option value="">Todos</option>
            <option value="Activa">Activa</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Pausada">Pausada</option>
            <option value="Cerrada">Cerrada</option>
            <option value="Inactiva">Inactiva</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-reca px-4 text-sm font-bold text-white shadow-sm transition hover:bg-reca-800"
          >
            Filtrar
          </button>
          {params.nuevas ? (
            <Link
              href={buildHref({ page: 1, nuevas: false })}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50"
            >
              Ver todas
            </Link>
          ) : null}
        </div>
      </form>

      <BackofficeTableCard
        empty={
          result.items.length === 0
            ? {
                title: "No hay empresas para mostrar",
                description:
                  "Ajusta la búsqueda o cambia el filtro de estado para revisar tus empresas.",
              }
            : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-700">
              <tr>
                {sortableHeader("Nombre", "nombre")}
                {sortableHeader("NIT", "nit")}
                {sortableHeader("Estado", "estado")}
                {sortableHeader("Último formato", "ultimoFormato")}
                <th className="px-4 py-3 text-gray-700" scope="col">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.items.map((empresa) => {
                const ultimoFormatoDate = formatDate(empresa.ultimoFormatoAt);

                return (
                  <tr
                    key={empresa.id}
                    className="align-top transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">
                      <span>{empresa.nombreEmpresa ?? "Empresa sin nombre"}</span>
                      {empresa.esNueva ? (
                        <BackofficeBadge tone="danger" className="ml-2">
                          Nueva
                        </BackofficeBadge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {empresa.nitEmpresa ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <BackofficeBadge tone={estadoTone(empresa.estado)}>
                        {empresa.estado ?? "Sin estado"}
                      </BackofficeBadge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {empresa.ultimoFormatoNombre ? (
                        <>
                          <span className="font-bold text-gray-900">
                            {empresa.ultimoFormatoNombre}
                          </span>
                          <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                            {ultimoFormatoDate ?? "Sin fecha"}
                          </span>
                        </>
                      ) : (
                        "Sin formatos"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/hub/empresas/${empresa.id}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Abrir ${empresa.nombreEmpresa ?? "empresa"}`}
                        className="font-bold text-reca-800 hover:text-reca-900"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BackofficeTableCard>

      <div className="flex items-center justify-between text-sm text-gray-700">
        <Link
          href={buildHref({ page: previousPage })}
          aria-disabled={result.page <= 1}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Anterior
        </Link>
        <span className="font-semibold">
          Página {result.page} de {Math.max(result.totalPages, 1)}
        </span>
        <Link
          href={buildHref({ page: nextPage })}
          aria-disabled={result.page >= result.totalPages}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Siguiente
        </Link>
      </div>
    </main>
  );
}
