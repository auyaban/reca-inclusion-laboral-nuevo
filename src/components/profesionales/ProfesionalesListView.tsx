"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useState, useTransition } from "react";
import {
  BackofficeBadge,
  BackofficeField,
  BackofficePageHeader,
  BackofficeTableCard,
  SortableTableHeader,
  backofficeInputClassName,
} from "@/components/backoffice";
import { getAppRoleLabel, type AppRole } from "@/lib/auth/appRoles";
import { BROWSER_AUTOFILL_SEARCH_GUARD_PROPS } from "@/lib/browserAutofill";

type ProfesionalListItem = {
  id: number;
  nombre_profesional: string;
  correo_profesional: string | null;
  programa: string | null;
  antiguedad: number | null;
  usuario_login: string | null;
  auth_user_id: string | null;
  auth_password_temp: boolean;
  deleted_at: string | null;
  roles: AppRole[];
};

type ProfesionalesListResult = {
  items: ProfesionalListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ProfesionalesListViewProps = {
  result: ProfesionalesListResult;
  params: {
    q: string;
    estado: "activos" | "eliminados" | "todos";
    sort:
      | "nombre_profesional"
      | "correo_profesional"
      | "programa"
      | "antiguedad"
      | "usuario_login";
    direction: "asc" | "desc";
  };
};

function statusLabel(profesional: ProfesionalListItem) {
  if (profesional.deleted_at) {
    return "Eliminado";
  }
  if (!profesional.auth_user_id) {
    return "Sin acceso";
  }
  if (profesional.auth_password_temp) {
    return "Contraseña temporal";
  }
  return "Acceso activo";
}

function statusTone(profesional: ProfesionalListItem) {
  if (profesional.deleted_at) {
    return "neutral" as const;
  }
  if (!profesional.auth_user_id) {
    return "info" as const;
  }
  if (profesional.auth_password_temp) {
    return "warning" as const;
  }
  return "success" as const;
}

export default function ProfesionalesListView({
  result,
  params,
}: ProfesionalesListViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.q);
  const [estado, setEstado] = useState(params.estado);
  const previousPage = Math.max(result.page - 1, 1);
  const nextPage = Math.min(result.page + 1, Math.max(result.totalPages, 1));

  function buildHref(next: {
    page: number;
    q?: string;
    estado?: ProfesionalesListViewProps["params"]["estado"];
    sort?: ProfesionalesListViewProps["params"]["sort"];
    direction?: ProfesionalesListViewProps["params"]["direction"];
  }) {
    const searchParams = new URLSearchParams();
    const nextQuery = next.q ?? query;
    const nextEstado = next.estado ?? estado;
    const nextSort = next.sort ?? params.sort;
    const nextDirection = next.direction ?? params.direction;
    if (nextQuery) {
      searchParams.set("q", nextQuery);
    }
    searchParams.set("estado", nextEstado);
    searchParams.set("sort", nextSort);
    searchParams.set("direction", nextDirection);
    searchParams.set("page", String(next.page));
    searchParams.set("pageSize", String(result.pageSize));
    return `?${searchParams.toString()}`;
  }

  function applyFilters(next: {
    page?: number;
    q?: string;
    estado?: ProfesionalesListViewProps["params"]["estado"];
  }) {
    startTransition(() => {
      router.push(
        buildHref({
          page: next.page ?? 1,
          q: next.q,
          estado: next.estado,
        })
      );
    });
  }

  const pageHref = (page: number) => buildHref({ page });
  const sortHref = (sort: ProfesionalesListViewProps["params"]["sort"]) => {
    const active = params.sort === sort;
    return buildHref({
      page: 1,
      sort,
      direction: active && params.direction === "asc" ? "desc" : "asc",
    });
  };
  const sortableHeader = (
    label: string,
    sort: ProfesionalesListViewProps["params"]["sort"]
  ) => (
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
        eyebrow="Profesionales"
        title="Profesionales de RECA"
        description={`${result.total} registros en el backoffice.`}
        action={
          <Link
            href="/hub/empresas/admin/profesionales/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-reca-800 shadow-sm transition hover:bg-reca-50"
          >
            <Plus className="h-4 w-4" />
            Nuevo profesional
          </Link>
        }
      />

      <form
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters({ q: query, estado, page: 1 });
        }}
      >
        <div className="grid gap-3 md:grid-cols-[2fr_220px_auto]">
          <BackofficeField label="Búsqueda">
            <span className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5">
              <Search className="h-4 w-4 text-gray-600" />
              <input
                {...BROWSER_AUTOFILL_SEARCH_GUARD_PROPS}
                name="q"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Nombre, correo, usuario o programa"
                className="min-w-0 flex-1 text-sm text-gray-900 outline-none"
              />
            </span>
          </BackofficeField>
          <BackofficeField label="Estado">
            <select
              name="estado"
              value={estado}
              onChange={(event) => {
                const nextEstado = event.currentTarget
                  .value as ProfesionalesListViewProps["params"]["estado"];
                setEstado(nextEstado);
                applyFilters({ q: query, estado: nextEstado, page: 1 });
              }}
              className={backofficeInputClassName}
            >
              <option value="activos">Activos</option>
              <option value="eliminados">Eliminados</option>
              <option value="todos">Todos</option>
            </select>
          </BackofficeField>
          <button
            type="submit"
            disabled={isPending}
            className="self-end rounded-xl border border-reca bg-white px-4 py-2.5 text-sm font-bold text-reca-800 transition hover:bg-reca-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Filtrando..." : "Filtrar"}
          </button>
        </div>
      </form>

      <BackofficeTableCard
        empty={
          result.items.length === 0
            ? {
                title: "No hay profesionales para mostrar",
                description: "Ajusta los filtros o crea un registro nuevo.",
              }
            : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-700">
              <tr>
                {sortableHeader("Nombre", "nombre_profesional")}
                {sortableHeader("Correo", "correo_profesional")}
                {sortableHeader("Programa", "programa")}
                {sortableHeader("Antigüedad", "antiguedad")}
                {sortableHeader("Usuario login", "usuario_login")}
                <th className="px-4 py-3 text-gray-700" scope="col">
                  Acceso
                </th>
                <th className="px-4 py-3 text-gray-700" scope="col">
                  Roles
                </th>
                <th className="px-4 py-3 text-gray-700" scope="col">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.items.map((profesional) => (
                <tr
                  key={profesional.id}
                  className="align-top transition hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {profesional.nombre_profesional}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {profesional.correo_profesional ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {profesional.programa ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {typeof profesional.antiguedad === "number"
                      ? profesional.antiguedad
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {profesional.usuario_login ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <BackofficeBadge tone={statusTone(profesional)}>
                      {statusLabel(profesional)}
                    </BackofficeBadge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {profesional.roles.length > 0
                      ? profesional.roles.map(getAppRoleLabel).join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/hub/empresas/admin/profesionales/${profesional.id}`}
                      aria-label={`Abrir ${profesional.nombre_profesional}`}
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
