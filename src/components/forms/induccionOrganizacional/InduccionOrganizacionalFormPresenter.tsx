"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import type {
  FieldErrors,
  Path,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { InduccionCompanySection } from "@/components/forms/inducciones/InduccionCompanySection";
import { InduccionLinkedPersonSection } from "@/components/forms/inducciones/InduccionLinkedPersonSection";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";
import { LongFormDisabledSectionState } from "@/components/forms/shared/LongFormDisabledSectionState";
import {
  LongFormSectionCard,
  type LongFormSectionStatus,
} from "@/components/forms/shared/LongFormSectionCard";
import { LongFormShell } from "@/components/forms/shared/LongFormShell";
import {
  InduccionOrganizacionalDevelopmentSection,
  InduccionOrganizacionalObservacionesSection,
  InduccionOrganizacionalRecommendationsSection,
} from "@/components/forms/induccionOrganizacional/InduccionOrganizacionalSections";
import type { Empresa } from "@/lib/store/empresaStore";
import type { InduccionOrganizacionalValues } from "@/lib/validations/induccionOrganizacional";
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
  register: UseFormRegister<InduccionOrganizacionalValues>;
  setValue: UseFormSetValue<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
  vinculado: InduccionOrganizacionalValues["vinculado"];
  loadedSnapshot: UsuarioRecaRecord | null;
  onLoadedSnapshotChange: (snapshot: UsuarioRecaRecord | null) => void;
};

type DevelopmentSectionProps = BaseSectionProps & {
  register: UseFormRegister<InduccionOrganizacionalValues>;
  setValue: UseFormSetValue<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
};

type RecommendationsSectionProps = BaseSectionProps & {
  register: UseFormRegister<InduccionOrganizacionalValues>;
  setValue: UseFormSetValue<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
  section4: InduccionOrganizacionalValues["section_4"];
};

type ObservationsSectionProps = BaseSectionProps & {
  register: UseFormRegister<InduccionOrganizacionalValues>;
  getValues: UseFormGetValues<InduccionOrganizacionalValues>;
  setValue: UseFormSetValue<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
  value: string;
  required?: boolean;
};

type AttendeesSectionProps = BaseSectionProps & {
  isDocumentEditable: boolean;
  control: import("react-hook-form").Control<InduccionOrganizacionalValues>;
  register: UseFormRegister<InduccionOrganizacionalValues>;
  setValue: UseFormSetValue<InduccionOrganizacionalValues>;
  errors: FieldErrors<InduccionOrganizacionalValues>;
  profesionalAsignado?: string | null;
  profesionales: import("@/hooks/useProfesionalesCatalog").Profesional[];
  summaryText?: string;
};

export type InduccionOrganizacionalFormPresenterProps = {
  shell: ShellProps;
  draftStatus: ReactNode;
  notice: ReactNode;
  sections: {
    company: CompanySectionProps;
    vinculado: VinculadoSectionProps;
    development: DevelopmentSectionProps;
    recommendations: RecommendationsSectionProps;
    observations: ObservationsSectionProps;
    attendees: AttendeesSectionProps;
  };
  submitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
  failedVisitDialog: ComponentProps<typeof FormSubmitConfirmDialog>;
};

export function InduccionOrganizacionalFormPresenter({
  shell,
  draftStatus,
  notice,
  sections,
  submitDialog,
  failedVisitDialog,
}: InduccionOrganizacionalFormPresenterProps) {
  const hasEmpresa = Boolean(sections.company.empresa);

  return (
    <>
      <LongFormShell {...shell} draftStatus={draftStatus} notice={notice}>
        <LongFormSectionCard
          id="company"
          title="Empresa"
          description="Confirma la empresa y revisa el snapshot general antes de diligenciar la induccion."
          status={sections.company.status}
          collapsed={sections.company.collapsed}
          onToggle={sections.company.onToggle}
          sectionRef={sections.company.sectionRef}
          onFocusCapture={sections.company.onFocusCapture}
        >
          <InduccionCompanySection
            empresa={sections.company.empresa}
            fechaVisita={sections.company.fechaVisita}
            modalidad={sections.company.modalidad}
            nitEmpresa={sections.company.nitEmpresa}
            onSelectEmpresa={sections.company.onSelectEmpresa}
          />
        </LongFormSectionCard>

        <LongFormSectionCard
          id="vinculado"
          title="Vinculado"
          description="Solo se permite un vinculado. El lookup a usuarios RECA conserva el prefill y permite reemplazo manual."
          status={sections.vinculado.status}
          collapsed={sections.vinculado.collapsed}
          onToggle={sections.vinculado.onToggle}
          sectionRef={sections.vinculado.sectionRef}
          onFocusCapture={sections.vinculado.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset>
              <InduccionLinkedPersonSection<InduccionOrganizacionalValues>
                fieldNamePrefix={"vinculado" as Path<InduccionOrganizacionalValues>}
                linkedPerson={sections.vinculado.vinculado}
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
          id="desarrollo"
          title="Desarrollo de la induccion"
          description="Matriz de 38 items con buttons masivos por subseccion para el campo Visto."
          status={sections.development.status}
          collapsed={sections.development.collapsed}
          onToggle={sections.development.onToggle}
          sectionRef={sections.development.sectionRef}
          onFocusCapture={sections.development.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset>
              <InduccionOrganizacionalDevelopmentSection
                register={sections.development.register}
                setValue={sections.development.setValue}
                errors={sections.development.errors}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="recomendaciones"
          title="Ajustes razonables"
          description="Tres recomendaciones derivadas segun el medio. La recomendacion es readonly."
          status={sections.recommendations.status}
          collapsed={sections.recommendations.collapsed}
          onToggle={sections.recommendations.onToggle}
          sectionRef={sections.recommendations.sectionRef}
          onFocusCapture={sections.recommendations.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset>
              <InduccionOrganizacionalRecommendationsSection
                register={sections.recommendations.register}
                setValue={sections.recommendations.setValue}
                errors={sections.recommendations.errors}
                section4={sections.recommendations.section4}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="observaciones"
          title="Observaciones"
          description="Campo largo con dictado para registrar hallazgos, acuerdos y notas."
          status={sections.observations.status}
          collapsed={sections.observations.collapsed}
          onToggle={sections.observations.onToggle}
          sectionRef={sections.observations.sectionRef}
          onFocusCapture={sections.observations.onFocusCapture}
        >
          {hasEmpresa ? (
            <fieldset>
              <InduccionOrganizacionalObservacionesSection
                register={sections.observations.register}
                getValues={sections.observations.getValues}
                setValue={sections.observations.setValue}
                errors={sections.observations.errors}
                value={sections.observations.value}
                required={sections.observations.required}
              />
            </fieldset>
          ) : (
            <LongFormDisabledSectionState />
          )}
        </LongFormSectionCard>

        <LongFormSectionCard
          id="attendees"
          title="Asistentes"
          description="Usa el bloque generico de asistentes para todos los formularios largos."
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
                summaryText={sections.attendees.summaryText}
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
