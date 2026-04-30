"use client";

import { useOdsStore } from "@/hooks/useOdsStore";

export function SummaryCard() {
  const resumen = useOdsStore((s) => s.resumen);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Resumen</h2>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-medium text-gray-500">Fecha</dt>
          <dd className="mt-1 text-gray-900">{resumen.fecha_servicio || "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Profesional</dt>
          <dd className="mt-1 text-gray-900">{resumen.nombre_profesional || "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Empresa</dt>
          <dd className="mt-1 text-gray-900">{resumen.nombre_empresa || "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Código</dt>
          <dd className="mt-1 text-gray-900">{resumen.codigo_servicio || "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Valor total</dt>
          <dd className="mt-1 text-lg font-semibold text-reca">
            {resumen.valor_total > 0 ? `$${resumen.valor_total.toLocaleString("es-CO")}` : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
