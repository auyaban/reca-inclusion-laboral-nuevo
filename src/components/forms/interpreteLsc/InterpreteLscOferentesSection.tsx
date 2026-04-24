"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Control,
  FieldErrors,
  Path,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { UsuarioRecaLookupField } from "@/components/forms/shared/UsuarioRecaLookupField";
import { RepeatedPeopleSection } from "@/components/forms/shared/RepeatedPeopleSection";
import { FormField } from "@/components/ui/FormField";
import { BROWSER_AUTOFILL_OFF_PROPS } from "@/lib/browserAutofill";
import { createEmptyInterpreteLscOferenteRow } from "@/lib/interpreteLsc";
import {
  getInterpreteLscUsuariosRecaModifiedFieldIds,
  hasInterpreteLscUsuariosRecaReplaceTargetData,
  isInterpreteLscUsuariosRecaPrefillRowEmpty,
  mapUsuarioRecaToInterpreteLscPrefill,
  type UsuarioRecaRecord,
} from "@/lib/usuariosReca";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";
import { cn } from "@/lib/utils";

type Props = {
  control: Control<InterpreteLscValues>;
  register: UseFormRegister<InterpreteLscValues>;
  setValue: UseFormSetValue<InterpreteLscValues>;
  errors: FieldErrors<InterpreteLscValues>;
};

type OferenteRow = InterpreteLscValues["oferentes"][number];
type OferenteFieldId = keyof OferenteRow;

function getFieldError(
  errors: FieldErrors<InterpreteLscValues>,
  index: number,
  fieldName: OferenteFieldId
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

function OferenteTextField({
  fieldPath,
  label,
  placeholder,
  error,
  highlighted = false,
  register,
}: {
  fieldPath: Path<InterpreteLscValues>;
  label: string;
  placeholder: string;
  error?: string;
  highlighted?: boolean;
  register: UseFormRegister<InterpreteLscValues>;
}) {
  return (
    <FormField
      label={label}
      htmlFor={String(fieldPath)}
      required
      error={error}
    >
      <input
        id={String(fieldPath)}
        type="text"
        data-highlighted={highlighted ? "true" : "false"}
        {...register(fieldPath)}
        placeholder={placeholder}
        {...BROWSER_AUTOFILL_OFF_PROPS}
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-sm",
          "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
          error
            ? "border-red-400 bg-red-50"
            : highlighted
              ? "border-amber-300 bg-amber-50"
              : "border-gray-200"
        )}
      />
    </FormField>
  );
}

function InterpreteLscOferenteRowContent({
  index,
  row,
  register,
  setValue,
  errors,
}: {
  index: number;
  row: OferenteRow;
  register: UseFormRegister<InterpreteLscValues>;
  setValue: UseFormSetValue<InterpreteLscValues>;
  errors: FieldErrors<InterpreteLscValues>;
}) {
  const [loadedSnapshot, setLoadedSnapshot] = useState<UsuarioRecaRecord | null>(
    null
  );

  const modifiedFieldIds = useMemo(
    () =>
      loadedSnapshot
        ? new Set(
            getInterpreteLscUsuariosRecaModifiedFieldIds(loadedSnapshot, row)
          )
        : new Set<string>(),
    [loadedSnapshot, row]
  );
  const hasReplaceTargetData =
    hasInterpreteLscUsuariosRecaReplaceTargetData(row);
  const selectedPersonName =
    loadedSnapshot?.nombre_usuario?.trim() || row.nombre_oferente.trim();
  const cedulaField = `oferentes.${index}.cedula` as Path<InterpreteLscValues>;
  const nombreField =
    `oferentes.${index}.nombre_oferente` as Path<InterpreteLscValues>;
  const procesoField = `oferentes.${index}.proceso` as Path<InterpreteLscValues>;

  useEffect(() => {
    if (
      loadedSnapshot &&
      isInterpreteLscUsuariosRecaPrefillRowEmpty(row)
    ) {
      setLoadedSnapshot(null);
    }
  }, [loadedSnapshot, row]);

  return (
    <div className="space-y-5">
      {loadedSnapshot ? (
        <div
          data-testid={`oferentes.${index}.snapshot-banner`}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Estas modificando datos cargados desde usuarios RECA. El proceso se
          conserva como campo manual del servicio.
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            Datos del oferente
          </h4>
          <p className="text-xs text-gray-500">
            Busca por cedula en usuarios RECA para completar los datos base. El
            proceso sigue siendo manual.
          </p>
          {selectedPersonName ? (
            <p
              data-testid={`oferentes.${index}.selected-summary`}
              className="mt-1 text-sm font-medium text-gray-900"
            >
              {selectedPersonName}
            </p>
          ) : null}
        </div>

        <div className="mt-3">
          <UsuarioRecaLookupField
            id={String(cedulaField)}
            dataTestIdBase={`oferentes.${index}`}
            value={row.cedula}
            selectedRecordCedula={loadedSnapshot?.cedula_usuario ?? null}
            error={getFieldError(errors, index, "cedula")}
            highlighted={modifiedFieldIds.has("cedula")}
            hasReplaceTargetData={hasReplaceTargetData}
            registration={register(cedulaField)}
            onSuggestionSelect={(cedula) => {
              setValue(cedulaField, cedula, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }}
            onLoadRecord={async (record) => {
              const prefill = mapUsuarioRecaToInterpreteLscPrefill(record);
              for (const [fieldName, fieldValue] of Object.entries(prefill)) {
                setValue(
                  `oferentes.${index}.${fieldName}` as Path<InterpreteLscValues>,
                  fieldValue,
                  {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  }
                );
              }
              setLoadedSnapshot(record);
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <OferenteTextField
            fieldPath={nombreField}
            label="Nombre del oferente"
            placeholder="Nombre completo"
            error={getFieldError(errors, index, "nombre_oferente")}
            highlighted={modifiedFieldIds.has("nombre_oferente")}
            register={register}
          />

          <OferenteTextField
            fieldPath={procesoField}
            label="Proceso"
            placeholder="Ej: Seleccion, proceso interno o apoyo"
            error={getFieldError(errors, index, "proceso")}
            register={register}
          />
        </div>
      </section>
    </div>
  );
}

export function InterpreteLscOferentesSection({
  control,
  register,
  setValue,
  errors,
}: Props) {
  return (
    <RepeatedPeopleSection
      control={control}
      errors={errors}
      name="oferentes"
      title="Oferentes / vinculados"
      helperText="Empieza con 1 fila visible y agrega hasta 10 cuando el servicio lo requiera. Cada card permite consultar usuarios RECA por cedula; el proceso sigue siendo manual."
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
      renderRow={({ index, row }) => (
        <InterpreteLscOferenteRowContent
          index={index}
          row={row}
          register={register}
          setValue={setValue}
          errors={errors}
        />
      )}
    />
  );
}
