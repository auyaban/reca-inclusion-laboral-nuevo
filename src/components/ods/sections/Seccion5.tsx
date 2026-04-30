"use client";

import { useOdsStore } from "@/hooks/useOdsStore";

export function Seccion5() {
  const seccion5 = useOdsStore((s) => s.seccion5);
  const setSeccion5 = useOdsStore((s) => s.setSeccion5);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-gray-900">Seccion 5 — Observaciones</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Observaciones</label>
          <textarea
            value={seccion5.observaciones}
            onChange={(e) => setSeccion5({ observaciones: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Observaciones generales..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Observacion de agencia</label>
          <textarea
            value={seccion5.observacion_agencia}
            onChange={(e) => setSeccion5({ observacion_agencia: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Observacion de agencia..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Seguimiento del servicio</label>
          <textarea
            value={seccion5.seguimiento_servicio}
            onChange={(e) => setSeccion5({ seguimiento_servicio: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Seguimiento del servicio..."
          />
        </div>
      </div>
    </div>
  );
}
