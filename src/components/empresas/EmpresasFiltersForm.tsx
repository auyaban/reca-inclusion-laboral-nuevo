"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTransition, type FormEvent } from "react";
import {
  BackofficeField,
  backofficeInputClassName,
} from "@/components/backoffice";
import { BROWSER_AUTOFILL_SEARCH_GUARD_PROPS } from "@/lib/browserAutofill";
import type { EmpresaSortField } from "@/lib/empresas/schemas";

type CatalogFilters = {
  estados: string[];
  gestores: string[];
  cajas: string[];
  zonas: string[];
  asesores: string[];
};

type EmpresasFiltersFormProps = {
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
  pageSize: number;
  catalogFilters: CatalogFilters;
};

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

export default function EmpresasFiltersForm({
  params,
  pageSize,
  catalogFilters,
}: EmpresasFiltersFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchParams = new URLSearchParams();

    for (const key of ["q", "estado", "gestion", "caja", "zona", "asesor"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) {
        searchParams.set(key, value);
      }
    }

    searchParams.set("sort", params.sort);
    searchParams.set("direction", params.direction);
    searchParams.set("page", "1");
    searchParams.set("pageSize", String(pageSize));

    startTransition(() => {
      router.push(`/hub/empresas/admin/empresas?${searchParams.toString()}`);
    });
  }

  return (
    <form
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      onSubmit={applyFilters}
    >
      <input type="hidden" name="sort" value={params.sort} />
      <input type="hidden" name="direction" value={params.direction} />
      <input type="hidden" name="pageSize" value={pageSize} />
      <div className="grid gap-3 lg:grid-cols-[2fr_repeat(5,1fr)_auto]">
        <BackofficeField label="Búsqueda">
          <span className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5">
            <Search className="h-4 w-4 text-gray-600" />
            <input
              {...BROWSER_AUTOFILL_SEARCH_GUARD_PROPS}
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
          disabled={isPending}
          className="self-end rounded-xl border border-reca bg-white px-4 py-2.5 text-sm font-bold text-reca-800 transition hover:bg-reca-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Filtrando..." : "Filtrar"}
        </button>
      </div>
    </form>
  );
}
