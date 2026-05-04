"use client";

import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { useTransition, type FormEvent } from "react";
import {
  BackofficeField,
  backofficeInputClassName,
} from "@/components/backoffice";
import {
  ODS_TELEMETRY_CONFIDENCES,
  ODS_TELEMETRY_IMPORT_ORIGINS,
  type OdsTelemetryAdminParams,
} from "@/lib/ods/telemetry/adminSchemas";

function MultiSelect({
  name,
  label,
  values,
  options,
}: {
  name: string;
  label: string;
  values: string[];
  options: readonly string[];
}) {
  return (
    <BackofficeField label={label}>
      <select
        name={name}
        multiple
        defaultValue={values}
        className={backofficeInputClassName}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </BackofficeField>
  );
}

export default function OdsTelemetryFiltersForm({
  params,
}: {
  params: OdsTelemetryAdminParams;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchParams = new URLSearchParams();

    for (const origin of formData.getAll("origin")) {
      if (typeof origin === "string" && origin) {
        searchParams.append("origin", origin);
      }
    }

    for (const confidence of formData.getAll("confidence")) {
      if (typeof confidence === "string" && confidence) {
        searchParams.append("confidence", confidence);
      }
    }

    for (const key of ["mismatch", "from", "to"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) {
        searchParams.set(key, value);
      }
    }

    searchParams.set("sort", params.sort);
    searchParams.set("direction", params.direction);
    searchParams.set("page", "1");
    searchParams.set("pageSize", String(params.pageSize));

    startTransition(() => {
      router.push(`/hub/admin/ods-telemetria?${searchParams.toString()}`);
    });
  }

  return (
    <form
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      onSubmit={applyFilters}
    >
      <div className="grid gap-3 lg:grid-cols-[repeat(5,1fr)_auto]">
        <BackofficeField label="Desde">
          <input
            type="date"
            name="from"
            defaultValue={params.from}
            className={backofficeInputClassName}
          />
        </BackofficeField>
        <BackofficeField label="Hasta">
          <input
            type="date"
            name="to"
            defaultValue={params.to}
            className={backofficeInputClassName}
          />
        </BackofficeField>
        <MultiSelect
          name="origin"
          label="Origen"
          values={params.origins}
          options={ODS_TELEMETRY_IMPORT_ORIGINS}
        />
        <MultiSelect
          name="confidence"
          label="Confianza"
          values={params.confidences}
          options={ODS_TELEMETRY_CONFIDENCES}
        />
        <BackofficeField label="Mismatch">
          <select
            name="mismatch"
            defaultValue={params.mismatch}
            className={backofficeInputClassName}
          >
            <option value="">Todos</option>
            <option value="si">Con diferencias</option>
            <option value="no">Match exacto</option>
            <option value="pendiente">Pendientes</option>
          </select>
        </BackofficeField>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 self-end rounded-xl border border-reca bg-white px-4 py-2.5 text-sm font-bold text-reca-800 transition hover:bg-reca-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Filtrando..." : "Filtrar"}
        </button>
      </div>
    </form>
  );
}
