import Link from "next/link";
import {
  BackofficeBadge,
  BackofficeFeedback,
  BackofficePageHeader,
  BackofficeTableCard,
  SortableTableHeader,
} from "@/components/backoffice";
import {
  getMismatchStatus,
  hasActiveTelemetryFilters,
  readTelemetryJsonString,
  TOP_MISMATCH_SCAN_LIMIT,
  type OdsTelemetryAdminResult,
} from "@/lib/ods/telemetry/admin";
import type { OdsTelemetryAdminParams } from "@/lib/ods/telemetry/adminSchemas";
import OdsTelemetryFiltersForm from "./OdsTelemetryFiltersForm";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function formatPercent(value: number | null) {
  return value === null ? "Sin datos" : `${value}%`;
}

function buildSearch(params: OdsTelemetryAdminParams, overrides: Partial<{
  page: number;
  direction: "asc" | "desc";
}>) {
  const search = new URLSearchParams();
  for (const origin of params.origins) {
    search.append("origin", origin);
  }
  for (const confidence of params.confidences) {
    search.append("confidence", confidence);
  }
  if (params.mismatch) {
    search.set("mismatch", params.mismatch);
  }
  if (params.from) {
    search.set("from", params.from);
  }
  if (params.to) {
    search.set("to", params.to);
  }
  search.set("sort", params.sort);
  search.set("direction", overrides.direction ?? params.direction);
  search.set("page", String(overrides.page ?? params.page));
  search.set("pageSize", String(params.pageSize));
  return `?${search.toString()}`;
}

function shortId(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function OdsTelemetryAdminView({
  result,
  params,
}: {
  result: OdsTelemetryAdminResult;
  params: OdsTelemetryAdminParams;
}) {
  const activeFilters = hasActiveTelemetryFilters(params);
  const previousPage = Math.max(result.page - 1, 1);
  const nextPage = Math.min(result.page + 1, Math.max(result.totalPages, 1));
  const nextDirection = params.direction === "asc" ? "desc" : "asc";

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="ODS"
        title="Telemetria ODS"
        description="Lectura administrativa de snapshots del motor de codigos. Los datos aparecen cuando ODS_TELEMETRY_START_AT esta activo."
        backHref="/hub"
        backLabel="Volver al hub"
      />

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Total</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {result.metrics.total}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Confirmadas</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatPercent(result.metrics.confirmedPercent)}
          </p>
          <p className="mt-1 text-xs font-semibold text-gray-600">
            {result.metrics.confirmed} filas
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Pendientes</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatPercent(result.metrics.pendingPercent)}
          </p>
          <p className="mt-1 text-xs font-semibold text-gray-600">
            {result.metrics.pending} filas
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">
            Confirmadas base accuracy
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {result.metrics.accuracy.confirmedCount}
          </p>
        </div>
      </section>

      <OdsTelemetryFiltersForm params={params} />

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Accuracy por campo</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.metrics.accuracy.fields.map((field) => (
              <div
                key={field.field}
                className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <p className="text-xs font-bold text-gray-600">{field.label}</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {formatPercent(field.accuracy)}
                </p>
                <p className="text-xs text-gray-600">
                  {field.matches}/{field.total} sin mismatch
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">
            Campos con mas mismatch
          </h2>
          {result.metrics.topMismatchFields.length > 0 ? (
            <ol className="mt-3 space-y-2 text-sm">
              {result.metrics.topMismatchFields.map((item) => (
                <li
                  key={item.field}
                  className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"
                >
                  <span className="font-semibold text-gray-700">{item.field}</span>
                  <BackofficeBadge tone="danger">{item.count}</BackofficeBadge>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-gray-600">Sin diferencias registradas.</p>
          )}
          {result.metrics.topMismatchScanCapped ? (
            <p className="mt-3 text-xs font-semibold text-amber-800">
              Top mismatch calculado sobre las {TOP_MISMATCH_SCAN_LIMIT} filas
              mas recientes de {result.metrics.topMismatchTotal}.
            </p>
          ) : null}
        </div>
      </section>

      <BackofficeTableCard
        empty={
          result.items.length === 0
            ? {
                title: activeFilters
                  ? "No hay filas para los filtros actuales"
                  : "Aun no hay datos. Telemetria se activa con ODS_TELEMETRY_START_AT.",
                description: activeFilters
                  ? "Ajusta los filtros para ampliar el rango de revision."
                  : "El owner activara la variable cuando cierre la documentacion del epic.",
              }
            : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-700">
              <tr>
                <SortableTableHeader
                  label="Fecha"
                  href={buildSearch(params, { page: 1, direction: nextDirection })}
                  active
                  direction={params.direction}
                />
                <th className="px-4 py-3" scope="col">Origen</th>
                <th className="px-4 py-3" scope="col">Confianza</th>
                <th className="px-4 py-3" scope="col">Codigo motor</th>
                <th className="px-4 py-3" scope="col">Codigo final</th>
                <th className="px-4 py-3" scope="col">Mismatch</th>
                <th className="px-4 py-3" scope="col">ODS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.items.map((row) => {
                const status = getMismatchStatus(row);
                const finalCode = row.confirmed_at
                  ? readTelemetryJsonString(row.final_value, "codigo_servicio")
                  : "";
                return (
                  <tr key={row.id} className="align-top transition hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <BackofficeBadge tone="info">{row.import_origin}</BackofficeBadge>
                    </td>
                    <td className="px-4 py-3">
                      <BackofficeBadge
                        tone={
                          row.confidence === "high"
                            ? "success"
                            : row.confidence === "medium"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {row.confidence}
                      </BackofficeBadge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">
                      {readTelemetryJsonString(row.motor_suggestion, "codigo_servicio") || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">
                      {finalCode}
                    </td>
                    <td className="px-4 py-3">
                      <BackofficeBadge tone={status.tone}>{status.label}</BackofficeBadge>
                    </td>
                    <td className="px-4 py-3">
                      {row.ods_id ? (
                        <span
                          title="Detalle ODS pendiente"
                          className="inline-flex flex-col gap-1 text-xs font-semibold text-gray-600"
                        >
                          <span className="font-mono">{shortId(row.ods_id)}</span>
                          <span>Detalle ODS pendiente</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin ODS</span>
                      )}
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
          href={buildSearch(params, { page: previousPage })}
          aria-disabled={result.page <= 1}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Anterior
        </Link>
        <span className="font-semibold">
          Pagina {result.page} de {Math.max(result.totalPages, 1)}
        </span>
        <Link
          href={buildSearch(params, { page: nextPage })}
          aria-disabled={result.page >= result.totalPages}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 font-bold aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Siguiente
        </Link>
      </div>

      <BackofficeFeedback variant="info">
        <p>
          Esta vista es solo lectura. Record/finalize siguen siendo RPCs server-only
          fuera de la UI.
        </p>
      </BackofficeFeedback>
    </main>
  );
}
