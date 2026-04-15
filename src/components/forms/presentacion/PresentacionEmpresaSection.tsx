"use client";

import { Building2 } from "lucide-react";
import { EmpresaSearchPanel } from "@/components/forms/shared/EmpresaSearchPanel";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import type { Empresa } from "@/lib/store/empresaStore";
import { cn } from "@/lib/utils";

type PresentacionEmpresaSectionProps = {
  empresa: Empresa | null;
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
        {value || "Sin información"}
      </p>
    </div>
  );
}

export function PresentacionEmpresaSection({
  empresa,
  onSelectEmpresa,
}: PresentacionEmpresaSectionProps) {
  if (!empresa) {
    return <EmpresaSearchPanel onSelect={onSelectEmpresa} autoFocus />;
  }

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
            Esta acta ya quedó asociada a <span className="font-semibold">{empresa.nombre_empresa}</span>.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Para cambiar de empresa, abre una nueva acta desde el hub.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadonlyField label="Nombre de la empresa" value={empresa.nombre_empresa} />
        <ReadonlyField label="NIT" value={empresa.nit_empresa} />
        <ReadonlyField label="Ciudad / Municipio" value={empresa.ciudad_empresa} />
        <ReadonlyField
          label="Sede Compensar"
          value={getEmpresaSedeCompensarValue(empresa)}
        />
        <ReadonlyField label="Dirección" value={empresa.direccion_empresa} />
        <ReadonlyField label="Correo electrónico" value={empresa.correo_1} />
        <ReadonlyField label="Teléfono" value={empresa.telefono_empresa} />
        <ReadonlyField label="Contacto empresa" value={empresa.contacto_empresa} />
        <ReadonlyField label="Cargo responsable" value={empresa.cargo} />
        <ReadonlyField
          label="Caja de Compensación"
          value={empresa.caja_compensacion}
        />
        <ReadonlyField
          label="Profesional RECA"
          value={empresa.profesional_asignado}
        />
        <ReadonlyField
          label="Correo profesional"
          value={empresa.correo_profesional}
        />
        <ReadonlyField
          label="Asesor de fidelización"
          value={empresa.asesor}
        />
        <ReadonlyField label="Correo asesor" value={empresa.correo_asesor} />
      </div>
    </div>
  );
}
