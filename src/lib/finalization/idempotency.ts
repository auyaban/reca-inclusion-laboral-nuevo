import { createHash } from "crypto";
import { normalizeModalidad } from "@/lib/modalidad";
import {
  normalizePresentacionMotivacion,
  normalizePresentacionTipoVisita,
} from "@/lib/presentacion";
import { normalizePayloadAsistentes } from "@/lib/finalization/payloads";

export type FinalizationFormSlug = "presentacion" | "sensibilizacion";

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

export function buildCanonicalFinalizationPayload(
  formSlug: FinalizationFormSlug,
  payload: Record<string, unknown>
) {
  if (formSlug === "presentacion") {
    return normalizeCanonicalPresentacionPayload(payload);
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
