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
import type { Empresa } from "@/lib/store/empresaStore";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";
import type { Profesional } from "@/hooks/useProfesionalesCatalog";
import type { InterpreteCatalogItem } from "@/hooks/useInterpretesCatalog";
import { InterpreteLscCompanySection } from "./InterpreteLscCompanySection";
import { InterpreteLscInterpretesSection } from "./InterpreteLscInterpretesSection";
import { InterpreteLscOferentesSection } from "./InterpreteLscOferentesSection";

type ShellProps = Omit<
  ComponentProps<typeof LongFormShell>,
  "children" | "draftStatus" | "notice"
>;

type ServiceSummaryProps = {
  oferentesCount: number;
  interpretesCount: number;
  asistentesCount: number;
  sumatoriaHoras: string;
  sabanaLabel: string;
};

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
  modalidadInterprete?: string;
  modalidadProfesionalReca?: string;
  nitEmpresa?: string;
  register: UseFormRegister<InterpreteLscValues>;
  errors: FieldErrors<InterpreteLscValues>;
  onSelectEmpresa: (empresa: Empresa) => void;
  disabled?: boolean;
};

type ParticipantsSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<InterpreteLscValues>;
  register: UseFormRegister<InterpreteLscValues>;
  setValue: UseFormSetValue<InterpreteLscValues>;
  errors: FieldErrors<InterpreteLscValues>;
};

type InterpretersSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<InterpreteLscValues>;
  getValues: UseFormGetValues<InterpreteLscValues>;
  register: UseFormRegister<InterpreteLscValues>;
  setValue: UseFormSetValue<InterpreteLscValues>;
  errors: FieldErrors<InterpreteLscValues>;
  interpretesCatalog: InterpreteCatalogItem[];
  interpretesCatalogError?: string | null;
  creatingInterpreteName?: string | null;
  onCreateInterprete: (nombre: string) => Promise<InterpreteCatalogItem>;
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: Control<InterpreteLscValues>;
  register: UseFormRegister<InterpreteLscValues>;
  setValue: UseFormSetValue<InterpreteLscValues>;
  errors: FieldErrors<InterpreteLscValues>;
  profesionales: Profesional[];
  profesionalAsignado?: string | null;
};

export type InterpreteLscFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  serviceSummary?: ServiceSummaryProps | null;
  sections: {
    company: CompanySectionProps;
    participants: ParticipantsSectionProps;
    interpreters: InterpretersSectionProps;
    attendees: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

function SummaryMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{helper}</p>
    </div>
  );
}

export function InterpreteLscFormPresenter({
  shell,
  draftStatus,
  notice,
  serviceSummary,
  sections,
  submitDialog,
}: InterpreteLscFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa y servicio"
          description="Confirma la empresa y diligencia la fecha y modalidades del servicio de interpretacion."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          <InterpreteLscCompanySection
            empresa={sections.company.empresa}
            fechaVisita={sections.company.fechaVisita}
            modalidadInterprete={sections.company.modalidadInterprete}
            modalidadProfesionalReca={sections.company.modalidadProfesionalReca}
            nitEmpresa={sections.company.nitEmpresa}
            register={sections.company.register}
            errors={sections.company.errors}
            onSelectEmpresa={sections.company.onSelectEmpresa}
            disabled={sections.company.disabled}
          />
        </LongFormSectionCard>

        {hasEmpresa && serviceSummary ? (
          <section className="rounded-2xl border border-gray-200 bg-reca-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Resumen del servicio
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  Este panel resume solo los registros significativos listos
                  para publicar.
                </p>
              </div>
              <p className="text-xs font-medium text-reca-dark">
                Sabana: {serviceSummary.sabanaLabel}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <SummaryMetricCard
                label="Oferentes"
                value={String(serviceSummary.oferentesCount)}
                helper="Participantes con datos"
              />
              <SummaryMetricCard
                label="Interpretes"
                value={String(serviceSummary.interpretesCount)}
                helper="Filas activas del equipo"
              />
              <SummaryMetricCard
                label="Horas"
                value={serviceSummary.sumatoriaHoras}
                helper="Incluye Sabana cuando aplica"
              />
              <SummaryMetricCard
                label="Asistentes"
                value={String(serviceSummary.asistentesCount)}
                helper="Asistentes listos para el acta"
              />
            </div>
          </section>
        ) : null}

        <LongFormSectionCard
          id="participants"
          title="Oferentes / vinculados"
          description="Registra las personas atendidas por el servicio."
          status={sections.participants.status}
          collapsed={sections.participants.collapsed}
          onToggle={sections.participants.onToggle}
          sectionRef={sections.participants.sectionRef}
          onFocusCapture={sections.participants.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.participants.isDocumentEditable}>
              <InterpreteLscOferentesSection
                control={sections.participants.control}
                register={sections.participants.register}
                setValue={sections.participants.setValue}
                errors={sections.participants.errors}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState message="Selecciona la empresa para habilitar el bloque de oferentes o vinculados." />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="interpreters"
          title="Interpretes y horas"
          description="Administra el equipo de interpretes, Sabana y la sumatoria total de horas."
          status={sections.interpreters.status}
          collapsed={sections.interpreters.collapsed}
          onToggle={sections.interpreters.onToggle}
          sectionRef={sections.interpreters.sectionRef}
          onFocusCapture={sections.interpreters.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset disabled={!sections.interpreters.isDocumentEditable}>
              <InterpreteLscInterpretesSection
                control={sections.interpreters.control}
                getValues={sections.interpreters.getValues}
                register={sections.interpreters.register}
                setValue={sections.interpreters.setValue}
                errors={sections.interpreters.errors}
                interpretesCatalog={sections.interpreters.interpretesCatalog}
                interpretesCatalogError={sections.interpreters.interpretesCatalogError}
                creatingName={sections.interpreters.creatingInterpreteName}
                onCreateInterprete={sections.interpreters.onCreateInterprete}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState message="Selecciona la empresa para registrar interpretes, horarios y Sabana." />
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
                helperText="Fila 0 profesional RECA. Agrega asistentes adicionales solo cuando correspondan."
                intermediateCargoPlaceholder="Cargo"
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState message="Selecciona la empresa para habilitar la asistencia del profesional RECA y los demas participantes." />
          )}
        </LongFormSectionCard>
      </LongFormShell>

      <FormSubmitConfirmDialog {...submitDialog} />
    </>
  );
}
