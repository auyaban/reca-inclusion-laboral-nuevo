"use client";

import { useEffect, useMemo } from "react";
import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { UsuarioRecaLookupField } from "@/components/forms/shared/UsuarioRecaLookupField";
import { FormField } from "@/components/ui/FormField";
import {
  INDUCCION_LINKED_PERSON_FIELD_LABELS,
  type InduccionLinkedPerson,
} from "@/lib/inducciones";
import {
  getInduccionUsuariosRecaModifiedFieldIds,
  hasInduccionUsuariosRecaReplaceTargetData,
  isInduccionUsuariosRecaPrefillRowEmpty,
  mapUsuarioRecaToInduccionPrefill,
  type UsuarioRecaRecord,
} from "@/lib/usuariosReca";
import { cn } from "@/lib/utils";

type EditableLinkedPersonFieldId =
  | "nombre_oferente"
  | "telefono_oferente"
  | "cargo_oferente";

type InduccionLinkedPersonSectionProps<TValues extends FieldValues> = {
  fieldNamePrefix: Path<TValues>;
  linkedPerson: InduccionLinkedPerson;
  register: UseFormRegister<TValues>;
  setValue: UseFormSetValue<TValues>;
  errors: FieldErrors<TValues>;
  loadedSnapshot: UsuarioRecaRecord | null;
  onLoadedSnapshotChange: (snapshot: UsuarioRecaRecord | null) => void;
  title?: string;
  description?: string;
};

const INPUT_CLASSNAME =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400";

const EDITABLE_FIELDS = [
  {
    fieldId: "nombre_oferente",
    placeholder: "Nombre completo",
  },
  {
    fieldId: "telefono_oferente",
    placeholder: "Numero de contacto",
  },
  {
    fieldId: "cargo_oferente",
    placeholder: "Cargo o rol",
  },
] as const satisfies readonly {
  fieldId: EditableLinkedPersonFieldId;
  placeholder: string;
}[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getValueAtPath(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((currentValue, segment) => {
    if (!isRecord(currentValue)) {
      return undefined;
    }

    return currentValue[segment];
  }, value);
}

function getFieldError<TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  fieldNamePrefix: Path<TValues>,
  fieldId: keyof InduccionLinkedPerson
) {
  const candidate = getValueAtPath(errors, `${fieldNamePrefix}.${fieldId}`);
  if (!isRecord(candidate)) {
    return undefined;
  }

  return typeof candidate.message === "string" ? candidate.message : undefined;
}

function buildFieldPath<TValues extends FieldValues>(
  fieldNamePrefix: Path<TValues>,
  fieldId: keyof InduccionLinkedPerson
) {
  return `${fieldNamePrefix}.${fieldId}` as Path<TValues>;
}

function LinkedPersonTextField<TValues extends FieldValues>({
  fieldNamePrefix,
  fieldId,
  value,
  placeholder,
  register,
  errors,
  highlighted = false,
  readOnly = false,
}: {
  fieldNamePrefix: Path<TValues>;
  fieldId: keyof InduccionLinkedPerson;
  value: string;
  placeholder?: string;
  register: UseFormRegister<TValues>;
  errors: FieldErrors<TValues>;
  highlighted?: boolean;
  readOnly?: boolean;
}) {
  const fieldPath = buildFieldPath(fieldNamePrefix, fieldId);
  const error = getFieldError(errors, fieldNamePrefix, fieldId);

  return (
    <FormField
      label={INDUCCION_LINKED_PERSON_FIELD_LABELS[fieldId]}
      htmlFor={String(fieldPath)}
      required={!readOnly}
      error={error}
    >
      <input
        id={String(fieldPath)}
        data-testid={String(fieldPath)}
        data-highlighted={highlighted ? "true" : "false"}
        type="text"
        readOnly={readOnly}
        value={readOnly ? value : undefined}
        placeholder={placeholder}
        {...(!readOnly ? register(fieldPath) : {})}
        className={cn(
          INPUT_CLASSNAME,
          error
            ? "border-red-400 bg-red-50"
            : highlighted
              ? "border-amber-300 bg-amber-50"
              : readOnly
                ? "border-gray-200 bg-gray-50 text-gray-600"
                : "border-gray-200"
        )}
      />
    </FormField>
  );
}

export function InduccionLinkedPersonSection<TValues extends FieldValues>({
  fieldNamePrefix,
  linkedPerson,
  register,
  setValue,
  errors,
  loadedSnapshot,
  onLoadedSnapshotChange,
  title = "Datos del vinculado",
  description = "Identificacion, contacto y cargo base de la persona vinculada.",
}: InduccionLinkedPersonSectionProps<TValues>) {
  const modifiedFieldIds = useMemo(
    () =>
      loadedSnapshot
        ? new Set(
            getInduccionUsuariosRecaModifiedFieldIds(loadedSnapshot, linkedPerson)
          )
        : new Set<string>(),
    [linkedPerson, loadedSnapshot]
  );
  const hasReplaceTargetData =
    hasInduccionUsuariosRecaReplaceTargetData(linkedPerson);
  const cedulaFieldPath = buildFieldPath(fieldNamePrefix, "cedula");

  useEffect(() => {
    if (loadedSnapshot && isInduccionUsuariosRecaPrefillRowEmpty(linkedPerson)) {
      onLoadedSnapshotChange(null);
    }
  }, [linkedPerson, loadedSnapshot, onLoadedSnapshotChange]);

  return (
    <div className="space-y-5">
      {loadedSnapshot ? (
        <div
          data-testid={`${fieldNamePrefix}.snapshot-banner`}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Estas modificando datos cargados desde usuarios RECA. Los cambios se
          conservaran en el formulario actual.
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>

        <div className="mt-3">
          <UsuarioRecaLookupField
            id={String(cedulaFieldPath)}
            dataTestIdBase={String(fieldNamePrefix)}
            value={linkedPerson.cedula}
            error={getFieldError(errors, fieldNamePrefix, "cedula")}
            highlighted={modifiedFieldIds.has("cedula")}
            hasReplaceTargetData={hasReplaceTargetData}
            registration={register(cedulaFieldPath)}
            onSuggestionSelect={(cedula) => {
              setValue(cedulaFieldPath, cedula as never, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }}
            onLoadRecord={async (record) => {
              const prefill = mapUsuarioRecaToInduccionPrefill(record);
              for (const [fieldId, fieldValue] of Object.entries(prefill)) {
                setValue(
                  buildFieldPath(
                    fieldNamePrefix,
                    fieldId as keyof InduccionLinkedPerson
                  ),
                  fieldValue as never,
                  {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  }
                );
              }
              onLoadedSnapshotChange(record);
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LinkedPersonTextField
            fieldNamePrefix={fieldNamePrefix}
            fieldId="numero"
            value="1"
            register={register}
            errors={errors}
            readOnly
          />

          {EDITABLE_FIELDS.map((field) => (
            <LinkedPersonTextField
              key={field.fieldId}
              fieldNamePrefix={fieldNamePrefix}
              fieldId={field.fieldId}
              value={linkedPerson[field.fieldId]}
              placeholder={field.placeholder}
              register={register}
              errors={errors}
              highlighted={modifiedFieldIds.has(field.fieldId)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
