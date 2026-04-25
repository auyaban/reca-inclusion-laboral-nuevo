"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import type {
  Control,
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { SensibilizacionCompanySection } from "@/components/forms/sensibilizacion/SensibilizacionCompanySection";
import { SensibilizacionObservationsSection } from "@/components/forms/sensibilizacion/SensibilizacionObservationsSection";
import { SensibilizacionVisitSection } from "@/components/forms/sensibilizacion/SensibilizacionVisitSection";
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
import type { SensibilizacionValues } from "@/lib/validations/sensibilizacion";

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
  register: UseFormRegister<SensibilizacionValues>;
  errors: FieldErrors<SensibilizacionValues>;
};

type ObservationsSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  register: UseFormRegister<SensibilizacionValues>;
  errors: FieldErrors<SensibilizacionValues>;
  observaciones: string;
  getValues: UseFormGetValues<SensibilizacionValues>;
  setValue: UseFormSetValue<SensibilizacionValues>;
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<SensibilizacionValues>;
  register: UseFormRegister<SensibilizacionValues>;
  setValue: UseFormSetValue<SensibilizacionValues>;
  errors: FieldErrors<SensibilizacionValues>;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
  minMeaningfulAttendees?: number;
  summaryText?: string;
  helperText?: string;
  isAgencyAdvisorRowRequired?: boolean;
};

export type SensibilizacionFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  sections: {
    company: BaseSectionProps & {
      empresa: Empresa | null;
      fechaVisita?: string;
      modalidad?: string;
      nitEmpresa?: string;
      onSelectEmpresa: (empresa: Empresa) => void;
    };
    visit: VisitSectionProps;
    observations: ObservationsSectionProps;
    attendees: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
  failedVisitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

export function SensibilizacionFormPresenter({
  shell,
  draftStatus,
  notice,
  sections,
  submitDialog,
  failedVisitDialog,
}: SensibilizacionFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa"
          description="Busca y confirma la empresa. Este bloque resume la seccion inicial que se enviara al acta."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          <SensibilizacionCompanySection
            empresa={sections.company.empresa}
            fechaVisita={sections.company.fechaVisita}
            modalidad={sections.company.modalidad}
            nitEmpresa={sections.company.nitEmpresa}
            onSelectEmpresa={sections.company.onSelectEmpresa}
          />
        </LongFormSectionCard>

        <LongFormSectionCard
          id="visit"
          title="Datos de la visita"
          description="Información base de la jornada realizada con la empresa."
          status={sections.visit.status}
          collapsed={sections.visit.collapsed}
          onToggle={sections.visit.onToggle}
          sectionRef={sections.visit.sectionRef}
          onFocusCapture={sections.visit.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.visit.isDocumentEditable}>
              <SensibilizacionVisitSection
                register={sections.visit.register}
                errors={sections.visit.errors}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="observations"
          title="Observaciones"
          description="Registro narrativo de la jornada, acuerdos y hallazgos."
          status={sections.observations.status}
          collapsed={sections.observations.collapsed}
          onToggle={sections.observations.onToggle}
          sectionRef={sections.observations.sectionRef}
          onFocusCapture={sections.observations.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.observations.isDocumentEditable}>
              <SensibilizacionObservationsSection
                register={sections.observations.register}
                errors={sections.observations.errors}
                observaciones={sections.observations.observaciones}
                getValues={sections.observations.getValues}
                setValue={sections.observations.setValue}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="attendees"
          title="Asistentes"
          description="Participantes de la jornada."
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
                minMeaningfulAttendees={sections.attendees.minMeaningfulAttendees}
                summaryText={sections.attendees.summaryText}
                helperText={sections.attendees.helperText}
                isAgencyAdvisorRowRequired={
                  sections.attendees.isAgencyAdvisorRowRequired
                }
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
