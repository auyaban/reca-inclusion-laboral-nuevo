"use client";

import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import {
  BackofficeBadge,
  BackofficeFeedback,
  BackofficeField,
  BackofficePageHeader,
  BackofficeTableCard,
  SortableTableHeader,
  backofficeInputClassName,
} from "@/components/backoffice";
import { BROWSER_AUTOFILL_SEARCH_GUARD_PROPS } from "@/lib/browserAutofill";
import type { CatalogoKind, CatalogoListParams } from "@/lib/catalogos/schemas";
import type { CatalogoRecord } from "@/lib/catalogos/server";

type CatalogosListResult = {
  items: CatalogoRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FieldConfig = {
  name: keyof CatalogoRecord;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "tel";
};

type CatalogoUiConfig = {
  title: string;
  singular: string;
  description: string;
  newLabel: string;
  columns: Array<{ field: string; label: string; sortable: boolean }>;
  fields: FieldConfig[];
};

const UI_CONFIG: Record<CatalogoKind, CatalogoUiConfig> = {
  asesores: {
    title: "Asesores",
    singular: "asesor",
    description: "Datos maestros de asesores de Compensar.",
    newLabel: "Nuevo asesor",
    columns: [
      { field: "nombre", label: "Nombre", sortable: true },
      { field: "email", label: "Email", sortable: true },
      { field: "telefono", label: "Teléfono", sortable: true },
      { field: "sede", label: "Sede", sortable: true },
      { field: "localidad", label: "Localidad", sortable: true },
      { field: "gestor", label: "Gestor", sortable: true },
    ],
    fields: [
      { name: "nombre", label: "Nombre", placeholder: "Ej. Carlos Ruiz" },
      { name: "email", label: "Email", placeholder: "Ej. asesor@compensar.com", type: "email" },
      { name: "telefono", label: "Teléfono", placeholder: "Ej. 3001234567", type: "tel" },
      { name: "sede", label: "Sede", placeholder: "Ej. Centro" },
      { name: "localidad", label: "Localidad", placeholder: "Ej. Suba" },
      { name: "gestor", label: "Gestor", placeholder: "Ej. Laura Mora" },
    ],
  },
  gestores: {
    title: "Gestores",
    singular: "gestor",
    description: "Datos maestros de gestores de empleo.",
    newLabel: "Nuevo gestor",
    columns: [
      { field: "nombre", label: "Nombre", sortable: true },
      { field: "email", label: "Email", sortable: true },
      { field: "telefono", label: "Teléfono", sortable: true },
      { field: "sede", label: "Sede", sortable: true },
      { field: "localidades", label: "Localidades", sortable: true },
    ],
    fields: [
      { name: "nombre", label: "Nombre", placeholder: "Ej. Laura Mora" },
      { name: "email", label: "Email", placeholder: "Ej. gestor@compensar.com", type: "email" },
      { name: "telefono", label: "Teléfono", placeholder: "Ej. 3001234567", type: "tel" },
      { name: "sede", label: "Sede", placeholder: "Ej. Kennedy" },
      { name: "localidades", label: "Localidades", placeholder: "Ej. Suba; Kennedy" },
    ],
  },
  interpretes: {
    title: "Intérpretes",
    singular: "intérprete",
    description: "Catálogo de intérpretes de lengua de señas.",
    newLabel: "Nuevo intérprete",
    columns: [
      { field: "nombre", label: "Nombre", sortable: true },
      { field: "created_at", label: "Creación", sortable: true },
    ],
    fields: [{ name: "nombre", label: "Nombre", placeholder: "Ej. Laura Pérez" }],
  },
};

function formatValue(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "-";
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeZone: "America/Bogota",
    }).format(new Date(value));
  }
  return value;
}

function emptyRecord(fields: FieldConfig[]) {
  return Object.fromEntries(fields.map((field) => [field.name, ""])) as Partial<
    CatalogoRecord
  >;
}

