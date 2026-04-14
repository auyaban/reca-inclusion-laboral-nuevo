"use client";

import { Building2 } from "lucide-react";
import { EmpresaSearchPanel } from "@/components/forms/shared/EmpresaSearchPanel";
import type { Empresa } from "@/lib/store/empresaStore";
import { cn } from "@/lib/utils";

type SensibilizacionCompanySectionProps = {
  empresa: Empresa | null;
  fechaVisita?: string;
  modalidad?: string;
  nitEmpresa?: string;
  onSelectEmpresa: (empresa: Empresa) => void;
};

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "min-h-[38px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm",
          !value && "italic text-gray-400"
        )}
      >
        {value || "Sin informacion"}
      </p>
    </div>
  );
}

export function SensibilizacionCompanySection({
  empresa,
  fechaVisita,
  modalidad,
  nitEmpresa,
  onSelectEmpresa,
}: SensibilizacionCompanySectionProps) {
  if (!empresa) {
    return <EmpresaSearchPanel onSelect={onSelectEmpresa} autoFocus />;
  }

  const displayedNit = nitEmpresa?.trim() || empresa.nit_empresa;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-reca-100 bg-reca-50 p-4">
        <div className="rounded-xl bg-white p-2 text-reca shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Empresa seleccionada
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Esta acta ya quedo asociada a{" "}
            <span className="font-semibold">{empresa.nombre_empresa}</span>.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            La busqueda sigue siendo solo por nombre. Este bloque resume toda la
            seccion inicial del acta.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadonlyField label="Fecha de la visita" value={fechaVisita} />
        <ReadonlyField label="Modalidad" value={modalidad} />
        <ReadonlyField label="Nombre de la empresa" value={empresa.nombre_empresa} />
        <ReadonlyField label="Ciudad / Municipio" value={empresa.ciudad_empresa} />
        <ReadonlyField label="Direccion de la empresa" value={empresa.direccion_empresa} />
        <ReadonlyField label="Numero de NIT" value={displayedNit} />
        <ReadonlyField label="Correo electronico" value={empresa.correo_1} />
        <ReadonlyField label="Telefonos" value={empresa.telefono_empresa} />
        <ReadonlyField
          label="Persona que atiende la visita"
          value={empresa.contacto_empresa}
        />
        <ReadonlyField label="Cargo" value={empresa.cargo} />
        <ReadonlyField label="Asesor" value={empresa.asesor} />
        <ReadonlyField
          label="Sede Compensar"
          value={empresa.sede_empresa ?? empresa.zona_empresa}
        />
      </div>
    </div>
  );
}
