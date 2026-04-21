import { describe, expect, it } from "vitest";
import {
  FINALIZATION_FORM_REGISTRY,
  FINALIZATION_FORM_SLUGS,
  buildRegisteredFinalizationIdempotencyKey,
  buildRegisteredFinalizationRequestHash,
  getFinalizationFormTextReviewSlug,
  isFinalizationFormSlug,
} from "@/lib/finalization/formRegistry";
import { buildInduccionOrganizacionalIdempotencyKey } from "@/lib/finalization/induccionOrganizacionalRequest";

describe("finalization form registry", () => {
  it("covers the eight supported finalization slugs", () => {
    expect(Object.keys(FINALIZATION_FORM_REGISTRY)).toEqual(
      [...FINALIZATION_FORM_SLUGS]
    );
    expect(FINALIZATION_FORM_REGISTRY["induccion-organizacional"].supportsTextReview).toBe(
      true
    );
    expect(FINALIZATION_FORM_REGISTRY["induccion-operativa"].supportsTextReview).toBe(
      true
    );
    expect(FINALIZATION_FORM_REGISTRY.evaluacion.supportsTextReview).toBe(true);
  });

  it("builds shared and induction hashes through the registry", () => {
    expect(
      buildRegisteredFinalizationRequestHash("presentacion", {
        tipo_visita: "Presentación",
        fecha_visita: "2026-04-19",
        modalidad: "Presencial",
        nit_empresa: "900123456",
        motivacion: [],
        acuerdos_observaciones: "",
        asistentes: [],
      })
    ).toMatch(/^[a-f0-9]{64}$/);

    expect(
      buildRegisteredFinalizationRequestHash("induccion-organizacional", {
        section_1: { nit_empresa: "900123456" },
      } as never)
    ).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reuses the induction-specific idempotency builder without manual branches", () => {
    const options = {
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      requestHash: "hash-1",
    };

    expect(
      buildRegisteredFinalizationIdempotencyKey({
        formSlug: "induccion-organizacional",
        ...options,
      })
    ).toBe(buildInduccionOrganizacionalIdempotencyKey(options));
  });

  it("returns text-review slugs only for supported forms", () => {
    expect(getFinalizationFormTextReviewSlug("presentacion")).toBe(
      "presentacion"
    );
    expect(getFinalizationFormTextReviewSlug("condiciones_vacante")).toBe(
      "condiciones_vacante"
    );
    expect(getFinalizationFormTextReviewSlug("induccion-organizacional")).toBe(
      "induccion_organizacional"
    );
    expect(getFinalizationFormTextReviewSlug("induccion-operativa")).toBe(
      "induccion_operativa"
    );
    expect(getFinalizationFormTextReviewSlug("desconocido")).toBeNull();
    expect(isFinalizationFormSlug("evaluacion")).toBe(true);
    expect(isFinalizationFormSlug("desconocido")).toBe(false);
  });
});
