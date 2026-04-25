"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import type {
  Control,
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { PresentacionAgreementsSection } from "@/components/forms/presentacion/PresentacionAgreementsSection";
import { PresentacionEmpresaSection } from "@/components/forms/presentacion/PresentacionEmpresaSection";
import { PresentacionMotivacionSection } from "@/components/forms/presentacion/PresentacionMotivacionSection";
import { PresentacionVisitSection } from "@/components/forms/presentacion/PresentacionVisitSection";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { LongFormDisabledSectionState } from "@/components/forms/shared/LongFormDisabledSectionState";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import {
  LongFormSectionCard,
  type LongFormSectionStatus,
} from "@/components/forms/shared/LongFormSectionCard";
import { LongFormShell } from "@/components/forms/shared/LongFormShell";
import type { Profesional } from "@/hooks/useProfesionalesCatalog";
import type { Empresa } from "@/lib/store/empresaStore";
import type { PresentacionValues } from "@/lib/validations/presentacion";

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

type VisitSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<PresentacionValues>;
  errors: FieldErrors<PresentacionValues>;
};

type MotivationSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<PresentacionValues>;
  errors: FieldErrors<PresentacionValues>;
  motivacion: string[];
};

type AgreementsSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<PresentacionValues>;
  errors: FieldErrors<PresentacionValues>;
  acuerdos: string;
  getValues: UseFormGetValues<PresentacionValues>;
  setValue: UseFormSetValue<PresentacionValues>;
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<PresentacionValues>;
  register: UseFormRegister<PresentacionValues>;
  setValue: UseFormSetValue<PresentacionValues>;
  errors: FieldErrors<PresentacionValues>;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
  minMeaningfulAttendees?: number;
  summaryText?: string;
  helperText?: string;
  isAgencyAdvisorRowRequired?: boolean;
};

export type PresentacionFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  sections: {
    company: BaseSectionProps & {
      empresa: Empresa | null;
      onSelectEmpresa: (empresa: Empresa) => void;
    };
    visit: VisitSectionProps;
    motivation: MotivationSectionProps;
    agreements: AgreementsSectionProps;
    attendees: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
  failedVisitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

export function PresentacionFormPresenter({
  shell,
  draftStatus,
  notice,
  sections,
  submitDialog,
  failedVisitDialog,
}: PresentacionFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa"
          description="Busca y confirma la empresa sobre la que se diligencia esta acta."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          <PresentacionEmpresaSection
            empresa={sections.company.empresa}
            onSelectEmpresa={sections.company.onSelectEmpresa}
          />
        </LongFormSectionCard>

        <LongFormSectionCard
          id="visit"
          title="Datos de la visita"
          description="Información general de la visita, fecha y modalidad."
          status={sections.visit.status}
          collapsed={sections.visit.collapsed}
          onToggle={sections.visit.onToggle}
          sectionRef={sections.visit.sectionRef}
          onFocusCapture={sections.visit.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.visit.isDocumentEditable}>
              <PresentacionVisitSection
                register={sections.visit.register}
                errors={sections.visit.errors}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="motivation"
          title="Motivación"
          description="Razones por las que la empresa participa en el programa."
          status={sections.motivation.status}
          collapsed={sections.motivation.collapsed}
          onToggle={sections.motivation.onToggle}
          sectionRef={sections.motivation.sectionRef}
          onFocusCapture={sections.motivation.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.motivation.isDocumentEditable}>
              <PresentacionMotivacionSection
                register={sections.motivation.register}
                errors={sections.motivation.errors}
                motivacion={sections.motivation.motivacion}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="agreements"
          title="Acuerdos y observaciones"
          description="Registro narrativo de compromisos, observaciones y acuerdos."
          status={sections.agreements.status}
          collapsed={sections.agreements.collapsed}
          onToggle={sections.agreements.onToggle}
          sectionRef={sections.agreements.sectionRef}
          onFocusCapture={sections.agreements.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.agreements.isDocumentEditable}>
              <PresentacionAgreementsSection
                register={sections.agreements.register}
                errors={sections.agreements.errors}
                acuerdos={sections.agreements.acuerdos}
                getValues={sections.agreements.getValues}
                setValue={sections.agreements.setValue}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="attendees"
          title="Asistentes"
          description="Participantes de la visita y asesoría involucrada."
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
                minMeaningfulAttendees={sections.attendees.minMeaningfulAttendees}
                summaryText={sections.attendees.summaryText}
                helperText={sections.attendees.helperText}
                isAgencyAdvisorRowRequired={
                  sections.attendees.isAgencyAdvisorRowRequired
                }
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
