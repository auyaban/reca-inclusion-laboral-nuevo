"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import {
  MODALIDAD_OPTIONS,
  type SensibilizacionValues,
} from "@/lib/validations/sensibilizacion";

type SensibilizacionVisitSectionProps = {
  register: UseFormRegister<SensibilizacionValues>;
  errors: FieldErrors<SensibilizacionValues>;
};

export function SensibilizacionVisitSection({
  register,
  errors,
}: SensibilizacionVisitSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        label="Fecha de la visita"
        htmlFor="fecha_visita"
        required
        error={errors.fecha_visita?.message}
      >
        <input
          id="fecha_visita"
          type="date"
          {...register("fecha_visita")}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
            errors.fecha_visita ? "border-red-400 bg-red-50" : "border-gray-200"
          )}
        />
      </FormField>

      <FormField
        label="Modalidad"
        htmlFor="modalidad"
        required
        error={errors.modalidad?.message}
      >
        <select
          id="modalidad"
          {...register("modalidad")}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2.5 text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
            errors.modalidad ? "border-red-400" : "border-gray-200"
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
        error={errors.nit_empresa?.message}
      >
        <input
          id="nit_empresa"
          type="text"
          {...register("nit_empresa")}
          placeholder="Ej: 900123456-1"
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
            errors.nit_empresa ? "border-red-400 bg-red-50" : "border-gray-200"
          )}
        />
      </FormField>
    </div>
  );
}
