"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/ui/FormField";
import { normalizeSeguimientosDateInput } from "@/lib/seguimientosDates";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";

function getFieldClasses(options: {
  hasError: boolean;
  readOnly?: boolean;
  highlighted?: boolean;
}) {
  if (options.hasError) {
    return cn(
      INPUT_CLASS,
      "border-red-400 bg-red-50",
      options.readOnly ? "text-gray-700" : null
    );
  }

  if (options.highlighted) {
    return cn(
      INPUT_CLASS,
      "border-amber-300 bg-amber-50",
      options.readOnly ? "text-amber-900" : null
    );
  }

  return cn(
    INPUT_CLASS,
    "border-gray-200 bg-white",
    options.readOnly ? "bg-gray-50 text-gray-700" : null
  );
}

type SeguimientosDateFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  fieldId: Path<TFieldValues>;
  label: string;
  error?: string;
  highlighted?: boolean;
  hint?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

export function SeguimientosDateField<TFieldValues extends FieldValues>({
  control,
  fieldId,
  label,
  error,
  highlighted = false,
  hint,
  disabled = false,
  readOnly = false,
}: SeguimientosDateFieldProps<TFieldValues>) {
  return (
    <FormField label={label} htmlFor={fieldId} error={error} hint={hint}>
      <Controller
        control={control}
        name={fieldId}
        render={({ field }) => (
          <input
            id={fieldId}
            type="date"
            disabled={disabled}
            readOnly={readOnly}
            value={
              typeof field.value === "string"
                ? normalizeSeguimientosDateInput(field.value) ?? ""
                : ""
            }
            onChange={(event) => {
              field.onChange(event.target.value);
            }}
            onBlur={field.onBlur}
            className={getFieldClasses({
              hasError: Boolean(error),
              highlighted,
              readOnly: disabled || readOnly,
            })}
          />
        )}
      />
    </FormField>
  );
}
