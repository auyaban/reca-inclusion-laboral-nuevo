"use client";

import { useEffect, useRef } from "react";
import type {
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { DictationButton } from "@/components/forms/shared/DictationButton";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import type { SensibilizacionValues } from "@/lib/validations/sensibilizacion";

type SensibilizacionObservationsSectionProps = {
  register: UseFormRegister<SensibilizacionValues>;
  errors: FieldErrors<SensibilizacionValues>;
  observaciones: string;
  getValues: UseFormGetValues<SensibilizacionValues>;
  setValue: UseFormSetValue<SensibilizacionValues>;
};

export function SensibilizacionObservationsSection({
  register,
  errors,
  observaciones,
  getValues,
  setValue,
}: SensibilizacionObservationsSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const observacionesField = register("observaciones");

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [observaciones]);

  return (
    <FormField
      label="Observaciones"
      htmlFor="observaciones"
      required
      error={errors.observaciones?.message}
    >
      <div className="space-y-2">
        <textarea
          id="observaciones"
          rows={1}
          {...observacionesField}
          ref={(element) => {
            observacionesField.ref(element);
            textareaRef.current = element;
          }}
          placeholder="Describe los temas tratados, reacciones del equipo, acuerdos o alertas relevantes."
          className={cn(
            "min-h-[14rem] w-full overflow-hidden rounded-xl border px-3.5 py-3 text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
            errors.observaciones ? "border-red-400 bg-red-50" : "border-gray-200"
          )}
        />

        <div className="flex items-center justify-between gap-3">
          <DictationButton
            onTranscript={(text) => {
              const current = getValues("observaciones");
              setValue("observaciones", current ? `${current} ${text}` : text, {
                shouldValidate: true,
              });
            }}
          />

          <div className="flex items-center gap-3">
            {observaciones.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setValue("observaciones", "", {
                    shouldValidate: true,
                  })
                }
                className="text-xs text-gray-400 transition-colors hover:text-red-500"
              >
                Limpiar
              </button>
            ) : null}
            <span className="text-xs text-gray-400">
              {observaciones.length} caracteres
            </span>
          </div>
        </div>
      </div>
    </FormField>
  );
}
