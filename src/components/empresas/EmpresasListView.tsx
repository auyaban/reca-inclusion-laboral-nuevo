import Link from "next/link";
import { Plus, Search } from "lucide-react";
import {
  BackofficeBadge,
  BackofficeField,
  BackofficePageHeader,
  BackofficeTableCard,
  backofficeInputClassName,
} from "@/components/backoffice";
import SortableTableHeader from "@/components/backoffice/SortableTableHeader";
import type { EmpresaSortField } from "@/lib/empresas/schemas";

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
    sort: EmpresaSortField;
    direction: "asc" | "desc";
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
    <BackofficeField label={label}>
      <select name={name} defaultValue={value} className={backofficeInputClassName}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </BackofficeField>
  );
}

export default function EmpresasListView({
  result,
  params,
  catalogFilters,
}: EmpresasListViewProps) {
  const previousPage = Math.max(result.page - 1, 1);
  const nextPage = Math.min(result.page + 1, Math.max(result.totalPages, 1));
  const buildHref = (
    overrides: Partial<{
      page: number;
      sort: EmpresaSortField;
      direction: "asc" | "desc";
    }>
  ) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        searchParams.set(key, value);
      }
    }
    if (overrides.sort) {
      searchParams.set("sort", overrides.sort);
    }
    if (overrides.direction) {
      searchParams.set("direction", overrides.direction);
    }
    searchParams.set("page", String(overrides.page ?? result.page));
    searchParams.set("pageSize", String(result.pageSize));
    return `?${searchParams.toString()}`;
  };
  const pageHref = (page: number) => buildHref({ page });
  const sortHref = (sort: EmpresaSortField) => {
    const active = params.sort === sort;
    return buildHref({
      page: 1,
      sort,
      direction: active && params.direction === "asc" ? "desc" : "asc",
    });
  };
  const sortableHeader = (label: string, sort: EmpresaSortField) => (
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
        eyebrow="Empresas"
        title="Empresas registradas"
        description={`${result.total} registros activos en el backoffice.`}
        action={
          <Link
            href="/hub/empresas/admin/empresas/nueva"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-reca-800 shadow-sm transition hover:bg-reca-50"
          >
            <Plus className="h-4 w-4" />
            Nueva empresa
          </Link>
        }
      />

      <form className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <input type="hidden" name="sort" value={params.sort} />
        <input type="hidden" name="direction" value={params.direction} />
        <input type="hidden" name="pageSize" value={result.pageSize} />
        <div className="grid gap-3 lg:grid-cols-[2fr_repeat(5,1fr)_auto]">
          <BackofficeField label="Búsqueda">
            <span className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5">
              <Search className="h-4 w-4 text-gray-600" />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Buscar por nombre, NIT, ciudad o contacto"
                className="min-w-0 flex-1 text-sm text-gray-900 outline-none"
              />
            </span>
          </BackofficeField>
          <SelectFilter
            name="estado"
            label="Estado"
            value={params.estado}
            options={catalogFilters.estados}
          />
          <SelectFilter
            name="gestion"
            label="Gestión"
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
            className="self-end rounded-xl border border-reca bg-white px-4 py-2.5 text-sm font-bold text-reca-800 transition hover:bg-reca-50"
          >
            Filtrar
          </button>
        </div>
      </form>

      <BackofficeTableCard
        empty={
          result.items.length === 0
            ? {
                title: "No hay empresas para mostrar",
                description: "Ajusta los filtros o crea una empresa nueva.",
              }
            : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-700">
              <tr>
                {sortableHeader("Nombre", "nombre_empresa")}
                {sortableHeader("NIT", "nit_empresa")}
                {sortableHeader("Ciudad", "ciudad_empresa")}
                {sortableHeader("Gestión", "gestion")}
                {sortableHeader("Profesional", "profesional_asignado")}
                {sortableHeader("Asesor", "asesor")}
                {sortableHeader("Estado", "estado")}
                {sortableHeader("Última edición", "updated_at")}
                <th className="px-4 py-3 text-gray-700" scope="col">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.items.map((empresa) => (
                <tr key={empresa.id} className="align-top transition hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {empresa.nombre_empresa}
                    <p className="mt-0.5 text-xs font-medium text-gray-700">
                      {empresa.sede_empresa ?? "Sin sede"} ·{" "}
                      {empresa.zona_empresa ?? "Sin zona"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {empresa.nit_empresa ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {empresa.ciudad_empresa ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {empresa.gestion ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {empresa.profesional_asignado ?? "Sin asignar"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {empresa.asesor ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <BackofficeBadge tone={estadoTone(empresa.estado)}>
                      {empresa.estado ?? "Sin estado"}
                    </BackofficeBadge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(empresa.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/hub/empresas/admin/empresas/${empresa.id}`}
                      aria-label={`Abrir ${empresa.nombre_empresa}`}
                      className="font-bold text-reca-800 hover:text-reca-900"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BackofficeTableCard>

      <div className="flex items-center justify-between text-sm text-gray-700">
        <Link
          href={pageHref(previousPage)}
          aria-disabled={result.page <= 1}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Anterior
        </Link>
        <span className="font-semibold">
          Página {result.page} de {Math.max(result.totalPages, 1)}
        </span>
        <Link
          href={pageHref(nextPage)}
          aria-disabled={result.page >= result.totalPages}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Siguiente
        </Link>
      </div>
    </main>
  );
}
