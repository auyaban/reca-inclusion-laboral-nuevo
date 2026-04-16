import { createHash } from "crypto";
import { normalizeContratacionValues } from "@/lib/contratacion";
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import { normalizeModalidad } from "@/lib/modalidad";
import { normalizeSeleccionValues } from "@/lib/seleccion";
import {
  normalizePresentacionMotivacion,
  normalizePresentacionTipoVisita,
} from "@/lib/presentacion";
import { normalizePayloadAsistentes } from "@/lib/finalization/payloads";
import type { ContratacionValues } from "@/lib/validations/contratacion";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";
import type { SeleccionValues } from "@/lib/validations/seleccion";

export type FinalizationFormSlug =
  | "presentacion"
  | "sensibilizacion"
  | "seleccion"
  | "contratacion"
  | "condiciones-vacante";

export type FinalizationIdentity = {
  draft_id?: string | null;
  local_draft_session_id: string;
};

export type FinalizationSuccessResponse = {
  success: true;
  sheetLink: string;
  pdfLink?: string;
};

type CanonicalPresentacionPayload = {
  tipo_visita: string;
  fecha_visita: string;
  modalidad: string;
  nit_empresa: string;
  motivacion: string[];
  acuerdos_observaciones: string;
  asistentes: Array<{ nombre: string; cargo: string }>;
};

type CanonicalSensibilizacionPayload = {
  fecha_visita: string;
  modalidad: string;
  nit_empresa: string;
  observaciones: string;
  asistentes: Array<{ nombre: string; cargo: string }>;
};

type CanonicalContratacionPayload = ReturnType<
  typeof normalizeContratacionValues
> & {
  asistentes: Array<{ nombre: string; cargo: string }>;
  vinculados: Array<Record<string, string>>;
};

type CanonicalSeleccionPayload = ReturnType<typeof normalizeSeleccionValues> & {
  asistentes: Array<{ nombre: string; cargo: string }>;
  oferentes: Array<Record<string, string>>;
};

type CanonicalCondicionesVacantePayload = ReturnType<
  typeof normalizeCondicionesVacanteValues
> & {
  asistentes: Array<{ nombre: string; cargo: string }>;
  discapacidades: Array<{ discapacidad: string; descripcion: string }>;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function sortStrings(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right, "es-CO"));
}

function normalizeIdentity(identity: FinalizationIdentity) {
  const draftId = cleanText(identity.draft_id);

  return {
    local_draft_session_id: cleanText(identity.local_draft_session_id),
    ...(draftId ? { draft_id: draftId } : {}),
  };
}

function normalizeCanonicalPresentacionPayload(
  payload: Record<string, unknown>
): CanonicalPresentacionPayload {
  return {
    tipo_visita: normalizePresentacionTipoVisita(payload.tipo_visita),
    fecha_visita: cleanText(payload.fecha_visita),
    modalidad: normalizeModalidad(payload.modalidad, "Presencial"),
    nit_empresa: cleanText(payload.nit_empresa),
    motivacion: sortStrings(
      normalizePresentacionMotivacion(payload.motivacion).map((value) => cleanText(value))
    ),
    acuerdos_observaciones: cleanText(payload.acuerdos_observaciones),
    asistentes: normalizePayloadAsistentes(
      Array.isArray(payload.asistentes) ? payload.asistentes : []
    ),
  };
}

function normalizeCanonicalSensibilizacionPayload(
  payload: Record<string, unknown>
): CanonicalSensibilizacionPayload {
  return {
    fecha_visita: cleanText(payload.fecha_visita),
    modalidad: normalizeModalidad(payload.modalidad, "Presencial"),
    nit_empresa: cleanText(payload.nit_empresa),
    observaciones: cleanText(payload.observaciones),
    asistentes: normalizePayloadAsistentes(
      Array.isArray(payload.asistentes) ? payload.asistentes : []
    ),
  };
}

function normalizeCanonicalContratacionPayload(
  payload: Record<string, unknown>
): CanonicalContratacionPayload {
  return normalizeCanonicalContratacionPayloadFromNormalizedValues(
    normalizeContratacionValues(payload)
  );
}

function normalizeCanonicalSeleccionPayload(
  payload: Record<string, unknown>
): CanonicalSeleccionPayload {
  return normalizeCanonicalSeleccionPayloadFromNormalizedValues(
    normalizeSeleccionValues(payload)
  );
}

