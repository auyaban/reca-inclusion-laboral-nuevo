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
import { EvaluacionCompanySection } from "@/components/forms/evaluacion/EvaluacionCompanySection";
import { EvaluacionQuestionSection } from "@/components/forms/evaluacion/EvaluacionQuestionSections";
import { EvaluacionSection4Card } from "@/components/forms/evaluacion/EvaluacionSection4Card";
import { EvaluacionSection5Card } from "@/components/forms/evaluacion/EvaluacionSection5Card";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import { LongFormDisabledSectionState } from "@/components/forms/shared/LongFormDisabledSectionState";
import {
  LongFormSectionCard,
  type LongFormSectionStatus,
} from "@/components/forms/shared/LongFormSectionCard";
import { LongFormShell } from "@/components/forms/shared/LongFormShell";
import { LongTextField } from "@/components/forms/shared/LongTextField";
import type { Profesional } from "@/hooks/useProfesionalesCatalog";
import type { EvaluacionAccessibilitySummary } from "@/lib/evaluacion";
import {
  EVALUACION_QUESTION_SECTION_IDS,
  EVALUACION_SECTION_LABELS,
  type EvaluacionQuestionSectionId,
} from "@/lib/evaluacionSections";
import type { Empresa } from "@/lib/store/empresaStore";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

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
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
  onSelectEmpresa: (empresa: Empresa) => void;
  disabled?: boolean;
};

type NarrativeSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  fieldName: Path<EvaluacionValues>;
  label: string;
  value: string;
  required?: boolean;
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
  getValues: UseFormGetValues<EvaluacionValues>;
  setValue: UseFormSetValue<EvaluacionValues>;
  placeholder: string;
};

type QuestionSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  sectionId: EvaluacionQuestionSectionId;
  values: EvaluacionValues[EvaluacionQuestionSectionId];
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
  getValues: UseFormGetValues<EvaluacionValues>;
  setValue: UseFormSetValue<EvaluacionValues>;
};

type ConceptSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  values: EvaluacionValues["section_4"];
  summary: EvaluacionAccessibilitySummary;
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
};

type Section5Props = BaseSectionProps & {
  isDocumentEditable: boolean;
  values: EvaluacionValues["section_5"];
  register: UseFormRegister<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<EvaluacionValues>;
  register: UseFormRegister<EvaluacionValues>;
  setValue: UseFormSetValue<EvaluacionValues>;
  errors: FieldErrors<EvaluacionValues>;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
  minMeaningfulAttendees?: number;
  summaryText?: string;
  helperText?: string;
  isAgencyAdvisorRowRequired?: boolean;
};

