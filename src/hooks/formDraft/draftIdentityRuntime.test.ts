import { describe, expect, it } from "vitest";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  buildCreatedDraftSummary,
  getDraftIdentityInsertStrategies,
  resolveEnsureDraftIdentitySettledState,
  resolveIdentityLocalDraft,
} from "./draftIdentityRuntime";

const empresa: Empresa = {
  id: "empresa-1",
  nit_empresa: "9001",
  nombre_empresa: "Empresa Uno",
  direccion_empresa: null,
  ciudad_empresa: null,
  sede_empresa: null,
  zona_empresa: null,
  correo_1: null,
  contacto_empresa: null,
  telefono_empresa: null,
  cargo: null,
  profesional_asignado: null,
  correo_profesional: null,
  asesor: null,
  correo_asesor: null,
  caja_compensacion: null,
};

describe("draftIdentityRuntime", () => {
  it("builds the expected insert fallback sequence", () => {
    expect(
      getDraftIdentityInsertStrategies({
        draftSchemaMode: "unknown",
        checkpointColumnsMode: "unknown",
      })
    ).toEqual(["extended", "checkpoint_unsupported", "legacy"]);

    expect(
      getDraftIdentityInsertStrategies({
        draftSchemaMode: "extended",
        checkpointColumnsMode: "unsupported",
      })
    ).toEqual(["checkpoint_unsupported", "legacy"]);

    expect(
      getDraftIdentityInsertStrategies({
        draftSchemaMode: "legacy",
        checkpointColumnsMode: "unsupported",
      })
    ).toEqual(["legacy"]);
  });

  it("builds the created summary from the new draft identity", () => {
    expect(
      buildCreatedDraftSummary({
        draftId: "draft-created",
        slug: "presentacion",
        step: 3,
        empresaSnapshot: empresa,
        createdAt: "2026-04-12T11:00:00.000Z",
      })
    ).toMatchObject({
      id: "draft-created",
      form_slug: "presentacion",
      step: 3,
      empresa_nit: "9001",
      empresa_nombre: "Empresa Uno",
      updated_at: "2026-04-12T11:00:00.000Z",
      created_at: "2026-04-12T11:00:00.000Z",
      last_checkpoint_at: null,
    });
  });

  it("falls back to local only when identity creation fails", () => {
    expect(
      resolveEnsureDraftIdentitySettledState({
        ok: false,
        error: "No autenticado",
      })
    ).toEqual({
      remoteIdentityState: "local_only_fallback",
      remoteSyncState: "local_only_fallback",
    });
  });

  it("cleans provisional states on ok:false results", () => {
    expect(
      resolveEnsureDraftIdentitySettledState({
        ok: false,
        error: "No se pudo preparar el borrador remoto.",
      })
    ).toEqual({
      remoteIdentityState: "local_only_fallback",
      remoteSyncState: "local_only_fallback",
    });
  });

  it("prefers the freshest local draft and allows later recovery", () => {
    expect(
      resolveIdentityLocalDraft({
        latestLocalDraft: {
          step: 4,
          data: { acuerdos: "local" },
          empresa,
          updatedAt: "2026-04-12T11:05:00.000Z",
        },
        storedLocalDraft: {
          step: 1,
          data: { acuerdos: "stored" },
          empresa: null,
          updatedAt: "2026-04-12T10:00:00.000Z",
        },
        step: 2,
        data: { acuerdos: "fallback" },
        empresa,
      })
    ).toMatchObject({
      step: 4,
      data: { acuerdos: "local" },
    });

    expect(
      resolveEnsureDraftIdentitySettledState({
        ok: true,
        draftId: "draft-recovered",
      })
    ).toEqual({
      remoteIdentityState: "ready",
      remoteSyncState: "synced",
    });
  });
});
