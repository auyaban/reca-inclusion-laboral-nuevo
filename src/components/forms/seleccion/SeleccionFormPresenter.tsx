"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import type {
  Control,
  FieldErrors,
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
import { SeleccionCompanySection } from "@/components/forms/seleccion/SeleccionCompanySection";
import { SeleccionNarrativeSection } from "@/components/forms/seleccion/SeleccionNarrativeSection";
import { SeleccionOferentesSection } from "@/components/forms/seleccion/SeleccionOferentesSection";
import { SeleccionRecommendationsSection } from "@/components/forms/seleccion/SeleccionRecommendationsSection";
import type { Profesional } from "@/hooks/useProfesionalesCatalog";
import type { Empresa } from "@/lib/store/empresaStore";
import type { SeleccionValues } from "@/lib/validations/seleccion";

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
  register: UseFormRegister<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
  onSelectEmpresa: (empresa: Empresa) => void;
  disabled?: boolean;
};

type NarrativeSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  value: string;
  register: UseFormRegister<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
  getValues: UseFormGetValues<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
};

type OferentesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<SeleccionValues>;
  register: UseFormRegister<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
};

type RecommendationsSectionProps = NarrativeSectionProps & {
  notaValue: string;
  oferentes: SeleccionValues["oferentes"];
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<SeleccionValues>;
  register: UseFormRegister<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
};

export type SeleccionFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  sections: {
    company: CompanySectionProps;
    activity: NarrativeSectionProps;
    oferentes: OferentesSectionProps;
    recommendations: RecommendationsSectionProps;
    attendees: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

export function SeleccionFormPresenter({
  shell,
  draftStatus,
  notice,
  sections,
  submitDialog,
}: SeleccionFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa"
          description="Confirma la empresa y revisa el snapshot operativo antes de diligenciar la seleccion."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          <SeleccionCompanySection
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

        <LongFormSectionCard
          id="activity"
          title="Desarrollo de la actividad"
          description="Narrativa unica del proceso de seleccion. No se repite por card."
          status={sections.activity.status}
          collapsed={sections.activity.collapsed}
          onToggle={sections.activity.onToggle}
          sectionRef={sections.activity.sectionRef}
          onFocusCapture={sections.activity.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.activity.isDocumentEditable}>
              <SeleccionNarrativeSection
                fieldName="desarrollo_actividad"
                label="Desarrollo de la actividad"
                required
                placeholder="Describe el contexto general del proceso de seleccion, la metodologia y los acuerdos principales."
                value={sections.activity.value}
                register={sections.activity.register}
                errors={sections.activity.errors}
                getValues={sections.activity.getValues}
                setValue={sections.activity.setValue}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="oferentes"
          title="Oferentes"
          description="Gestiona uno o varios oferentes usando cards colapsables con el mismo contrato de datos del formato legado."
          status={sections.oferentes.status}
          collapsed={sections.oferentes.collapsed}
          onToggle={sections.oferentes.onToggle}
          sectionRef={sections.oferentes.sectionRef}
          onFocusCapture={sections.oferentes.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.oferentes.isDocumentEditable}>
              <SeleccionOferentesSection
                control={sections.oferentes.control}
                register={sections.oferentes.register}
                setValue={sections.oferentes.setValue}
                errors={sections.oferentes.errors}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="recommendations"
          title="Ajustes y recomendaciones"
          description="Cierre del proceso con recomendaciones, nota opcional y ayudas de texto sugerido."
          status={sections.recommendations.status}
          collapsed={sections.recommendations.collapsed}
          onToggle={sections.recommendations.onToggle}
          sectionRef={sections.recommendations.sectionRef}
          onFocusCapture={sections.recommendations.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.recommendations.isDocumentEditable}>
              <SeleccionRecommendationsSection
                ajustesValue={sections.recommendations.value}
                notaValue={sections.recommendations.notaValue}
                oferentes={sections.recommendations.oferentes}
                register={sections.recommendations.register}
                errors={sections.recommendations.errors}
                getValues={sections.recommendations.getValues}
                setValue={sections.recommendations.setValue}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="attendees"
          title="Asistentes"
          description="Participantes del proceso. La primera fila queda reservada para el profesional RECA."
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
                helperText="Fila 0 profesional RECA. Agrega asistentes adicionales solo cuando correspondan."
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
