"use client";

import { useOdsStore } from "@/hooks/useOdsStore";

/**
 * Barra sticky en el footer del wizard. Muestra siempre los datos clave
 * (empresa · fecha · #oferentes con datos · valor total) para que el
 * operador vea el efecto de los cambios en secciones lejanas sin tener
 * que hacer scroll al resumen completo.
 *
 * Lee solo los selectores estrictamente necesarios para no causar
 * re-renders en cada keystroke de campos no visibles aquí.
 */
export function StickyResumenBar() {
  const empresa = useOdsStore((s) => s.seccion2.nombre_empresa);
  const fecha = useOdsStore((s) => s.seccion3.fecha_servicio);
  const valorTotal = useOdsStore((s) => s.resumen.valor_total);
  const oferentesCount = useOdsStore((s) =>
    s.seccion4.rows.filter(
      (r) =>
        r.cedula_usuario.trim() ||
        r.nombre_usuario.trim() ||
        r.discapacidad_usuario.trim() ||
        r.genero_usuario.trim()
    ).length
  );

  return (
    <div
      className="sticky bottom-0 z-20 -mx-6 mt-4 border-t border-gray-200 bg-white/95 px-6 py-3 backdrop-blur"
      data-testid="ods-sticky-resumen"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">
            Empresa · Fecha · Oferentes
          </span>
          <span className="text-sm font-medium text-gray-900">
            <span>{empresa || "—"}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span>{fecha || "—"}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span>{oferentesCount} {oferentesCount === 1 ? "oferente" : "oferentes"}</span>
          </span>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">
            Valor total
          </span>
          <span className="text-lg font-semibold text-reca tabular-nums">
            {valorTotal > 0 ? `$${valorTotal.toLocaleString("es-CO")}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
