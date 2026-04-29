import {
  EMPRESA_EVENT_TYPES,
  EMPRESA_GENERAL_EVENT_FIELDS,
  EMPRESA_WRITE_FIELDS,
} from "@/lib/empresas/constants";

// cspell:ignore creacion eliminacion

export type EmpresaEventType = (typeof EMPRESA_EVENT_TYPES)[number];

export type EmpresaMutationActor = {
  userId: string;
  profesionalId: number | null;
  nombre: string;
};

export type EmpresaEventDraft = {
  tipo: EmpresaEventType;
  actor_user_id: string;
  actor_profesional_id: number | null;
  actor_nombre: string;
  payload: Record<string, unknown>;
};

type EmpresaComparable = Record<string, unknown>;

function normalizeComparable(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return value ?? null;
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== "")
  );
}

export function diffEmpresaChanges(
  before: EmpresaComparable,
  after: EmpresaComparable,
  fields: readonly string[] = EMPRESA_GENERAL_EVENT_FIELDS
) {
  const campos_cambiados: string[] = [];
  const antes: Record<string, unknown> = {};
  const despues: Record<string, unknown> = {};

  for (const field of fields) {
    const previous = normalizeComparable(before[field]);
    const next = normalizeComparable(after[field]);

    if (previous !== next) {
      campos_cambiados.push(field);
      antes[field] = previous;
      despues[field] = next;
    }
  }

  return { campos_cambiados, antes, despues };
}

function createEvent(
  actor: EmpresaMutationActor,
  tipo: EmpresaEventType,
  payload: Record<string, unknown>
): EmpresaEventDraft {
  return {
    tipo,
    actor_user_id: actor.userId,
    actor_profesional_id: actor.profesionalId,
    actor_nombre: actor.nombre,
    payload: compactPayload(payload),
  };
}

export function buildEmpresaMutationEvents(options: {
  actor: EmpresaMutationActor;
  before: EmpresaComparable;
  after: EmpresaComparable;
  comentario?: string | null;
}) {
  const { actor, before, after, comentario } = options;
  const events: EmpresaEventDraft[] = [];
  const editDiff = diffEmpresaChanges(before, after);

  if (editDiff.campos_cambiados.length > 0) {
    events.push(
      createEvent(actor, "edicion", {
        ...editDiff,
        comentario: normalizeComparable(comentario),
      })
    );
  }

  const previousEstado = normalizeComparable(before.estado);
  const nextEstado = normalizeComparable(after.estado);
  if (previousEstado !== nextEstado) {
    events.push(
      createEvent(actor, "cambio_estado", {
        desde: previousEstado,
        hacia: nextEstado,
        comentario: normalizeComparable(comentario),
      })
    );
  }

  const previousProfessional = normalizeComparable(before.profesional_asignado_id);
  const nextProfessional = normalizeComparable(after.profesional_asignado_id);
  if (previousProfessional !== nextProfessional) {
    if (nextProfessional) {
      events.push(
        createEvent(actor, "asignacion_gerente", {
          asignado_a_profesional_id: nextProfessional,
          asignado_a_nombre: normalizeComparable(after.profesional_asignado),
          anterior_profesional_id: previousProfessional,
          anterior_nombre: normalizeComparable(before.profesional_asignado),
          comentario: normalizeComparable(comentario),
        })
      );
    } else {
      events.push(
        createEvent(actor, "desasignacion_gerente", {
          anterior_profesional_id: previousProfessional,
          anterior_nombre: normalizeComparable(before.profesional_asignado),
          comentario: normalizeComparable(comentario),
        })
      );
    }
  }

  return events;
}

export function buildEmpresaCreationEvent(options: {
  actor: EmpresaMutationActor;
  snapshot: EmpresaComparable;
}) {
  return createEvent(options.actor, "creacion", {
    snapshot: Object.fromEntries(
      EMPRESA_WRITE_FIELDS.map((field) => [field, normalizeComparable(options.snapshot[field])])
    ),
  });
}

export function buildEmpresaDeletionEvent(options: {
  actor: EmpresaMutationActor;
  snapshot: EmpresaComparable;
  comentario?: string | null;
}) {
  return createEvent(options.actor, "eliminacion", {
    comentario: normalizeComparable(options.comentario),
    snapshot: Object.fromEntries(
      EMPRESA_WRITE_FIELDS.map((field) => [field, normalizeComparable(options.snapshot[field])])
    ),
  });
}

export function summarizeEmpresaEvent(event: {
  tipo: string | null;
  payload: Record<string, unknown> | null;
}) {
  const payload = event.payload ?? {};

  if (event.tipo === "creacion") {
    return "Empresa creada";
  }

  if (event.tipo === "edicion") {
    const fields = Array.isArray(payload.campos_cambiados)
      ? payload.campos_cambiados.join(", ")
      : "campos";
    return `Edicion: ${fields}`;
  }

  if (event.tipo === "cambio_estado") {
    return `Estado: ${payload.desde ?? "sin estado"} -> ${payload.hacia ?? "sin estado"}`;
  }

  if (event.tipo === "asignacion_gerente") {
    return `Asignada a ${payload.asignado_a_nombre ?? "profesional"}`;
  }

  if (event.tipo === "desasignacion_gerente") {
    return `Asignacion retirada de ${payload.anterior_nombre ?? "profesional"}`;
  }

  if (event.tipo === "eliminacion") {
    return "Empresa eliminada";
  }

  return "Actividad registrada";
}
