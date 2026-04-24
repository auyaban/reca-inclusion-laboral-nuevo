import {
  countMeaningfulInterpreteLscAsistentes,
  countMeaningfulInterpreteLscInterpretes,
  countMeaningfulInterpreteLscOferentes,
} from "@/lib/interpreteLsc";
import type { LongFormSectionNavItem } from "@/components/forms/shared/LongFormSectionNav";
import type { LongFormSectionStatus } from "@/components/forms/shared/LongFormSectionCard";
import {
  INTERPRETE_LSC_MIN_SIGNIFICANT_ATTENDEES,
  type InterpreteLscValues,
} from "@/lib/validations/interpreteLsc";

export type InterpreteLscSectionId =
  | "company"
  | "participants"
  | "interpreters"
  | "attendees";

export const INTERPRETE_LSC_SECTION_LABELS: Record<
  InterpreteLscSectionId,
  string
> = {
  company: "Empresa y servicio",
  participants: "Oferentes / vinculados",
  interpreters: "Interpretes y horas",
  attendees: "Asistentes",
};

export const INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS: Record<
  InterpreteLscSectionId,
  boolean
> = {
  company: false,
  participants: false,
  interpreters: false,
  attendees: false,
};

const INTERPRETE_LSC_SECTION_ORDER: readonly InterpreteLscSectionId[] = [
  "company",
  "participants",
  "interpreters",
  "attendees",
];

export type InterpreteLscSectionCompletionFlags = Record<
  InterpreteLscSectionId,
  boolean
>;

function isCompleteOferente(row: InterpreteLscValues["oferentes"][number]) {
  return Boolean(
    row.nombre_oferente.trim() && row.cedula.trim() && row.proceso.trim()
  );
}

function isCompleteInterprete(row: InterpreteLscValues["interpretes"][number]) {
  return Boolean(
    row.nombre.trim() &&
      row.hora_inicial.trim() &&
      row.hora_final.trim() &&
      row.total_tiempo.trim()
  );
}

function isCompleteAsistente(row: InterpreteLscValues["asistentes"][number]) {
  return Boolean(row.nombre.trim() && row.cargo.trim());
}

export function isInterpreteLscCompanyFieldsComplete(values: {
  fechaVisita?: string;
  modalidadInterprete?: string;
  modalidadProfesionalReca?: string;
  nitEmpresa?: string;
}) {
  return Boolean(
    values.fechaVisita?.trim() &&
      values.modalidadInterprete?.trim() &&
      values.modalidadProfesionalReca?.trim() &&
      values.nitEmpresa?.trim()
  );
}

export function isInterpreteLscParticipantsRowsComplete(
  oferentes: InterpreteLscValues["oferentes"]
) {
  const meaningfulRows = oferentes.filter(
    (row) => row.nombre_oferente.trim() || row.cedula.trim() || row.proceso.trim()
  );

  return meaningfulRows.length > 0 && meaningfulRows.every(isCompleteOferente);
}

export function isInterpreteLscInterpretersRowsComplete(
  interpretes: InterpreteLscValues["interpretes"]
) {
  const meaningfulRows = interpretes.filter(
    (row) =>
      row.nombre.trim() ||
      row.hora_inicial.trim() ||
      row.hora_final.trim() ||
      row.total_tiempo.trim()
  );

  return meaningfulRows.length > 0 && meaningfulRows.every(isCompleteInterprete);
}

export function isInterpreteLscAttendeesRowsComplete(
  asistentes: InterpreteLscValues["asistentes"]
) {
  const meaningfulRows = asistentes.filter(
    (row) => row.nombre.trim() || row.cargo.trim()
  );

  return (
    countMeaningfulInterpreteLscAsistentes(asistentes) >=
      INTERPRETE_LSC_MIN_SIGNIFICANT_ATTENDEES &&
    meaningfulRows.every(isCompleteAsistente)
  );
}

export function isInterpreteLscCompanySectionComplete(
  values: InterpreteLscValues
) {
  return isInterpreteLscCompanyFieldsComplete({
    fechaVisita: values.fecha_visita,
    modalidadInterprete: values.modalidad_interprete,
    modalidadProfesionalReca: values.modalidad_profesional_reca,
    nitEmpresa: values.nit_empresa,
  });
}