export default function CatalogosListView({
  kind,
  result,
  params,
}: {
  kind: CatalogoKind;
  result: CatalogosListResult;
  params: CatalogoListParams;
}) {
  const config = UI_CONFIG[kind];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.q);
  const [estado, setEstado] = useState(params.estado);
  const [editing, setEditing] = useState<Partial<CatalogoRecord> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const apiBase = `/api/empresas/${kind}`;

  const formValues = useMemo(
    () => editing ?? emptyRecord(config.fields),
    [config.fields, editing]
  );

  function buildHref(next: {
    page: number;
    q?: string;
    estado?: CatalogoListParams["estado"];
    sort?: string;
    direction?: CatalogoListParams["direction"];
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

  function applyFilters(next: { q?: string; estado?: CatalogoListParams["estado"] }) {
    startTransition(() => {
      router.push(buildHref({ page: 1, q: next.q, estado: next.estado }));
    });
  }

  function sortHref(sort: string) {
    const active = params.sort === sort;
    return buildHref({
      page: 1,
      sort,
      direction: active && params.direction === "asc" ? "desc" : "asc",
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      config.fields.map((field) => [field.name, formData.get(String(field.name)) ?? ""])
    );
    const id = typeof editing?.id === "string" ? editing.id : null;
    const response = await fetch(id ? `${apiBase}/${id}` : apiBase, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "No se pudo guardar el registro.");
      return;
    }
    setSuccess("Registro guardado.");
    setEditing(null);
    router.refresh();
  }

  async function mutateRecord(record: CatalogoRecord, action: "delete" | "restore") {
    setError(null);
    setSuccess(null);
    const response = await fetch(
      action === "restore" ? `${apiBase}/${record.id}/restore` : `${apiBase}/${record.id}`,
      { method: action === "restore" ? "POST" : "DELETE" }
    );
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "No se pudo actualizar el registro.");
      return;
    }
    setSuccess(action === "restore" ? "Registro restaurado." : "Registro eliminado.");
    router.refresh();
  }

  const previousPage = Math.max(result.page - 1, 1);
  const nextPage = Math.min(result.page + 1, Math.max(result.totalPages, 1));

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="Catálogos"
        title={config.title}
        description={`${result.total} registros en el backoffice. ${config.description}`}
        action={
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setEditing(emptyRecord(config.fields));
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-reca-800 shadow-sm transition hover:bg-reca-50"
          >
            <Plus className="h-4 w-4" />
            {config.newLabel}
          </button>
        }
      />

      <form
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters({ q: query, estado });
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
                placeholder={`Buscar ${config.title.toLocaleLowerCase("es-CO")}`}
                className="min-w-0 flex-1 text-sm text-gray-900 outline-none"
              />
            </span>
          </BackofficeField>
          <BackofficeField label="Estado">
            <select
              name="estado"
              value={estado}
              onChange={(event) => {
                const nextEstado = event.currentTarget.value as CatalogoListParams["estado"];
                setEstado(nextEstado);
                applyFilters({ q: query, estado: nextEstado });
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

      {editing ? (
        <form
          key={typeof editing.id === "string" ? editing.id : "new"}
          onSubmit={submitForm}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {config.fields.map((field) => (
              <BackofficeField key={field.name} label={field.label}>
                <input
                  {...BROWSER_AUTOFILL_SEARCH_GUARD_PROPS}
                  name={String(field.name)}
                  type={field.type ?? "text"}
                  defaultValue={String(formValues[field.name] ?? "")}
                  placeholder={field.placeholder}
                  className={backofficeInputClassName}
                />
              </BackofficeField>
            ))}
          </div>
          {error ? (
            <div className="mt-4">
              <BackofficeFeedback variant="error" title="No se pudo guardar">
                <p>{error}</p>
              </BackofficeFeedback>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-reca px-4 py-2.5 text-sm font-bold text-white transition hover:bg-reca-800"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {success ? (
        <BackofficeFeedback variant="success" title={success}>
          <p>La lista se actualizará automáticamente.</p>
        </BackofficeFeedback>
      ) : null}
      {error && !editing ? (
        <BackofficeFeedback variant="error" title="No se pudo actualizar">
          <p>{error}</p>
        </BackofficeFeedback>
      ) : null}

      <BackofficeTableCard
        empty={
          result.items.length === 0
            ? {
                title: `No hay ${config.title.toLocaleLowerCase("es-CO")} para mostrar`,
                description: "Ajusta los filtros o crea un registro nuevo.",
              }
            : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-700">
              <tr>
                {config.columns.map((column) =>
                  column.sortable ? (
                    <SortableTableHeader
                      key={column.field}
                      label={column.label}
                      href={sortHref(column.field)}
                      active={params.sort === column.field}
                      direction={params.direction}
                    />
                  ) : (
                    <th key={column.field} className="px-4 py-3 text-gray-700" scope="col">
                      {column.label}
                    </th>
                  )
                )}
                <th className="px-4 py-3 text-gray-700" scope="col">
                  Estado
                </th>
                <th className="px-4 py-3 text-gray-700" scope="col">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.items.map((record) => (
                <tr key={record.id} className="align-top transition hover:bg-gray-50">
                  {config.columns.map((column) => (
                    <td key={column.field} className="px-4 py-3 text-gray-700">
                      {column.field === "nombre" ? (
                        <span className="font-bold text-gray-900">
                          {formatValue(record[column.field as keyof CatalogoRecord])}
                        </span>
                      ) : (
                        formatValue(record[column.field as keyof CatalogoRecord])
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <BackofficeBadge tone={record.deleted_at ? "neutral" : "success"}>
                      {record.deleted_at ? "Eliminado" : "Activo"}
                    </BackofficeBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setSuccess(null);
                          setEditing(record);
                        }}
                        className="font-bold text-reca-800 transition hover:text-reca"
                      >
                        Editar
                      </button>
                      {record.deleted_at ? (
                        <button
                          type="button"
                          onClick={() => void mutateRecord(record, "restore")}
                          className="font-bold text-teal-700 transition hover:text-teal-900"
                        >
                          Restaurar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void mutateRecord(record, "delete")}
                          className="font-bold text-red-700 transition hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BackofficeTableCard>

      <nav className="flex items-center justify-between text-sm">
        <a
          href={buildHref({ page: previousPage })}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-bold text-gray-800 transition hover:bg-gray-50"
        >
          Anterior
        </a>
        <span className="font-semibold text-gray-700">
          Página {result.page} de {Math.max(result.totalPages, 1)}
        </span>
        <a
          href={buildHref({ page: nextPage })}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-bold text-gray-800 transition hover:bg-gray-50"
        >
          Siguiente
        </a>
      </nav>
    </main>
  );
}
