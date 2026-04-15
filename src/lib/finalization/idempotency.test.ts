import { describe, expect, it } from "vitest";
import {
  buildCanonicalFinalizationPayload,
  buildFinalizationIdempotencyKey,
  buildFinalizationRequestHash,
} from "./idempotency";

describe("finalization idempotency helpers", () => {
  it("normalizes presentacion payloads into a stable canonical shape", () => {
    const payload = buildCanonicalFinalizationPayload("presentacion", {
      tipo_visita: "Reactivación",
      fecha_visita: " 2026-04-14 ",
      modalidad: "Mixto",
      nit_empresa: " 9001 ",
      motivacion: [
        "Ventaja en licitaciones públicas",
        "Responsabilidad Social Empresarial",
        "Objetivos y metas para la diversidad, equidad e inclusión.",
        "Responsabilidad Social Empresarial",
      ],
      acuerdos_observaciones: "  Acuerdo final  ",
      asistentes: [
        { nombre: "  Ana Perez  ", cargo: "  Profesional  " },
        { nombre: "", cargo: "" },
        { nombre: "  Marta Ruiz", cargo: "Asesora  " },
      ],
    });

    expect(payload).toEqual({
      tipo_visita: "Reactivación",
      fecha_visita: "2026-04-14",
      modalidad: "Mixta",
      nit_empresa: "9001",
      motivacion: [
        "Objetivos y metas para la diversidad, equidad e inclusión.",
        "Responsabilidad Social Empresarial",
        "Ventaja en licitaciones públicas",
      ],
      acuerdos_observaciones: "Acuerdo final",
      asistentes: [
        { nombre: "Ana Perez", cargo: "Profesional" },
        { nombre: "Marta Ruiz", cargo: "Asesora" },
      ],
    });
  });

  it("builds the same request hash for equivalent sensibilizacion payloads", () => {
    const base = {
      fecha_visita: "2026-04-14",
      modalidad: "Mixta",
      nit_empresa: "9001",
      observaciones: "Observación",
      asistentes: [
        { nombre: "Ana", cargo: "Profesional" },
        { nombre: "Juan", cargo: "Asesor" },
      ],
    };

    const variant = {
      fecha_visita: " 2026-04-14 ",
      modalidad: "Mixto",
      nit_empresa: " 9001 ",
      observaciones: "  Observación  ",
      asistentes: [
        { nombre: "  Ana  ", cargo: "  Profesional  " },
        { nombre: "Juan", cargo: "Asesor" },
      ],
    };

    expect(buildFinalizationRequestHash("sensibilizacion", base)).toBe(
      buildFinalizationRequestHash("sensibilizacion", variant)
    );
  });

  it("derives a stable idempotency key from identity and request hash", () => {
    const requestHash = buildFinalizationRequestHash("presentacion", {
      tipo_visita: "Presentación",
      fecha_visita: "2026-04-14",
      modalidad: "Presencial",
      nit_empresa: "9001",
      motivacion: [],
      acuerdos_observaciones: "",
      asistentes: [],
    });

    const first = buildFinalizationIdempotencyKey({
      formSlug: "presentacion",
      userId: "user-1",
      identity: {
        draft_id: "  draft-1  ",
        local_draft_session_id: "session-1",
      },
      requestHash,
    });

    const second = buildFinalizationIdempotencyKey({
      formSlug: "presentacion",
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "  session-1  ",
      },
      requestHash,
    });

    const third = buildFinalizationIdempotencyKey({
      formSlug: "presentacion",
      userId: "user-1",
      identity: {
        local_draft_session_id: "session-1",
      },
      requestHash,
    });

    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });
});
