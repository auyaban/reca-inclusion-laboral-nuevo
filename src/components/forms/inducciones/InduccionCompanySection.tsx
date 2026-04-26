"use client";

import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";
import { Building2 } from "lucide-react";
import { EmpresaSearchPanel } from "@/components/forms/shared/EmpresaSearchPanel";
import { FormField } from "@/components/ui/FormField";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";
import type { Empresa } from "@/lib/store/empresaStore";
import { cn } from "@/lib/utils";

type InduccionCompanySectionProps<TValues extends FieldValues> = {
  empresa: Empresa | null;
  fechaVisita?: string;
  modalidad?: string;
  nitEmpresa?: string;
  register: UseFormRegister<TValues>;
  errors: FieldErrors<TValues>;
  onSelectEmpresa: (empresa: Empresa) => void;
  disabled?: boolean;
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

function getFieldError<TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  fieldId: string
) {
  const candidate = errors[fieldId as keyof FieldErrors<TValues>];
  return typeof candidate?.message === "string" ? candidate.message : undefined;
}

export function InduccionCompanySection<TValues extends FieldValues>({
  empresa,
  fechaVisita,
  modalidad,
  nitEmpresa,
  register,
  errors,
  onSelectEmpresa,
  disabled = false,
}: InduccionCompanySectionProps<TValues>) {
  if (!empresa) {
    return <EmpresaSearchPanel onSelect={onSelectEmpresa} autoFocus />;
  }

  const displayedNit = nitEmpresa?.trim() || empresa.nit_empresa;
  const fechaVisitaError = getFieldError(errors, "fecha_visita");
  const modalidadError = getFieldError(errors, "modalidad");
  const nitEmpresaError = getFieldError(errors, "nit_empresa");

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
            Este bloque resume la seccion general que ambas inducciones envian al
            acta final.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadonlyField label="Fecha de la visita" value={fechaVisita} />
        <ReadonlyField label="Modalidad" value={modalidad} />
        <ReadonlyField label="Nombre de la empresa" value={empresa.nombre_empresa} />
        <ReadonlyField label="Ciudad / Municipio" value={empresa.ciudad_empresa} />
        <ReadonlyField
          label="Direccion de la empresa"
          value={empresa.direccion_empresa}
        />
        <ReadonlyField label="Numero de NIT" value={displayedNit} />
        <ReadonlyField label="Correo electronico" value={empresa.correo_1} />
        <ReadonlyField label="Telefonos" value={empresa.telefono_empresa} />
        <ReadonlyField
          label="Persona que atiende la visita"
          value={empresa.contacto_empresa}
        />
        <ReadonlyField label="Cargo" value={empresa.cargo} />
        <ReadonlyField
          label="Empresa afiliada a Caja de Compensacion"
          value={empresa.caja_compensacion}
        />
        <ReadonlyField
          label="Sede Compensar"
          value={getEmpresaSedeCompensarValue(empresa)}
        />
        <ReadonlyField label="Asesor" value={empresa.asesor} />
        <ReadonlyField
          label="Profesional asignado RECA"
          value={empresa.profesional_asignado}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Datos base del acta
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Fecha y modalidad deben seleccionarse manualmente antes de finalizar.
            El NIT queda sincronizado con la empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            label="Fecha de la visita"
            htmlFor="fecha_visita"
            required
            error={fechaVisitaError}
          >
            <input
              id="fecha_visita"
              type="date"
              disabled={disabled}
              {...register("fecha_visita" as Path<TValues>)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-sm",
                "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                fechaVisitaError ? "border-red-400 bg-red-50" : "border-gray-200"
              )}
            />
          </FormField>

          <FormField
            label="Modalidad"
            htmlFor="modalidad"
            required
            error={modalidadError}
          >
            <select
              id="modalidad"
              disabled={disabled}
              {...register("modalidad" as Path<TValues>)}
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2.5 text-sm",
                "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                modalidadError ? "border-red-400" : "border-gray-200"
              )}
            >
              <option value="">Selecciona una modalidad</option>
              {MODALIDAD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="NIT de la empresa"
            htmlFor="nit_empresa"
            required
            error={nitEmpresaError}
          >
            <input
              id="nit_empresa"
              type="text"
              readOnly
              aria-readonly="true"
              {...register("nit_empresa" as Path<TValues>)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-sm",
                "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                "bg-gray-50 text-gray-600",
                nitEmpresaError ? "border-red-400 bg-red-50" : "border-gray-200"
              )}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}
