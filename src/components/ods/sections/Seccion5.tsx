"use client";

import { Label } from "@/components/ui/label";
import { useOdsStore } from "@/hooks/useOdsStore";

const TEXTAREA_CLASSES =
  "block w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function Seccion5() {
  const seccion5 = useOdsStore((s) => s.seccion5);
  const setSeccion5 = useOdsStore((s) => s.setSeccion5);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Seccion 5 — Observaciones</h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ods-observaciones">Observaciones</Label>
          <textarea
            id="ods-observaciones"
            value={seccion5.observaciones}
            onChange={(e) => setSeccion5({ observaciones: e.target.value })}
            rows={3}
            className={TEXTAREA_CLASSES}
            placeholder="Observaciones generales..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ods-observacion-agencia">Observacion de agencia</Label>
          <textarea
            id="ods-observacion-agencia"
            value={seccion5.observacion_agencia}
            onChange={(e) => setSeccion5({ observacion_agencia: e.target.value })}
            rows={3}
            className={TEXTAREA_CLASSES}
            placeholder="Observacion de agencia..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ods-seguimiento-servicio">Seguimiento del servicio</Label>
          <textarea
            id="ods-seguimiento-servicio"
            value={seccion5.seguimiento_servicio}
            onChange={(e) => setSeccion5({ seguimiento_servicio: e.target.value })}
            rows={3}
            className={TEXTAREA_CLASSES}
            placeholder="Seguimiento del servicio..."
          />
        </div>
      </div>
    </div>
  );
}
