"use client";

import type {
  Control,
  FieldErrors,
  Path,
  UseFormRegister,
} from "react-hook-form";
import { RepeatedPeopleSection } from "@/components/forms/shared/RepeatedPeopleSection";
import { FormField } from "@/components/ui/FormField";
import { BROWSER_AUTOFILL_OFF_PROPS } from "@/lib/browserAutofill";
import { createEmptyInterpreteLscOferenteRow } from "@/lib/interpreteLsc";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";
import { cn } from "@/lib/utils";

type Props = {
  control: Control<InterpreteLscValues>;
  register: UseFormRegister<InterpreteLscValues>;
  errors: FieldErrors<InterpreteLscValues>;
};

function getFieldError(
  errors: FieldErrors<InterpreteLscValues>,
  index: number,
  fieldName: keyof InterpreteLscValues["oferentes"][number]
) {
  const rowErrors = errors.oferentes;
  if (!Array.isArray(rowErrors)) {
    return undefined;
  }

  const candidate = rowErrors[index];
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const fieldError = (
    candidate as Record<string, { message?: string }>
  )[fieldName];
  return fieldError?.message;
}

export function InterpreteLscOferentesSection({
  control,
  register,
  errors,
}: Props) {
  return (
    <RepeatedPeopleSection
      control={control}
      errors={errors}
      name="oferentes"
      title="Oferentes / vinculados"
      helperText="Empieza con 1 fila visible y agrega hasta 10 cuando el servicio lo requiera. Solo se publican las filas con informacion real."
      config={{
        itemLabelSingular: "Oferente",
        itemLabelPlural: "Oferentes",
        primaryNameField: "nombre_oferente",
        meaningfulFieldIds: ["nombre_oferente", "cedula", "proceso"],
        createEmptyRow: createEmptyInterpreteLscOferenteRow,
        maxRows: 10,
        getCardSubtitle: (row) => {
          const cedula = row.cedula.trim();
          const proceso = row.proceso.trim();
          if (cedula && proceso) {
            return `${cedula} - ${proceso}`;
          }

          return cedula || proceso || null;
        },
      }}
      renderRow={({ index }) => {
        const nombreField = `oferentes.${index}.nombre_oferente` as Path<InterpreteLscValues>;
        const cedulaField = `oferentes.${index}.cedula` as Path<InterpreteLscValues>;
        const procesoField = `oferentes.${index}.proceso` as Path<InterpreteLscValues>;

        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label="Nombre del oferente"
              htmlFor={String(nombreField)}
              required
              error={getFieldError(errors, index, "nombre_oferente")}
            >
              <input
                id={String(nombreField)}
                type="text"
                {...register(nombreField)}
                placeholder="Nombre completo"
                {...BROWSER_AUTOFILL_OFF_PROPS}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                  getFieldError(errors, index, "nombre_oferente")
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200"
                )}
              />
            </FormField>

            <FormField
              label="Cedula"
              htmlFor={String(cedulaField)}
              required
              error={getFieldError(errors, index, "cedula")}
            >
              <input
                id={String(cedulaField)}
                type="text"
                {...register(cedulaField)}
                placeholder="Documento"
                {...BROWSER_AUTOFILL_OFF_PROPS}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                  getFieldError(errors, index, "cedula")
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200"
                )}
              />
            </FormField>

            <FormField
              label="Proceso"
              htmlFor={String(procesoField)}
              required
              error={getFieldError(errors, index, "proceso")}
            >
              <input
                id={String(procesoField)}
                type="text"
                {...register(procesoField)}
                placeholder="Ej: Seleccion, proceso interno o apoyo"
                {...BROWSER_AUTOFILL_OFF_PROPS}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                  getFieldError(errors, index, "proceso")
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200"
                )}
              />
            </FormField>
          </div>
        );
      }}
    />
  );
}
