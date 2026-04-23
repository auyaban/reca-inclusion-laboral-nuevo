import {
  countMeaningfulInterpreteLscAsistentes,
  countMeaningfulInterpreteLscInterpretes,
  countMeaningfulInterpreteLscOferentes,
} from "@/lib/interpreteLsc";
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

export function isInterpreteLscCompanySectionComplete(
  values: InterpreteLscValues
) {
  return Boolean(
    values.fecha_visita.trim() &&
      values.modalidad_interprete.trim() &&
      values.modalidad_profesional_reca.trim() &&
      values.nit_empresa.trim()
  );
}

export function isInterpreteLscParticipantsSectionComplete(
  values: InterpreteLscValues
) {
  const meaningfulRows = values.oferentes.filter(
    (row) => row.nombre_oferente.trim() || row.cedula.trim() || row.proceso.trim()
  );

  return meaningfulRows.length > 0 && meaningfulRows.every(isCompleteOferente);
}

export function isInterpreteLscInterpretersSectionComplete(
  values: InterpreteLscValues
) {
  const meaningfulRows = values.interpretes.filter(
    (row) =>
      row.nombre.trim() ||
      row.hora_inicial.trim() ||
      row.hora_final.trim() ||
      row.total_tiempo.trim()
  );

  return meaningfulRows.length > 0 && meaningfulRows.every(isCompleteInterprete);
}

export function isInterpreteLscAttendeesSectionComplete(
  values: InterpreteLscValues
) {
  const meaningfulRows = values.asistentes.filter(
    (row) => row.nombre.trim() || row.cargo.trim()
  );

  return (
    countMeaningfulInterpreteLscAsistentes(values.asistentes) >=
      INTERPRETE_LSC_MIN_SIGNIFICANT_ATTENDEES &&
    meaningfulRows.every(isCompleteAsistente)
  );
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
