import {
  getDefaultAsistentesForMode,
  normalizePersistedAsistentesForMode,
  type Asistente,
} from "@/lib/asistentes";
import {
  getDefaultFailedVisitAuditFields,
  normalizeFailedVisitAuditValue,
} from "@/lib/failedVisitContract";
import { normalizeModalidad, type ModalidadValue } from "@/lib/modalidad";
import type { Empresa } from "@/lib/store/empresaStore";

export const INDUCCION_LINKED_PERSON_FIELD_LABELS = {
  numero: "No.",
  nombre_oferente: "Nombre del vinculado",
  cedula: "Cedula",
  telefono_oferente: "Telefono del vinculado",
  cargo_oferente: "Cargo del vinculado",
} as const;

export type InduccionLinkedPersonFieldId =
  keyof typeof INDUCCION_LINKED_PERSON_FIELD_LABELS;

export type InduccionLinkedPerson = {
  numero: "1";
  nombre_oferente: string;
  cedula: string;
  telefono_oferente: string;
  cargo_oferente: string;
};

export type InduccionBaseValues = {
  failed_visit_applied_at: string | null;
  fecha_visita: string;
  modalidad: ModalidadValue;
  nit_empresa: string;
  vinculado: InduccionLinkedPerson;
  asistentes: Asistente[];
};

export type InduccionParticipant = {
  nombre: string;
  cedula: string;
  cargo: string;
};

const EMPTY_LINKED_PERSON: InduccionLinkedPerson = {
  numero: "1",
  nombre_oferente: "",
  cedula: "",
  telefono_oferente: "",
  cargo_oferente: "",
};

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function hasMeaningfulInduccionLinkedPerson(
  linkedPerson: InduccionLinkedPerson
) {
  return [
    linkedPerson.nombre_oferente,
    linkedPerson.cedula,
    linkedPerson.telefono_oferente,
    linkedPerson.cargo_oferente,
  ].some((value) => value.trim().length > 0);
}

export function createEmptyInduccionLinkedPerson(): InduccionLinkedPerson {
  return { ...EMPTY_LINKED_PERSON };
}

export function normalizeInduccionLinkedPerson(
  value: unknown
): InduccionLinkedPerson {
  const candidate =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    numero: "1",
    nombre_oferente: normalizeTextValue(candidate.nombre_oferente),
    cedula: normalizeTextValue(candidate.cedula),
    telefono_oferente: normalizeTextValue(candidate.telefono_oferente),
    cargo_oferente: normalizeTextValue(candidate.cargo_oferente),
  };
}

export function getDefaultInduccionBaseValues(
  empresa?: Empresa | null
): InduccionBaseValues {
  return {
    ...getDefaultFailedVisitAuditFields(),
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    vinculado: createEmptyInduccionLinkedPerson(),
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function normalizeInduccionBaseValues(
  values: Partial<InduccionBaseValues> | Record<string, unknown>,
  empresa?: Empresa | null
): InduccionBaseValues {
  const defaults = getDefaultInduccionBaseValues(empresa);
  const source = values as Partial<InduccionBaseValues>;

  return {
    failed_visit_applied_at: normalizeFailedVisitAuditValue(
      source.failed_visit_applied_at
    ),
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita
        : defaults.fecha_visita,
    modalidad: normalizeModalidad(source.modalidad, defaults.modalidad),
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa
        : defaults.nit_empresa,
    vinculado: normalizeInduccionLinkedPerson(source.vinculado),
    asistentes: normalizePersistedAsistentesForMode(source.asistentes, {
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function buildInduccionSection2Snapshot(
  linkedPerson: InduccionLinkedPerson
) {
  if (!hasMeaningfulInduccionLinkedPerson(linkedPerson)) {
    return [] as InduccionLinkedPerson[];
  }

  return [normalizeInduccionLinkedPerson(linkedPerson)];
}

export function buildInduccionParticipantes(
  linkedPerson: InduccionLinkedPerson
): InduccionParticipant[] {
  const normalizedLinkedPerson = normalizeInduccionLinkedPerson(linkedPerson);
  if (!hasMeaningfulInduccionLinkedPerson(normalizedLinkedPerson)) {
    return [];
  }

  return [
    {
      nombre: normalizedLinkedPerson.nombre_oferente,
      cedula: normalizedLinkedPerson.cedula,
      cargo: normalizedLinkedPerson.cargo_oferente,
    },
  ];
}

export function getInduccionCargoObjetivo(linkedPerson: InduccionLinkedPerson) {
  const normalizedLinkedPerson = normalizeInduccionLinkedPerson(linkedPerson);
  return normalizedLinkedPerson.cargo_oferente;
}
