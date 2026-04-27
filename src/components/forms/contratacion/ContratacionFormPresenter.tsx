"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import type {
  Control,
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { ContratacionCompanySection } from "@/components/forms/contratacion/ContratacionCompanySection";
import { ContratacionNarrativeSection } from "@/components/forms/contratacion/ContratacionNarrativeSection";
import { ContratacionVinculadosSection } from "@/components/forms/contratacion/ContratacionVinculadosSection";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import { LongFormDisabledSectionState } from "@/components/forms/shared/LongFormDisabledSectionState";
import {
  LongFormSectionCard,
  type LongFormSectionStatus,
} from "@/components/forms/shared/LongFormSectionCard";
import { LongFormShell } from "@/components/forms/shared/LongFormShell";
import type { Profesional } from "@/hooks/useProfesionalesCatalog";
import type { Empresa } from "@/lib/store/empresaStore";
import type { ContratacionValues } from "@/lib/validations/contratacion";

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
  register: UseFormRegister<ContratacionValues>;
  errors: FieldErrors<ContratacionValues>;
  onSelectEmpresa: (empresa: Empresa) => void;
  disabled?: boolean;
};

type NarrativeSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  value: string;
  register: UseFormRegister<ContratacionValues>;
  errors: FieldErrors<ContratacionValues>;
  getValues: UseFormGetValues<ContratacionValues>;
  setValue: UseFormSetValue<ContratacionValues>;
};

type VinculadosSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<ContratacionValues>;
  register: UseFormRegister<ContratacionValues>;
  setValue: UseFormSetValue<ContratacionValues>;
  errors: FieldErrors<ContratacionValues>;
  failedVisitApplied?: boolean;
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<ContratacionValues>;
  register: UseFormRegister<ContratacionValues>;
  setValue: UseFormSetValue<ContratacionValues>;
  errors: FieldErrors<ContratacionValues>;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
};

export type ContratacionFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  sections: {
    company: CompanySectionProps;
    activity: NarrativeSectionProps;
    vinculados: VinculadosSectionProps;
    recommendations: NarrativeSectionProps;
    attendees: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
  failedVisitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

export function ContratacionFormPresenter({
  shell,
  draftStatus,
  notice,
  sections,
  submitDialog,
  failedVisitDialog,
}: ContratacionFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa"
          description="Confirma la empresa y revisa el snapshot operativo antes de diligenciar la contratación."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          <ContratacionCompanySection
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
          description="Narrativa única de la actividad realizada. No se duplica por cada vinculado."
          status={sections.activity.status}
          collapsed={sections.activity.collapsed}
          onToggle={sections.activity.onToggle}
          sectionRef={sections.activity.sectionRef}
          onFocusCapture={sections.activity.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.activity.isDocumentEditable}>
              <ContratacionNarrativeSection
                fieldName="desarrollo_actividad"
                label="Desarrollo de la actividad"
                required
                placeholder="Describe el contexto general de la contratación, los acuerdos y el acompañamiento realizado."
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
          id="vinculados"
          title="Vinculados"
          description="Gestiona una o varias personas vinculadas sin duplicar el bloque narrativo de la actividad."
          status={sections.vinculados.status}
          collapsed={sections.vinculados.collapsed}
          onToggle={sections.vinculados.onToggle}
          sectionRef={sections.vinculados.sectionRef}
          onFocusCapture={sections.vinculados.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.vinculados.isDocumentEditable}>
              <ContratacionVinculadosSection
                control={sections.vinculados.control}
                register={sections.vinculados.register}
                setValue={sections.vinculados.setValue}
                errors={sections.vinculados.errors}
                failedVisitApplied={sections.vinculados.failedVisitApplied}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="recommendations"
          title="Ajustes y recomendaciones"
          description="Cierre único con los ajustes razonables y recomendaciones del proceso."
          status={sections.recommendations.status}
          collapsed={sections.recommendations.collapsed}
          onToggle={sections.recommendations.onToggle}
          sectionRef={sections.recommendations.sectionRef}
          onFocusCapture={sections.recommendations.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.recommendations.isDocumentEditable}>
              <ContratacionNarrativeSection
                fieldName="ajustes_recomendaciones"
                label="Ajustes y recomendaciones"
                required
                placeholder="Consolida recomendaciones, compromisos y ajustes razonables acordados con la empresa."
                value={sections.recommendations.value}
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
                summaryText="Mínimo 1 persona - máximo 10"
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
      <FormSubmitConfirmDialog {...failedVisitDialog} />
    </>
  );
}
