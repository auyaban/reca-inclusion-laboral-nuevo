"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { PresentacionValues } from "@/lib/validations/presentacion";
import { MOTIVACION_OPTIONS } from "@/lib/validations/presentacion";
import { cn } from "@/lib/utils";

type PresentacionMotivacionSectionProps = {
  register: UseFormRegister<PresentacionValues>;
  errors: FieldErrors<PresentacionValues>;
  motivacion: string[];
};

export function PresentacionMotivacionSection({
  register,
  errors,
  motivacion,
}: PresentacionMotivacionSectionProps) {
  return (
    <div>
      <p className="mb-5 text-xs text-gray-500">
        Selecciona al menos una razón por la que la empresa participa en el
        programa.
      </p>

      {errors.motivacion?.message && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {errors.motivacion.message}
        </p>
      )}

      <div className="space-y-3">
        {MOTIVACION_OPTIONS.map((opcion) => {
          const checked = motivacion.includes(opcion);

          return (
            <label
              key={opcion}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all",
                checked
                  ? "border-reca bg-reca-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <input
                type="checkbox"
                value={opcion}
                {...register("motivacion")}
                className="mt-0.5 h-4 w-4 shrink-0 accent-reca-600"
              />
              <span
                className={cn(
                  "text-sm leading-snug",
                  checked ? "font-medium text-reca" : "text-gray-700"
                )}
              >
                {opcion}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
