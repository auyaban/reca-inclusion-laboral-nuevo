"use client";

import { useEffect } from "react";
import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/ui/FormField";
import { ProfesionalCombobox, type Profesional } from "./ProfesionalCombobox";

type Props = {
  control: any;       // Control<cualquier form con asistentes>
  register: any;
  setValue: any;
  watch: any;
  errors: any;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
};

const MAX = 10;

/**
 * Sección de asistentes reutilizable para todos los formularios.
 *
 * - Fila 0: combobox de profesionales RECA + cargo auto-llenado
 *           Pre-cargado con profesional_asignado de la empresa
 * - Filas intermedias: texto libre
 * - Última fila: badge "Asesor Agencia" + cargo pre-llenado
 * - "Agregar" inserta antes de la última fila
 * - Mínimo 2 filas, máximo 10
 */
export function AsistentesSection({
  control,
  register,
  setValue,
  watch,
  errors,
  profesionales,
  profesionalAsignado,
}: Props) {
  const { fields, remove, insert } = useFieldArray({ control, name: "asistentes" });

  // Auto-rellenar cargo del profesional asignado cuando cargan los datos
  useEffect(() => {
    if (!profesionalAsignado || !profesionales.length) return;
    const match = profesionales.find(
      (p) => p.nombre_profesional.toLowerCase() === profesionalAsignado.toLowerCase()
    );
    if (match?.cargo_profesional) {
      setValue("asistentes.0.cargo", match.cargo_profesional);
    }
  }, [profesionales, profesionalAsignado, setValue]);

  const asistentesErrors = errors?.asistentes;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900">Asistentes</h2>
          <p className="text-xs text-gray-500 mt-0.5">Mínimo 2 personas · Máximo {MAX}</p>
        </div>
        {fields.length < MAX && (
          <button
            type="button"
            onClick={() => insert(Math.max(1, fields.length - 1), { nombre: "", cargo: "" })}
            className="flex items-center gap-1.5 text-sm text-reca font-semibold hover:text-reca-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        )}
      </div>

      {asistentesErrors?.root?.message && (
        <p className="mb-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          ⚠ {asistentesErrors.root.message}
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field: any, index: number) => {
          const isFirst = index === 0;
          const isLast  = index === fields.length - 1;
          const fieldErrors = asistentesErrors?.[index];

          return (
            <div
              key={field.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border",
                isFirst ? "border-reca-200 bg-reca-50" : "border-gray-100 bg-gray-50"
              )}
            >
              <div className="flex-1">
                {/* Badge fila especial */}
                {(isFirst || (isLast && !isFirst)) && (
                  <div className="mb-3">
                    {isFirst && (
                      <span className="text-xs font-semibold text-reca bg-reca-100 px-2 py-0.5 rounded-full">
                        Profesional RECA
                      </span>
                    )}
                    {isLast && !isFirst && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Asesor Agencia
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nombre */}
                  <FormField
                    label="Nombre completo"
                    htmlFor={`asistentes.${index}.nombre`}
                    required={isFirst}
                    error={fieldErrors?.nombre?.message}
                  >
                    {isFirst ? (
                      <ProfesionalCombobox
                        value={watch("asistentes.0.nombre") ?? ""}
                        onChange={(v) => setValue("asistentes.0.nombre", v, { shouldValidate: true })}
                        onCargoChange={(c) => setValue("asistentes.0.cargo", c)}
                        profesionales={profesionales}
                        error={fieldErrors?.nombre?.message}
                      />
                    ) : (
                      <input
                        id={`asistentes.${index}.nombre`}
                        type="text"
                        {...register(`asistentes.${index}.nombre`)}
                        placeholder={isLast ? "Nombre del asesor agencia..." : "Nombre del asistente"}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-sm",
                          "focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent",
                          fieldErrors?.nombre ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
                        )}
                      />
                    )}
                  </FormField>

                  {/* Cargo */}
                  <FormField label="Cargo" htmlFor={`asistentes.${index}.cargo`}>
                    <input
                      id={`asistentes.${index}.cargo`}
                      type="text"
                      {...register(`asistentes.${index}.cargo`)}
                      placeholder={isLast ? "Asesor Agencia" : "Cargo (opcional)"}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-reca-400 focus:border-transparent"
                    />
                  </FormField>
                </div>
              </div>

              {/* Eliminar solo filas intermedias */}
              {!isFirst && !isLast && fields.length > 2 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-6 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
