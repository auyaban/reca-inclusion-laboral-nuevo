"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import type {
  Control,
  FieldErrors,
  Path,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import { LongFormDisabledSectionState } from "@/components/forms/shared/LongFormDisabledSectionState";
import {
  LongFormSectionCard,
  type LongFormSectionStatus,
} from "@/components/forms/shared/LongFormSectionCard";
import { LongFormShell } from "@/components/forms/shared/LongFormShell";
import { LongTextField } from "@/components/forms/shared/LongTextField";
import { InduccionCompanySection } from "@/components/forms/inducciones/InduccionCompanySection";
import { InduccionLinkedPersonSection } from "@/components/forms/inducciones/InduccionLinkedPersonSection";
import { FormField } from "@/components/ui/FormField";
import { getPrefixedDropdownUpdates } from "@/lib/prefixedDropdowns";
import {
  INDUCCION_OPERATIVA_SECTION_3_GROUPS,
  INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_4_BLOCKS,
  INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS,
  INDUCCION_OPERATIVA_SECTION_5_ROWS,
  type InduccionOperativaValues,
} from "@/lib/induccionOperativa";
import {
  getInduccionOperativaPrefixSyncRule,
  getInduccionOperativaSelectOptions,
  INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS,
  INDUCCION_OPERATIVA_OBSERVACIONES_OPTIONS,
} from "@/lib/induccionOperativaPrefixedDropdowns";
import type { Profesional } from "@/hooks/useProfesionalesCatalog";
import type { Empresa } from "@/lib/store/empresaStore";
import { cn } from "@/lib/utils";
import type { UsuarioRecaRecord } from "@/lib/usuariosReca";

type ShellProps = Omit<
  ComponentProps<typeof LongFormShell>,
  "children" | "draftStatus" | "notice"
>;

type BaseSectionProps = {
  collapsed: boolean;
  status: LongFormSectionStatus;
  sectionRef: RefObject<HTMLElement | null>;
  onToggle: () => void;
  onFocusCapture: () => void;
};

type CompanySectionProps = BaseSectionProps & {
  empresa: Empresa | null;
  fechaVisita?: string;
  modalidad?: string;
  nitEmpresa?: string;
  onSelectEmpresa: (empresa: Empresa) => void;
};

type VinculadoSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<InduccionOperativaValues>;
  setValue: UseFormSetValue<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
  linkedPerson: InduccionOperativaValues["vinculado"];
  loadedSnapshot: UsuarioRecaRecord | null;
  onLoadedSnapshotChange: (snapshot: UsuarioRecaRecord | null) => void;
};

type DevelopmentSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  values: InduccionOperativaValues["section_3"];
  register: UseFormRegister<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
  setValue: UseFormSetValue<InduccionOperativaValues>;
};

type SocioemotionalSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  values: InduccionOperativaValues["section_4"];
  register: UseFormRegister<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
  setValue: UseFormSetValue<InduccionOperativaValues>;
};

type SupportSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  values: InduccionOperativaValues["section_5"];
  register: UseFormRegister<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
  setValue: UseFormSetValue<InduccionOperativaValues>;
};

type LongTextSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  value: string;
  fieldName: Path<InduccionOperativaValues>;
  label: string;
  required?: boolean;
  register: UseFormRegister<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
  getValues: UseFormGetValues<InduccionOperativaValues>;
  setValue: UseFormSetValue<InduccionOperativaValues>;
};

type FollowupSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  value: string;
  register: UseFormRegister<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<InduccionOperativaValues>;
  register: UseFormRegister<InduccionOperativaValues>;
  setValue: UseFormSetValue<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
};

