"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import type {
  Control,
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { CondicionesVacanteCompanySection } from "@/components/forms/condicionesVacante/CondicionesVacanteCompanySection";
import { CondicionesVacanteDisabilitiesSection } from "@/components/forms/condicionesVacante/CondicionesVacanteDisabilitiesSection";
import {
  CondicionesVacanteCapabilitiesSection,
  CondicionesVacanteEducationSection,
  CondicionesVacantePosturesSection,
  CondicionesVacanteRecommendationsSection,
  CondicionesVacanteRisksSection,
  CondicionesVacanteVacancySection,
} from "@/components/forms/condicionesVacante/CondicionesVacanteMainSections";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import { LongFormDisabledSectionState } from "@/components/forms/shared/LongFormDisabledSectionState";
import {
  LongFormSectionCard,
  type LongFormSectionStatus,
} from "@/components/forms/shared/LongFormSectionCard";
import { LongFormShell } from "@/components/forms/shared/LongFormShell";
import type { CondicionesVacanteCatalogsStatus } from "@/hooks/useCondicionesVacanteCatalogs";
import type { Profesional } from "@/hooks/useProfesionalesCatalog";
import type { CondicionesVacanteCatalogs } from "@/lib/condicionesVacante";
import type { Empresa } from "@/lib/store/empresaStore";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";

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
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  onSelectEmpresa: (empresa: Empresa) => void;
  disabled?: boolean;
};

type VacancySectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  competencias: CondicionesVacanteValues["competencias"];
};

type EducationSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  values: CondicionesVacanteValues;
  getValues: UseFormGetValues<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
};

type CapabilitiesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  values: CondicionesVacanteValues;
  getValues: UseFormGetValues<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
};

type PosturesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
};

type RisksSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  values: CondicionesVacanteValues;
  getValues: UseFormGetValues<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
};

type DisabilitiesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
  catalogs?: CondicionesVacanteCatalogs;
  catalogError?: string | null;
  catalogStatus: CondicionesVacanteCatalogsStatus;
  onRetryCatalog?: () => Promise<CondicionesVacanteCatalogs | null>;
};

type RecommendationsSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  recommendations: string;
  getValues: UseFormGetValues<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<CondicionesVacanteValues>;
  register: UseFormRegister<CondicionesVacanteValues>;
  setValue: UseFormSetValue<CondicionesVacanteValues>;
  errors: FieldErrors<CondicionesVacanteValues>;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
  minMeaningfulAttendees?: number;
  helperText?: string;
  isAgencyAdvisorRowRequired?: boolean;
};

