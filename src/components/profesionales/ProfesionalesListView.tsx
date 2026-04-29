import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getAppRoleLabel, type AppRole } from "@/lib/auth/appRoles";

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

function statusClass(profesional: ProfesionalListItem) {
  if (profesional.deleted_at) {
    return "bg-gray-100 text-gray-700";
  }
  if (!profesional.auth_user_id) {
    return "bg-slate-100 text-slate-700";
  }
  if (profesional.auth_password_temp) {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-emerald-100 text-emerald-800";
}

export default function ProfesionalesListView({
  result,
  params,
}: ProfesionalesListViewProps) {
  const previousPage = Math.max(result.page - 1, 1);
  const nextPage = Math.min(result.page + 1, Math.max(result.totalPages, 1));
  const pageHref = (page: number) => {
    const searchParams = new URLSearchParams();
    if (params.q) {
      searchParams.set("q", params.q);
    }
    searchParams.set("estado", params.estado);
    searchParams.set("page", String(page));
    searchParams.set("pageSize", String(result.pageSize));
    return `?${searchParams.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-reca">Profesionales</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Profesionales de RECA
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {result.total} registros en el backoffice.
          </p>
        </div>
        <Link
          href="/hub/empresas/admin/profesionales/nuevo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-reca px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-reca-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo profesional
        </Link>
      </div>

      <form className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[2fr_220px_auto]">
          <label className="text-xs font-semibold text-gray-600">
            Búsqueda
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Nombre, correo, usuario o programa"
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </span>
          </label>
          <label className="text-xs font-semibold text-gray-600">
            Estado
            <select
              name="estado"
              defaultValue={params.estado}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
            >
              <option value="activos">Activos</option>
              <option value="eliminados">Eliminados</option>
              <option value="todos">Todos</option>
            </select>
          </label>
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
              No hay profesionales para mostrar
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Ajusta los filtros o crea un registro nuevo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Programa</th>
                  <th className="px-4 py-3">Antigüedad</th>
                  <th className="px-4 py-3">Usuario login</th>
                  <th className="px-4 py-3">Acceso</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.items.map((profesional) => (
                  <tr key={profesional.id} className="align-top">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {profesional.nombre_profesional}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {profesional.correo_profesional ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {profesional.programa ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {typeof profesional.antiguedad === "number"
                        ? profesional.antiguedad
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {profesional.usuario_login ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(
                          profesional
                        )}`}
                      >
                        {statusLabel(profesional)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {profesional.roles.length > 0
                        ? profesional.roles.map(getAppRoleLabel).join(", ")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/hub/empresas/admin/profesionales/${profesional.id}`}
                        aria-label={`Abrir ${profesional.nombre_profesional}`}
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
          Página {result.page} de {Math.max(result.totalPages, 1)}
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