export function normalizeCanonicalContratacionPayloadFromNormalizedValues(
  normalizedPayload: ContratacionValues
): CanonicalContratacionPayload {
  return {
    ...normalizedPayload,
    modalidad: normalizeModalidad(normalizedPayload.modalidad, "Presencial"),
    nit_empresa: cleanText(normalizedPayload.nit_empresa),
    desarrollo_actividad: cleanText(normalizedPayload.desarrollo_actividad),
    ajustes_recomendaciones: cleanText(
      normalizedPayload.ajustes_recomendaciones
    ),
    asistentes: normalizePayloadAsistentes(normalizedPayload.asistentes),
    vinculados: normalizedPayload.vinculados.map((row) => {
      const nextRow = { ...row };

      for (const [key, value] of Object.entries(nextRow)) {
        nextRow[key as keyof typeof nextRow] = cleanText(value);
      }

      return nextRow;
    }),
  };
}

export function normalizeCanonicalSeleccionPayloadFromNormalizedValues(
  normalizedPayload: SeleccionValues
): CanonicalSeleccionPayload {
  return {
    ...normalizedPayload,
    modalidad: normalizeModalidad(normalizedPayload.modalidad, "Presencial"),
    nit_empresa: cleanText(normalizedPayload.nit_empresa),
    desarrollo_actividad: cleanText(normalizedPayload.desarrollo_actividad),
    ajustes_recomendaciones: cleanText(
      normalizedPayload.ajustes_recomendaciones
    ),
    nota: cleanText(normalizedPayload.nota),
    asistentes: normalizePayloadAsistentes(normalizedPayload.asistentes),
    oferentes: normalizedPayload.oferentes.map((row) => {
      const nextRow = { ...row };

      for (const [key, value] of Object.entries(nextRow)) {
        nextRow[key as keyof typeof nextRow] = cleanText(value);
      }

      return nextRow;
    }),
  };
}

function normalizeCanonicalCondicionesVacantePayload(
  payload: Record<string, unknown>
): CanonicalCondicionesVacantePayload {
  return normalizeCanonicalCondicionesVacantePayloadFromNormalizedValues(
    normalizeCondicionesVacanteValues(payload)
  );
}

export function normalizeCanonicalCondicionesVacantePayloadFromNormalizedValues(
  normalizedPayload: CondicionesVacanteValues
): CanonicalCondicionesVacantePayload {
  return {
    ...normalizedPayload,
    modalidad: normalizeModalidad(normalizedPayload.modalidad, "Presencial"),
    nit_empresa: cleanText(normalizedPayload.nit_empresa),
    asistentes: normalizePayloadAsistentes(normalizedPayload.asistentes),
    discapacidades: normalizedPayload.discapacidades.map((row) => ({
      discapacidad: cleanText(row.discapacidad),
      descripcion: cleanText(row.descripcion),
    })),
  };
}

export function buildCanonicalFinalizationPayload(
  formSlug: FinalizationFormSlug,
  payload: Record<string, unknown>
) {
  if (formSlug === "presentacion") {
    return normalizeCanonicalPresentacionPayload(payload);
  }

  if (formSlug === "condiciones-vacante") {
    return normalizeCanonicalCondicionesVacantePayload(payload);
  }

  if (formSlug === "seleccion") {
    return normalizeCanonicalSeleccionPayload(payload);
  }

  if (formSlug === "contratacion") {
    return normalizeCanonicalContratacionPayload(payload);
  }

  return normalizeCanonicalSensibilizacionPayload(payload);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildFinalizationRequestHash(
  formSlug: FinalizationFormSlug,
  payload: Record<string, unknown>
) {
  return sha256Hex(
    stableStringify(buildCanonicalFinalizationPayload(formSlug, payload))
  );
}

export function buildCondicionesVacanteRequestHash(
  payload: CondicionesVacanteValues
) {
  return sha256Hex(
    stableStringify(
      normalizeCanonicalCondicionesVacantePayloadFromNormalizedValues(payload)
    )
  );
}

export function buildContratacionRequestHash(payload: ContratacionValues) {
  return sha256Hex(
    stableStringify(
      normalizeCanonicalContratacionPayloadFromNormalizedValues(payload)
    )
  );
}

export function buildSeleccionRequestHash(payload: SeleccionValues) {
  return sha256Hex(
    stableStringify(
      normalizeCanonicalSeleccionPayloadFromNormalizedValues(payload)
    )
  );
}

export function buildFinalizationIdempotencyKey({
  formSlug,
  userId,
  identity,
  requestHash,
}: {
  formSlug: FinalizationFormSlug;
  userId: string;
  identity: FinalizationIdentity;
  requestHash: string;
}) {
  const normalizedIdentity = normalizeIdentity(identity);
  const identityKey =
    normalizedIdentity.draft_id ?? normalizedIdentity.local_draft_session_id;

  return sha256Hex(`${formSlug}:${userId}:${identityKey}:${requestHash}`);
}