export type EvaluacionFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  sections: {
    company: CompanySectionProps;
    questionSections: Record<EvaluacionQuestionSectionId, QuestionSectionProps>;
    section_4: ConceptSectionProps;
    section_5: Section5Props;
    section_6: NarrativeSectionProps;
    section_7: NarrativeSectionProps;
    section_8: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
  failedVisitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

const QUESTION_SECTION_DESCRIPTIONS: Record<
  EvaluacionQuestionSectionId,
  string
> = {
  section_2_1:
    "Condiciones de movilidad, urbanismo y acceso exterior alrededor de la empresa.",
  section_2_2:
    "Condiciones generales del entorno y del puesto para distintos perfiles de discapacidad.",
  section_2_3:
    "Infraestructura y arquitectura relevante para discapacidad fisica.",
  section_2_4:
    "Accesibilidad sensorial, alarmas y ajustes razonables.",
  section_2_5:
    "Materiales y apoyos del proceso para discapacidad intelectual y TEA.",
  section_2_6:
    "Condiciones asociadas a discapacidad psicosocial.",
  section_3:
    "Condiciones organizacionales, cultura y practicas internas de inclusion.",
};

function getFieldError(
  errors: FieldErrors<EvaluacionValues>,
  fieldName: Path<EvaluacionValues>
) {
  const candidate = (errors as Record<string, { message?: unknown } | undefined>)[
    fieldName
  ];
  return candidate && typeof candidate.message === "string"
    ? candidate.message
    : undefined;
}

function EvaluacionNarrativeSection({
  fieldName,
  label,
  value,
  register,
  errors,
  getValues,
  setValue,
  placeholder,
  required,
}: Omit<NarrativeSectionProps, keyof BaseSectionProps | "isDocumentEditable">) {
  return (
    <LongTextField<EvaluacionValues>
      fieldId={fieldName}
      label={label}
      value={value}
      required={required}
      register={register}
      error={getFieldError(errors, fieldName)}
      placeholder={placeholder}
      getValues={getValues}
      setValue={setValue}
      enableDictation
      showCharacterCount
    />
  );
}

export function EvaluacionFormPresenter({
  shell,
  draftStatus,
  notice,
  sections,
  submitDialog,
  failedVisitDialog,
}: EvaluacionFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa"
          description="Confirma la empresa, revisa el snapshot operativo y mantiene editables los datos base del acta."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          <EvaluacionCompanySection
            empresa={sections.company.empresa}
            fechaVisita={sections.company.fechaVisita}
            modalidad={sections.company.modalidad}
            nitEmpresa={sections.company.nitEmpresa}
            register={sections.company.register}
            errors={sections.company.errors}
            onSelectEmpresa={sections.company.onSelectEmpresa}
            disabled={sections.company.disabled}
          />
        </LongFormSectionCard>

        {EVALUACION_QUESTION_SECTION_IDS.map((sectionId) => (
          <LongFormSectionCard
            key={sectionId}
            id={sectionId}
            title={EVALUACION_SECTION_LABELS[sectionId]}
            description={QUESTION_SECTION_DESCRIPTIONS[sectionId]}
            status={sections.questionSections[sectionId].status}
            collapsed={sections.questionSections[sectionId].collapsed}
            onToggle={sections.questionSections[sectionId].onToggle}
            sectionRef={sections.questionSections[sectionId].sectionRef}
            onFocusCapture={sections.questionSections[sectionId].onFocusCapture}
          >
            {hasEmpresa ? (
              <fieldset
                disabled={!sections.questionSections[sectionId].isDocumentEditable}
              >
                <EvaluacionQuestionSection
                  sectionId={sectionId}
                  values={sections.questionSections[sectionId].values}
                  register={sections.questionSections[sectionId].register}
                  errors={sections.questionSections[sectionId].errors}
                  getValues={sections.questionSections[sectionId].getValues}
                  setValue={sections.questionSections[sectionId].setValue}
                />
              </fieldset>
            ) : (
              <LongFormDisabledSectionState />
            )}
          </LongFormSectionCard>
        ))}

        <LongFormSectionCard
          id="section_4"
          title="4. Concepto de evaluacion"
          description="Resume el resultado del formulario, muestra el nivel sugerido y conserva editable solo el nivel final."
          status={sections.section_4.status}
          collapsed={sections.section_4.collapsed}
          onToggle={sections.section_4.onToggle}
          sectionRef={sections.section_4.sectionRef}
          onFocusCapture={sections.section_4.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.section_4.isDocumentEditable}>
              <EvaluacionSection4Card
                values={sections.section_4.values}
                summary={sections.section_4.summary}
                register={sections.section_4.register}
                errors={sections.section_4.errors}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="section_5"
          title="5. Ajustes razonables"
          description="Catalogo fijo de ajustes aplicables por tipo de discapacidad. Solo se diligencia la decision Aplica / No aplica."
          status={sections.section_5.status}
          collapsed={sections.section_5.collapsed}
          onToggle={sections.section_5.onToggle}
          sectionRef={sections.section_5.sectionRef}
          onFocusCapture={sections.section_5.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.section_5.isDocumentEditable}>
              <EvaluacionSection5Card
                values={sections.section_5.values}
                register={sections.section_5.register}
                errors={sections.section_5.errors}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="section_6"
          title="6. Observaciones"
          description="Registro narrativo general de la visita y los hallazgos consolidados."
          status={sections.section_6.status}
          collapsed={sections.section_6.collapsed}
          onToggle={sections.section_6.onToggle}
          sectionRef={sections.section_6.sectionRef}
          onFocusCapture={sections.section_6.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.section_6.isDocumentEditable}>
              <EvaluacionNarrativeSection
                fieldName={sections.section_6.fieldName}
                label={sections.section_6.label}
                value={sections.section_6.value}
                register={sections.section_6.register}
                errors={sections.section_6.errors}
                getValues={sections.section_6.getValues}
                setValue={sections.section_6.setValue}
                placeholder={sections.section_6.placeholder}
                required={sections.section_6.required}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="section_7"
          title="7. Cargos compatibles"
          description="Sintetiza los cargos o roles que hoy se consideran compatibles con la empresa."
          status={sections.section_7.status}
          collapsed={sections.section_7.collapsed}
          onToggle={sections.section_7.onToggle}
          sectionRef={sections.section_7.sectionRef}
          onFocusCapture={sections.section_7.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.section_7.isDocumentEditable}>
              <EvaluacionNarrativeSection
                fieldName={sections.section_7.fieldName}
                label={sections.section_7.label}
                value={sections.section_7.value}
                register={sections.section_7.register}
                errors={sections.section_7.errors}
                getValues={sections.section_7.getValues}
                setValue={sections.section_7.setValue}
                placeholder={sections.section_7.placeholder}
                required={sections.section_7.required}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="section_8"
          title="8. Asistentes"
          description="Mantiene el modo Profesional RECA + Asesor Agencia, con asistentes intermedios agregados manualmente."
          status={sections.section_8.status}
          collapsed={sections.section_8.collapsed}
          onToggle={sections.section_8.onToggle}
          sectionRef={sections.section_8.sectionRef}
          onFocusCapture={sections.section_8.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.section_8.isDocumentEditable}>
              <AsistentesSection
                control={sections.section_8.control}
                register={sections.section_8.register}
                setValue={sections.section_8.setValue}
                errors={sections.section_8.errors}
                profesionales={sections.section_8.profesionales}
                mode="reca_plus_agency_advisor"
                profesionalAsignado={sections.section_8.profesionalAsignado}
                minMeaningfulAttendees={
                  sections.section_8.minMeaningfulAttendees
                }
                summaryText={sections.section_8.summaryText}
                helperText={sections.section_8.helperText}
                isAgencyAdvisorRowRequired={
                  sections.section_8.isAgencyAdvisorRowRequired
                }
                intermediateCargoPlaceholder="Cargo del asistente"
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>
      </LongFormShell>

      <FormSubmitConfirmDialog {...submitDialog} />
      <FormSubmitConfirmDialog {...failedVisitDialog} />
    </>
  );
}
