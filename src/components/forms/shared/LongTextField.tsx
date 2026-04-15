"use client";

import { useEffect, useRef } from "react";
import type {
  FieldValues,
  Path,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { DictationButton } from "@/components/forms/shared/DictationButton";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";

const TEXTAREA_CLASS =
  "w-full overflow-hidden rounded-xl border px-3.5 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";

type LongTextFieldProps<TFieldValues extends FieldValues> = {
  fieldId: Path<TFieldValues>;
  label: string;
  value: string;
  register: UseFormRegister<TFieldValues>;
  error?: string;
  placeholder?: string;
  minHeightClass?: string;
  required?: boolean;
  getValues?: UseFormGetValues<TFieldValues>;
  setValue?: UseFormSetValue<TFieldValues>;
  enableDictation?: boolean;
  enableClear?: boolean;
  showCharacterCount?: boolean;
};

export function LongTextField<TFieldValues extends FieldValues>({
  fieldId,
  label,
  value,
  register,
  error,
  placeholder,
  minHeightClass = "min-h-[10rem]",
  required = true,
  getValues,
  setValue,
  enableDictation = false,
  enableClear = false,
  showCharacterCount = false,
}: LongTextFieldProps<TFieldValues>) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaField = register(fieldId);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const canUseEnhancedControls = Boolean(getValues && setValue);
  const showFooter =
    (enableDictation && canUseEnhancedControls) ||
    (enableClear && value.length > 0 && canUseEnhancedControls) ||
    showCharacterCount;

  return (
    <FormField label={label} htmlFor={fieldId} required={required} error={error}>
      <div className="space-y-2">
        <textarea
          id={fieldId}
          rows={1}
          {...textareaField}
          ref={(element) => {
            textareaField.ref(element);
            textareaRef.current = element;
          }}
          placeholder={placeholder}
          className={cn(
            TEXTAREA_CLASS,
            minHeightClass,
            error ? "border-red-400 bg-red-50" : "border-gray-200"
          )}
        />

        {showFooter ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              {enableDictation && canUseEnhancedControls ? (
                <DictationButton
                  onTranscript={(text) => {
                    const current = getValues?.(fieldId);
                    const currentText =
                      typeof current === "string" ? current.trimEnd() : "";
                    setValue?.(
                      fieldId,
                      (currentText ? `${currentText} ${text}` : text) as never,
                      {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      }
                    );
                  }}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              {enableClear && value.length > 0 && canUseEnhancedControls ? (
                <button
                  type="button"
                  onClick={() =>
                    setValue?.(fieldId, "" as never, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                  className="text-xs text-gray-400 transition-colors hover:text-red-500"
                >
                  Limpiar
                </button>
              ) : null}

              {showCharacterCount ? (
                <span className="text-xs text-gray-400">
                  {value.length} caracteres
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </FormField>
  );
}