export function isInterpreteLscParticipantsSectionComplete(
  values: InterpreteLscValues
) {
  return isInterpreteLscParticipantsRowsComplete(values.oferentes);
}

export function isInterpreteLscInterpretersSectionComplete(
  values: InterpreteLscValues
) {
  return isInterpreteLscInterpretersRowsComplete(values.interpretes);
}

export function isInterpreteLscAttendeesSectionComplete(
  values: InterpreteLscValues
) {
  return isInterpreteLscAttendeesRowsComplete(values.asistentes);
}

export function getInterpreteLscSectionCompletion(values: InterpreteLscValues) {
  return {
    company: isInterpreteLscCompanySectionComplete(values),
    participants:
      countMeaningfulInterpreteLscOferentes(values.oferentes) > 0 &&
      isInterpreteLscParticipantsSectionComplete(values),
    interpreters:
      countMeaningfulInterpreteLscInterpretes(values.interpretes) > 0 &&
      isInterpreteLscInterpretersSectionComplete(values),
    attendees: isInterpreteLscAttendeesSectionComplete(values),
  };
}

export function buildInterpreteLscSectionStatuses(options: {
  activeSectionId: InterpreteLscSectionId;
  hasEmpresa: boolean;
  completion: InterpreteLscSectionCompletionFlags;
  errorSectionId?: InterpreteLscSectionId | null;
}) {
  const { activeSectionId, hasEmpresa, completion, errorSectionId = null } =
    options;

  function getStatus(
    id: InterpreteLscSectionId,
    state?: { completed?: boolean; disabled?: boolean }
  ): LongFormSectionStatus {
    if (activeSectionId === id) return "active";
    if (state?.disabled) return "disabled";
    if (errorSectionId === id) return "error";
    if (state?.completed) return "completed";
    return "idle";
  }

  return {
    company: getStatus("company", {
      completed: hasEmpresa && completion.company,
    }),
    participants: getStatus("participants", {
      completed: hasEmpresa && completion.participants,
      disabled: !hasEmpresa,
    }),
    interpreters: getStatus("interpreters", {
      completed: hasEmpresa && completion.interpreters,
      disabled: !hasEmpresa,
    }),
    attendees: getStatus("attendees", {
      completed: hasEmpresa && completion.attendees,
      disabled: !hasEmpresa,
    }),
  } satisfies Record<InterpreteLscSectionId, LongFormSectionStatus>;
}

export function buildInterpreteLscSectionNavItems(
  sectionStatuses: Record<InterpreteLscSectionId, LongFormSectionStatus>
) {
  return [
    {
      id: "company",
      label: INTERPRETE_LSC_SECTION_LABELS.company,
      shortLabel: "Empresa",
      status: sectionStatuses.company,
    },
    {
      id: "participants",
      label: INTERPRETE_LSC_SECTION_LABELS.participants,
      shortLabel: "Oferentes",
      status: sectionStatuses.participants,
    },
    {
      id: "interpreters",
      label: INTERPRETE_LSC_SECTION_LABELS.interpreters,
      shortLabel: "Interpretes",
      status: sectionStatuses.interpreters,
    },
    {
      id: "attendees",
      label: INTERPRETE_LSC_SECTION_LABELS.attendees,
      shortLabel: "Asistentes",
      status: sectionStatuses.attendees,
    },
  ] satisfies LongFormSectionNavItem[];
}

export function getInterpreteLscSectionIdForStep(
  step: number
): InterpreteLscSectionId {
  if (step <= 0) {
    return "company";
  }

  if (step >= INTERPRETE_LSC_SECTION_ORDER.length - 1) {
    return "attendees";
  }

  return INTERPRETE_LSC_SECTION_ORDER[step] ?? "company";
}

export function getInterpreteLscCompatStepForSection(
  sectionId: InterpreteLscSectionId
) {
  const index = INTERPRETE_LSC_SECTION_ORDER.indexOf(sectionId);
  return index >= 0 ? index : 0;
}
