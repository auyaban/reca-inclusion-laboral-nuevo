"use client";

import { useEffect, useRef } from "react";
import type {
  FieldErrors,
  Path,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { DictationButton } from "@/components/forms/shared/DictationButton";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import type { SeleccionValues } from "@/lib/validations/seleccion";

type Props = {
  fieldName: "desarrollo_actividad" | "ajustes_recomendaciones" | "nota";
  label: string;
  placeholder: string;
  required?: boolean;
  value: string;
  register: UseFormRegister<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
  getValues: UseFormGetValues<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
  minHeightClassName?: string;
};

export function SeleccionNarrativeSection({
  fieldName,
  label,
  placeholder,
  required = false,
  value,
  register,
  errors,
  getValues,
  setValue,
  minHeightClassName = "min-h-[14rem]",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const field = register(fieldName);
  const error = errors[fieldName]?.message;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <FormField
      label={label}
      htmlFor={fieldName}
      required={required}
      error={error}
    >
      <div className="space-y-2">
        <textarea
          id={fieldName}
          rows={1}
          {...field}
          ref={(element) => {
            field.ref(element);
            textareaRef.current = element;
          }}
          placeholder={placeholder}
          className={cn(
            "w-full overflow-hidden rounded-xl border px-3.5 py-3 text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
            minHeightClassName,
            error ? "border-red-400 bg-red-50" : "border-gray-200"
          )}
        />

        <div className="flex items-center justify-between gap-3">
          <DictationButton
            onTranscript={(text) => {
              const current = getValues(fieldName);
              setValue(fieldName as Path<SeleccionValues>, current ? `${current} ${text}` : text, {
                shouldValidate: true,
              });
            }}
          />

          <div className="flex items-center gap-3">
            {value.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setValue(fieldName as Path<SeleccionValues>, "", {
                    shouldValidate: true,
                  })
                }
                className="text-xs text-gray-400 transition-colors hover:text-red-500"
              >
                Limpiar
              </button>
            ) : null}
            <span className="text-xs text-gray-400">{value.length} caracteres</span>
          </div>
        </div>
      </div>
    </FormField>
  );
}
