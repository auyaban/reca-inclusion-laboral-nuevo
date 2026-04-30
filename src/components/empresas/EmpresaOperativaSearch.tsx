"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BackofficeBadge, BackofficeFeedback } from "@/components/backoffice";
import { BROWSER_AUTOFILL_SEARCH_GUARD_PROPS } from "@/lib/browserAutofill";
import type {
  EmpresaAssignmentStatus,
  EmpresaOperativaItem,
} from "@/lib/empresas/lifecycle-queries";

function assignmentTone(status: EmpresaAssignmentStatus) {
  if (status === "tuya") {
    return "success" as const;
  }
  if (status === "libre") {
    return "info" as const;
  }
  return "warning" as const;
}

function assignmentLabel(item: EmpresaOperativaItem) {
  if (item.assignmentStatus === "tuya") {
    return "Tuya";
  }
  if (item.assignmentStatus === "libre") {
    return "Libre";
  }
  return `Asignada a ${item.profesionalAsignado ?? "otro profesional"}`;
}

export default function EmpresaOperativaSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<EmpresaOperativaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (trimmedQuery.length < 3) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: trimmedQuery,
          pageSize: "8",
        });
        const response = await fetch(`/api/empresas/pool?${params.toString()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudo buscar empresas.");
        }

        const body = (await response.json()) as { items?: EmpresaOperativaItem[] };
        setItems(body.items ?? []);
      } catch (searchError) {
        if ((searchError as Error).name !== "AbortError") {
          setError("No se pudo buscar empresas. Intenta de nuevo.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
          <Search className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold text-gray-900">Buscar empresa activa</h2>
          <p className="mt-1 text-sm text-gray-700">
            Escribe mínimo 3 caracteres del nombre o NIT para abrir una empresa en
            una pestaña nueva.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-bold text-gray-900" htmlFor="empresa-search">
          Nombre o NIT
        </label>
        <input
          id="empresa-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ejemplo: Compensar o 900123"
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-reca focus:outline-none focus:ring-2 focus:ring-reca/20"
          {...BROWSER_AUTOFILL_SEARCH_GUARD_PROPS}
        />
      </div>

      <div className="mt-4 space-y-2">
        {trimmedQuery.length > 0 && trimmedQuery.length < 3 ? (
          <BackofficeFeedback variant="empty">
            Escribe al menos 3 caracteres para buscar.
          </BackofficeFeedback>
        ) : null}
        {loading ? (
          <BackofficeFeedback variant="loading">Filtrando empresas...</BackofficeFeedback>
        ) : null}
        {error ? <BackofficeFeedback variant="error">{error}</BackofficeFeedback> : null}
        {!loading && trimmedQuery.length >= 3 && items.length === 0 && !error ? (
          <BackofficeFeedback variant="empty">
            No encontramos empresas con ese nombre o NIT.
          </BackofficeFeedback>
        ) : null}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/hub/empresas/${item.id}`}
            target="_blank"
            rel="noreferrer noopener"
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 transition hover:border-reca-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              <span className="block text-sm font-bold text-gray-900">
                {item.nombreEmpresa ?? "Empresa sin nombre"}
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-gray-700">
                {item.nitEmpresa ?? "Sin NIT"} · {item.estado ?? "Sin estado"}
              </span>
            </span>
            <BackofficeBadge tone={assignmentTone(item.assignmentStatus)}>
              {assignmentLabel(item)}
            </BackofficeBadge>
          </Link>
        ))}
      </div>
    </section>
  );
}
