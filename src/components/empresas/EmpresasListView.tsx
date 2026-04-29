import Link from "next/link";
import { Plus, Search } from "lucide-react";

type EmpresaListItem = {
  id: string;
  nombre_empresa: string;
  nit_empresa: string | null;
  ciudad_empresa: string | null;
  sede_empresa: string | null;
  gestion: string | null;
  profesional_asignado: string | null;
  asesor: string | null;
  caja_compensacion: string | null;
  zona_empresa: string | null;
  estado: string | null;
  updated_at: string | null;
};

type EmpresasListResult = {
  items: EmpresaListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type CatalogFilters = {
  estados: string[];
  gestores: string[];
  cajas: string[];
  zonas: string[];
  asesores: string[];
};

type EmpresasListViewProps = {
  result: EmpresasListResult;
  params: {
    q: string;
    estado: string;
    gestion: string;
    caja: string;
    zona: string;
    asesor: string;
  };
  catalogFilters: CatalogFilters;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function SelectFilter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <label className="text-xs font-semibold text-gray-600">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function EmpresasListView({
  result,
  params,
  catalogFilters,
}: EmpresasListViewProps) {
  const previousPage = Math.max(result.page - 1, 1);
  const nextPage = Math.min(result.page + 1, Math.max(result.totalPages, 1));
  const pageHref = (page: number) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        searchParams.set(key, value);
      }
    }
    searchParams.set("page", String(page));
    searchParams.set("pageSize", String(result.pageSize));
    return `?${searchParams.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-reca">Empresas</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Empresas registradas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {result.total} registros activos en el backoffice.
          </p>
        </div>
        <Link
          href="/hub/empresas/admin/empresas/nueva"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-reca px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-reca-700"
        >
          <Plus className="h-4 w-4" />
          Nueva empresa
        </Link>
      </div>

      <form className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[2fr_repeat(5,1fr)_auto]">
          <label className="text-xs font-semibold text-gray-600">
            Busqueda
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Buscar por nombre, NIT, ciudad o contacto"
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </span>
          </label>
          <SelectFilter
            name="estado"
            label="Estado"
            value={params.estado}
            options={catalogFilters.estados}
          />
          <SelectFilter
            name="gestion"
            label="Gestion"
            value={params.gestion}
            options={catalogFilters.gestores}
          />
          <SelectFilter
            name="caja"
            label="Caja"
            value={params.caja}
            options={catalogFilters.cajas}
          />
          <SelectFilter
            name="zona"
            label="Zona"
            value={params.zona}
            options={catalogFilters.zonas}
          />
          <SelectFilter
            name="asesor"
            label="Asesor"
            value={params.asesor}
            options={catalogFilters.asesores}
          />
          <button
            type="submit"
            className="self-end rounded-lg border border-reca bg-white px-4 py-2 text-sm font-semibold text-reca hover:bg-reca-50"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {result.items.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-base font-semibold text-gray-900">
              No hay empresas para mostrar
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Ajusta los filtros o crea una empresa nueva.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">NIT</th>
                  <th className="px-4 py-3">Ciudad</th>
                  <th className="px-4 py-3">Gestion</th>
                  <th className="px-4 py-3">Profesional</th>
                  <th className="px-4 py-3">Asesor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ultima edicion</th>
                  <th className="px-4 py-3">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.items.map((empresa) => (
                  <tr key={empresa.id} className="align-top">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {empresa.nombre_empresa}
                      <p className="mt-0.5 text-xs font-normal text-gray-500">
                        {empresa.sede_empresa ?? "Sin sede"} ·{" "}
                        {empresa.zona_empresa ?? "Sin zona"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {empresa.nit_empresa ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {empresa.ciudad_empresa ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {empresa.gestion ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {empresa.profesional_asignado ?? "Sin asignar"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {empresa.asesor ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {empresa.estado ?? "Sin estado"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(empresa.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/hub/empresas/admin/empresas/${empresa.id}`}
                        aria-label={`Abrir ${empresa.nombre_empresa}`}
                        className="font-semibold text-reca hover:text-reca-700"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <Link
          href={pageHref(previousPage)}
          aria-disabled={result.page <= 1}
          className="rounded-lg border border-gray-200 px-3 py-2 font-semibold aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          Anterior
        </Link>
        <span>
          Pagina {result.page} de {Math.max(result.totalPages, 1)}
        </span>
        <Link
          href={pageHref(nextPage)}
          aria-disabled={result.page >= result.totalPages}
          className="rounded-lg border border-gray-200 px-3 py-2 font-semibold aria-disabled:pointer-events-none aria-disabled:opacity-40"
        >
          Siguiente
        </Link>
      </div>
    </main>
  );
}