export type InduccionOperativaFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  sections: {
    company: CompanySectionProps;
    vinculado: VinculadoSectionProps;
    development: DevelopmentSectionProps;
    socioemotional: SocioemotionalSectionProps;
    support: SupportSectionProps;
    adjustments: LongTextSectionProps;
    followup: FollowupSectionProps;
    observations: LongTextSectionProps;
    attendees: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

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

function getFieldError<TFieldName extends string>(
  errors: FieldErrors<InduccionOperativaValues>,
  fieldName: TFieldName
) {
  const candidate = getValueAtPath(errors, fieldName);
  if (!isRecord(candidate)) {
    return undefined;
  }

  return typeof candidate.message === "string" ? candidate.message : undefined;
}

function SectionSelectField({
  fieldPath,
  label,
  value,
  register,
  errors,
  setValue,
  options,
  syncRuleFieldId,
  required = true,
}: {
  fieldPath: Path<InduccionOperativaValues>;
  label: string;
  value: string;
  register: UseFormRegister<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
  setValue: UseFormSetValue<InduccionOperativaValues>;
  options: readonly string[];
  syncRuleFieldId?: string;
  required?: boolean;
}) {
  const error = getFieldError(errors, fieldPath);
  return (
    <FormField label={label} htmlFor={fieldPath} error={error} required={required}>
      <select
        id={fieldPath}
        data-testid={String(fieldPath)}
        value={value}
        {...register(fieldPath)}
        onChange={(event) => {
          const nextValue = String(event.target.value ?? "");
          setValue(fieldPath, nextValue as never, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });

          if (!syncRuleFieldId) {
            return;
          }

          const syncRule = getInduccionOperativaPrefixSyncRule(
            syncRuleFieldId as never
          );
          if (!syncRule) {
            return;
          }

          const updates = getPrefixedDropdownUpdates({
            rule: syncRule as never,
            changedFieldId: syncRuleFieldId as never,
            changedValue: nextValue,
            getOptions: (fieldId) =>
              getInduccionOperativaSelectOptions(fieldId as never),
          });

          Object.entries(updates).forEach(([targetFieldId, targetValue]) => {
            const targetPath = fieldPath.replace(syncRuleFieldId, targetFieldId);
            setValue(targetPath as Path<InduccionOperativaValues>, targetValue as never, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
          });
        }}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400"
      >
        <option value="">Selecciona una opcion</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function TextField({
  fieldPath,
  label,
  placeholder,
  register,
  errors,
  required = true,
}: {
  fieldPath: Path<InduccionOperativaValues>;
  label: string;
  placeholder?: string;
  register: UseFormRegister<InduccionOperativaValues>;
  errors: FieldErrors<InduccionOperativaValues>;
  required?: boolean;
}) {
  const error = getFieldError(errors, fieldPath);

  return (
    <FormField label={label} htmlFor={fieldPath} error={error} required={required}>
      <input
        id={fieldPath}
        data-testid={String(fieldPath)}
        type="text"
        {...register(fieldPath)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
          error ? "border-red-400 bg-red-50" : "border-gray-200"
        )}
      />
    </FormField>
  );
}

function BulkButtons({ onApply }: { onApply: (value: string) => void }) {
  const actions = [
    { label: "Todo si", value: "Si" },
    { label: "Todo no", value: "No" },
    { label: "Todo no aplica", value: "No aplica" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => onApply(action.value)}
          className="rounded-full border border-reca-200 bg-white px-3 py-1.5 text-xs font-semibold text-reca transition-colors hover:border-reca hover:bg-reca-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function DevelopmentSection({
  values,
  register,
  errors,
  setValue,
}: DevelopmentSectionProps) {
  return (
    <div className="space-y-4">
      {INDUCCION_OPERATIVA_SECTION_3_GROUPS.map((group) => (
        <section
          key={group.id}
          className="rounded-2xl border border-gray-200 bg-white p-4"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{group.title}</h4>
              <p className="mt-0.5 text-xs text-gray-500">
                Aplica acciones masivas solo a ejecucion.
              </p>
            </div>
            <BulkButtons
              onApply={(value) => {
                group.itemIds.forEach((itemId) => {
                  setValue(`section_3.${itemId}.ejecucion`, value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                });
              }}
            />
          </div>

          <div className="space-y-3">
            {group.itemIds.map((itemId) => (
              <div
                key={itemId}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <h5 className="mb-3 text-sm font-semibold text-gray-900">
                  {INDUCCION_OPERATIVA_SECTION_3_ITEM_LABELS[itemId]}
                </h5>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SectionSelectField
                    fieldPath={`section_3.${itemId}.ejecucion`}
                    label="Ejecucion"
                    value={values[itemId].ejecucion}
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    options={["Si", "No", "No aplica"]}
                  />
                  <TextField
                    fieldPath={`section_3.${itemId}.observaciones`}
                    label="Observaciones"
                    placeholder="Observacion breve"
                    register={register}
                    errors={errors}
                    required={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SocioemotionalSection({
  values,
  register,
  errors,
  setValue,
}: SocioemotionalSectionProps) {
  return (
    <div className="space-y-4">
      {INDUCCION_OPERATIVA_SECTION_4_BLOCKS.map((block) => (
        <section
          key={block.id}
          className="rounded-2xl border border-gray-200 bg-white p-4"
        >
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900">{block.title}</h4>
          </div>

          <div className="space-y-4">
            {block.items.map((itemId) => (
              <div
                key={itemId}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <h5 className="mb-3 text-sm font-semibold text-gray-900">
                  {INDUCCION_OPERATIVA_SECTION_4_ITEM_LABELS[itemId]}
                </h5>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SectionSelectField
                    fieldPath={`section_4.items.${itemId}.nivel_apoyo`}
                    label="Nivel de apoyo"
                    value={values.items[itemId].nivel_apoyo}
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    options={INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS}
                    syncRuleFieldId={`${itemId}.nivel_apoyo`}
                  />
                  <SectionSelectField
                    fieldPath={`section_4.items.${itemId}.observaciones`}
                    label="Observaciones"
                    value={values.items[itemId].observaciones}
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    options={INDUCCION_OPERATIVA_OBSERVACIONES_OPTIONS}
                    syncRuleFieldId={`${itemId}.observaciones`}
                    required={false}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <FormField
              label="Nota del bloque"
              htmlFor={`section_4.notes.${block.id}`}
              required={false}
              error={getFieldError(errors, `section_4.notes.${block.id}`)}
            >
              <textarea
                id={`section_4.notes.${block.id}`}
                data-testid={`section_4.notes.${block.id}`}
                rows={2}
                {...register(`section_4.notes.${block.id}` as Path<InduccionOperativaValues>)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400"
              />
            </FormField>
          </div>
        </section>
      ))}
    </div>
  );
}

function SupportSection({ values, register, errors, setValue }: SupportSectionProps) {
  return (
    <div className="space-y-4">
      {INDUCCION_OPERATIVA_SECTION_5_ROWS.map((row) => (
        <section
          key={row.id}
          className="rounded-2xl border border-gray-200 bg-white p-4"
        >
          <h4 className="mb-3 text-sm font-semibold text-gray-900">{row.label}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SectionSelectField
              fieldPath={`section_5.${row.id}.nivel_apoyo_requerido`}
              label="Nivel de apoyo requerido"
              value={values[row.id].nivel_apoyo_requerido}
              register={register}
              errors={errors}
              setValue={setValue}
              options={INDUCCION_OPERATIVA_NIVEL_APOYO_OPTIONS}
            />
            <TextField
              fieldPath={`section_5.${row.id}.observaciones`}
              label="Observaciones"
              placeholder="Observacion breve"
              register={register}
              errors={errors}
              required={false}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function LongTextSection({
  fieldName,
  label,
  value,
  register,
  errors,
  getValues,
  setValue,
  required = true,
}: LongTextSectionProps) {
  return (
    <LongTextField<InduccionOperativaValues>
      fieldId={fieldName}
      label={label}
      value={value}
      register={register}
      error={getFieldError(errors, fieldName)}
      required={required}
      getValues={getValues}
      setValue={setValue}
      enableDictation
      enableClear
      showCharacterCount
    />
  );
}

function FollowupSection({ register, errors }: FollowupSectionProps) {
  return (
    <FormField
      label="Fecha primer seguimiento"
      htmlFor="fecha_primer_seguimiento"
      required
      error={errors.fecha_primer_seguimiento?.message}
    >
      <input
        id="fecha_primer_seguimiento"
        type="date"
        {...register("fecha_primer_seguimiento")}
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-sm",
          "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
          errors.fecha_primer_seguimiento
            ? "border-red-400 bg-red-50"
            : "border-gray-200"
        )}
      />
    </FormField>
  );
}

export function InduccionOperativaFormPresenter({
  shell,
  draftStatus,
  notice,
  sections,
  submitDialog,
}: InduccionOperativaFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa"
          description="Confirma la empresa y revisa el snapshot general antes de diligenciar la induccion operativa."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          {sections.company.empresa ? (
            <InduccionCompanySection
              empresa={sections.company.empresa}
              fechaVisita={sections.company.fechaVisita}
              modalidad={sections.company.modalidad}
              nitEmpresa={sections.company.nitEmpresa}
              onSelectEmpresa={sections.company.onSelectEmpresa}
            />
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="vinculado"
          title="Vinculado"
          description="Un solo vinculado con lookup en usuarios RECA y contrato fijo de numero."
          status={sections.vinculado.status}
          collapsed={sections.vinculado.collapsed}
          onToggle={sections.vinculado.onToggle}
          sectionRef={sections.vinculado.sectionRef}
          onFocusCapture={sections.vinculado.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.vinculado.isDocumentEditable}>
              <InduccionLinkedPersonSection<InduccionOperativaValues>
                fieldNamePrefix={"vinculado" as Path<InduccionOperativaValues>}
                linkedPerson={sections.vinculado.linkedPerson}
                register={sections.vinculado.register}
                setValue={sections.vinculado.setValue}
                errors={sections.vinculado.errors}
                loadedSnapshot={sections.vinculado.loadedSnapshot}
                onLoadedSnapshotChange={sections.vinculado.onLoadedSnapshotChange}
                title="Datos del vinculado"
                description="La persona vinculada se diligencia una sola vez."
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="development"
          title="Desarrollo de la induccion"
          description="Matriz de 11 items con buttons masivos por subseccion para el campo Ejecucion."
          status={sections.development.status}
          collapsed={sections.development.collapsed}
          onToggle={sections.development.onToggle}
          sectionRef={sections.development.sectionRef}
          onFocusCapture={sections.development.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.development.isDocumentEditable}>
              <DevelopmentSection {...sections.development} />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="socioemotional"
          title="Habilidades socioemocionales"
          description="Bloques de evaluacion con sincronizacion prefijada entre nivel de apoyo y observaciones."
          status={sections.socioemotional.status}
          collapsed={sections.socioemotional.collapsed}
          onToggle={sections.socioemotional.onToggle}
          sectionRef={sections.socioemotional.sectionRef}
          onFocusCapture={sections.socioemotional.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.socioemotional.isDocumentEditable}>
              <SocioemotionalSection {...sections.socioemotional} />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="support"
          title="Nivel de apoyo requerido"
          description="Cada fila combina un nivel de apoyo con observaciones textuales libres."
          status={sections.support.status}
          collapsed={sections.support.collapsed}
          onToggle={sections.support.onToggle}
          sectionRef={sections.support.sectionRef}
          onFocusCapture={sections.support.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.support.isDocumentEditable}>
              <SupportSection {...sections.support} />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="adjustments"
          title="Ajustes razonables requeridos"
          description="Texto largo con dictado para dejar claros los ajustes requeridos."
          status={sections.adjustments.status}
          collapsed={sections.adjustments.collapsed}
          onToggle={sections.adjustments.onToggle}
          sectionRef={sections.adjustments.sectionRef}
          onFocusCapture={sections.adjustments.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.adjustments.isDocumentEditable}>
              <LongTextSection {...sections.adjustments} />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="followup"
          title="Primer seguimiento"
          description="Fecha del primer seguimiento despues de la induccion."
          status={sections.followup.status}
          collapsed={sections.followup.collapsed}
          onToggle={sections.followup.onToggle}
          sectionRef={sections.followup.sectionRef}
          onFocusCapture={sections.followup.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.followup.isDocumentEditable}>
              <FollowupSection {...sections.followup} />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="observations"
          title="Observaciones / recomendaciones"
          description="Texto largo de cierre con dictado."
          status={sections.observations.status}
          collapsed={sections.observations.collapsed}
          onToggle={sections.observations.onToggle}
          sectionRef={sections.observations.sectionRef}
          onFocusCapture={sections.observations.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.observations.isDocumentEditable}>
              <LongTextSection {...sections.observations} />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="attendees"
          title="Asistentes"
          description="Asistentes compartidos con el resto del proyecto."
          status={sections.attendees.status}
          collapsed={sections.attendees.collapsed}
          onToggle={sections.attendees.onToggle}
          sectionRef={sections.attendees.sectionRef}
          onFocusCapture={sections.attendees.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.attendees.isDocumentEditable}>
              <AsistentesSection
                control={sections.attendees.control}
                register={sections.attendees.register}
                setValue={sections.attendees.setValue}
                errors={sections.attendees.errors}
                profesionales={sections.attendees.profesionales}
                mode="reca_plus_generic_attendees"
                profesionalAsignado={sections.attendees.profesionalAsignado}
                summaryText="Minimo 1 persona - maximo 10"
                helperText="Fila 0 reservada al profesional RECA."
                intermediateCargoPlaceholder="Cargo"
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>
      </LongFormShell>

      <FormSubmitConfirmDialog {...submitDialog} />
    </>
  );
}