export type CondicionesVacanteFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  sections: {
    company: CompanySectionProps;
    vacancy: VacancySectionProps;
    education: EducationSectionProps;
    capabilities: CapabilitiesSectionProps;
    postures: PosturesSectionProps;
    risks: RisksSectionProps;
    disabilities: DisabilitiesSectionProps;
    recommendations: RecommendationsSectionProps;
    attendees: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
  failedVisitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

export function CondicionesVacanteFormPresenter({
  shell,
  draftStatus,
  notice,
  sections,
  submitDialog,
  failedVisitDialog,
}: CondicionesVacanteFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa"
          description="Confirma la empresa, revisa el snapshot operativo y ajusta los datos base del acta."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          <CondicionesVacanteCompanySection
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
          id="vacancy"
          title="Características de la vacante"
          description="Define el perfil base del cargo y revisa las competencias derivadas."
          status={sections.vacancy.status}
          collapsed={sections.vacancy.collapsed}
          onToggle={sections.vacancy.onToggle}
          sectionRef={sections.vacancy.sectionRef}
          onFocusCapture={sections.vacancy.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.vacancy.isDocumentEditable}>
              <CondicionesVacanteVacancySection
                register={sections.vacancy.register}
                errors={sections.vacancy.errors}
                competencias={sections.vacancy.competencias}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="education"
          title="Formación, horarios y experiencia"
          description="Agrupa requisitos académicos, horarios, experiencia y herramientas del cargo."
          status={sections.education.status}
          collapsed={sections.education.collapsed}
          onToggle={sections.education.onToggle}
          sectionRef={sections.education.sectionRef}
          onFocusCapture={sections.education.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.education.isDocumentEditable}>
              <CondicionesVacanteEducationSection
                register={sections.education.register}
                errors={sections.education.errors}
                values={sections.education.values}
                getValues={sections.education.getValues}
                setValue={sections.education.setValue}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="capabilities"
          title="Habilidades y capacidades"
          description="Evalúa capacidades cognitivas, motrices y transversales requeridas para el cargo."
          status={sections.capabilities.status}
          collapsed={sections.capabilities.collapsed}
          onToggle={sections.capabilities.onToggle}
          sectionRef={sections.capabilities.sectionRef}
          onFocusCapture={sections.capabilities.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.capabilities.isDocumentEditable}>
              <CondicionesVacanteCapabilitiesSection
                register={sections.capabilities.register}
                errors={sections.capabilities.errors}
                values={sections.capabilities.values}
                getValues={sections.capabilities.getValues}
                setValue={sections.capabilities.setValue}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="postures"
          title="Posturas y movimientos"
          description="Registra tiempos y frecuencias para cada postura o movimiento del rol."
          status={sections.postures.status}
          collapsed={sections.postures.collapsed}
          onToggle={sections.postures.onToggle}
          sectionRef={sections.postures.sectionRef}
          onFocusCapture={sections.postures.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.postures.isDocumentEditable}>
              <CondicionesVacantePosturesSection
                register={sections.postures.register}
                errors={sections.postures.errors}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="risks"
          title="Peligros y riesgos"
          description="Consolida los factores de riesgo del entorno laboral y sus observaciones."
          status={sections.risks.status}
          collapsed={sections.risks.collapsed}
          onToggle={sections.risks.onToggle}
          sectionRef={sections.risks.sectionRef}
          onFocusCapture={sections.risks.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.risks.isDocumentEditable}>
              <CondicionesVacanteRisksSection
                register={sections.risks.register}
                errors={sections.risks.errors}
                values={sections.risks.values}
                getValues={sections.risks.getValues}
                setValue={sections.risks.setValue}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="disabilities"
          title="Discapacidades compatibles"
          description="Gestiona las filas dinámicas de compatibilidad y ajustes razonables."
          status={sections.disabilities.status}
          collapsed={sections.disabilities.collapsed}
          onToggle={sections.disabilities.onToggle}
          sectionRef={sections.disabilities.sectionRef}
          onFocusCapture={sections.disabilities.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.disabilities.isDocumentEditable}>
              <CondicionesVacanteDisabilitiesSection
                control={sections.disabilities.control}
                errors={sections.disabilities.errors}
                setValue={sections.disabilities.setValue}
                catalogs={sections.disabilities.catalogs}
                catalogError={sections.disabilities.catalogError}
                catalogStatus={sections.disabilities.catalogStatus}
                onRetryCatalog={sections.disabilities.onRetryCatalog}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="recommendations"
          title="Observaciones y recomendaciones"
          description="Incluye el cierre narrativo del perfil y el template del proceso de vacante."
          status={sections.recommendations.status}
          collapsed={sections.recommendations.collapsed}
          onToggle={sections.recommendations.onToggle}
          sectionRef={sections.recommendations.sectionRef}
          onFocusCapture={sections.recommendations.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.recommendations.isDocumentEditable}>
              <CondicionesVacanteRecommendationsSection
                register={sections.recommendations.register}
                errors={sections.recommendations.errors}
                recommendations={sections.recommendations.recommendations}
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
          description="Mantiene el modo RECA + Asesor Agencia con fila intermedia libre."
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
                mode="reca_plus_agency_advisor"
                profesionalAsignado={sections.attendees.profesionalAsignado}
                minMeaningfulAttendees={
                  sections.attendees.minMeaningfulAttendees
                }
                isAgencyAdvisorRowRequired={
                  sections.attendees.isAgencyAdvisorRowRequired
                }
                helperText="Fila 0 profesional RECA, fila intermedia libre y última fila para Asesor Agencia."
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
