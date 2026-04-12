import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFormDraftIdentity } from "./useFormDraftIdentity";

const {
  createClientMock,
  emitDraftsChangedMock,
  moveDraftPayloadMock,
  movePendingCheckpointMock,
  deletePendingCheckpointMock,
  getCurrentUserIdMock,
  getDraftSchemaModeMock,
  getCheckpointColumnsModeMock,
  getDraftStubWritePayloadMock,
  getDraftWritePayloadMock,
  isMissingDraftSchemaErrorMock,
  markCheckpointColumnsUnsupportedMock,
  markDraftSchemaLegacyMock,
  markDraftSchemaExtendedMock,
  readLocalCopyMock,
  removeLocalCopyMock,
  saveLocalCopyMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  emitDraftsChangedMock: vi.fn(),
  moveDraftPayloadMock: vi.fn(),
  movePendingCheckpointMock: vi.fn(),
  deletePendingCheckpointMock: vi.fn(),
  getCurrentUserIdMock: vi.fn(),
  getDraftSchemaModeMock: vi.fn(),
  getCheckpointColumnsModeMock: vi.fn(),
  getDraftStubWritePayloadMock: vi.fn(),
  getDraftWritePayloadMock: vi.fn(),
  isMissingDraftSchemaErrorMock: vi.fn(),
  markCheckpointColumnsUnsupportedMock: vi.fn(),
  markDraftSchemaLegacyMock: vi.fn(),
  markDraftSchemaExtendedMock: vi.fn(),
  readLocalCopyMock: vi.fn(),
  removeLocalCopyMock: vi.fn(),
  saveLocalCopyMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/draftEvents", () => ({
  emitDraftsChanged: emitDraftsChangedMock,
}));

vi.mock("@/lib/draftStorage", () => ({
  moveDraftPayload: moveDraftPayloadMock,
  movePendingCheckpoint: movePendingCheckpointMock,
  deletePendingCheckpoint: deletePendingCheckpointMock,
}));

vi.mock("@/lib/drafts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/drafts")>("@/lib/drafts");

  return {
    ...actual,
    getCurrentUserId: getCurrentUserIdMock,
    getDraftSchemaMode: getDraftSchemaModeMock,
    getCheckpointColumnsMode: getCheckpointColumnsModeMock,
    getDraftStubWritePayload: getDraftStubWritePayloadMock,
    getDraftWritePayload: getDraftWritePayloadMock,
    isMissingDraftSchemaError: isMissingDraftSchemaErrorMock,
    markCheckpointColumnsUnsupported: markCheckpointColumnsUnsupportedMock,
    markDraftSchemaLegacy: markDraftSchemaLegacyMock,
    markDraftSchemaExtended: markDraftSchemaExtendedMock,
    readLocalCopy: readLocalCopyMock,
    removeLocalCopy: removeLocalCopyMock,
    saveLocalCopy: saveLocalCopyMock,
  };
});

function createSupabaseInsertClient(responses: Array<{ error: unknown }>) {
  const insert = vi.fn();
  responses.forEach((response) => {
    insert.mockResolvedValueOnce(response);
  });

  return {
    from: vi.fn(() => ({
      insert,
    })),
    insert,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function createEmpresa() {
  return {
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
}

function renderIdentityHarness(
  override: Partial<Parameters<typeof useFormDraftIdentity>[0]> = {}
) {
  let result: ReturnType<typeof useFormDraftIdentity> | null = null;

  const baseParams: Parameters<typeof useFormDraftIdentity>[0] = {
    slug: "presentacion",
    empresa: createEmpresa(),
    initialDraftId: null,
    initialLocalDraftSessionId: "session-1",
    activeDraftId: null,
    setActiveDraftId: vi.fn(),
    localDraftSessionId: "session-1",
    setLocalDraftSessionId: vi.fn(),
    setLoadingDraft: vi.fn(),
    setDraftSavedAt: vi.fn(),
    setLocalDraftSavedAt: vi.fn(),
    setRemoteIdentityState: vi.fn(),
    setRemoteSyncState: vi.fn(),
    setHasPendingRemoteSync: vi.fn(),
    setHasPendingAutosave: vi.fn(),
    debounceRef: { current: null },
    latestLocalDraftRef: { current: null },
    ensureDraftIdentityPromiseRef: { current: null },
    lastCheckpointHashRef: { current: null },
    lastCheckpointAtRef: { current: null },
    remoteUpdatedAtRef: { current: null },
    refreshLocalDraftIndex: vi.fn().mockResolvedValue(undefined),
    releaseDraftLock: vi.fn(),
    flushAutosave: vi.fn().mockResolvedValue(false),
    syncRemoteDraftState: vi.fn(),
    clearPendingRemoteSync: vi.fn().mockResolvedValue(undefined),
    applyLocalPersistenceStatus: vi.fn(),
    ...override,
  };

  function Harness() {
    // eslint-disable-next-line react-hooks/globals -- server render harness is enough to capture the hook callbacks in node tests.
    result = useFormDraftIdentity(baseParams);
    return null;
  }

  renderToStaticMarkup(React.createElement(Harness));

  if (!result) {
    throw new Error("Identity harness did not render.");
  }

  return {
    result,
    params: baseParams,
  };
}

describe("useFormDraftIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue("user-1");
    getDraftSchemaModeMock.mockReturnValue("unknown");
    getCheckpointColumnsModeMock.mockReturnValue("unknown");
    getDraftStubWritePayloadMock.mockImplementation((_slug, empresa, step) => ({
      form_slug: "presentacion",
      empresa_snapshot: empresa,
      step,
    }));
    getDraftWritePayloadMock.mockImplementation((_slug, empresa, step, data) => ({
      form_slug: "presentacion",
      empresa_snapshot: empresa,
      step,
      data,
    }));
    isMissingDraftSchemaErrorMock.mockReturnValue(false);
    readLocalCopyMock.mockResolvedValue({
      draft: null,
      state: "indexeddb",
      message: null,
      errorCode: null,
    });
    saveLocalCopyMock.mockResolvedValue({
      state: "indexeddb",
      message: null,
      errorCode: null,
      updatedAt: "2026-04-12T11:00:00.000Z",
    });
    moveDraftPayloadMock.mockResolvedValue(undefined);
    movePendingCheckpointMock.mockResolvedValue(undefined);
    deletePendingCheckpointMock.mockResolvedValue(undefined);
    removeLocalCopyMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the active draft id without touching Supabase", async () => {
    const { result } = renderIdentityHarness({
      activeDraftId: "draft-existing",
    });

    await expect(result.ensureDraftIdentity(2, { acuerdos: "ok" })).resolves.toEqual({
      ok: true,
      draftId: "draft-existing",
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent ensureDraftIdentity calls", async () => {
    const insertDeferred = createDeferred<{ error: unknown }>();
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => insertDeferred.promise),
      })),
    };
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("draft-dedupe");

    createClientMock.mockReturnValue(client);

    const { result, params } = renderIdentityHarness({
      latestLocalDraftRef: {
        current: {
          step: 2,
          data: { acuerdos: "local" },
          empresa: createEmpresa(),
          updatedAt: "2026-04-12T10:55:00.000Z",
        },
      },
    });

    const first = result.ensureDraftIdentity(2, { acuerdos: "local" });
    const second = result.ensureDraftIdentity(2, { acuerdos: "local" });

    expect(params.setRemoteIdentityState).toHaveBeenCalledWith("creating");
    expect(params.setRemoteSyncState).toHaveBeenCalledWith("syncing");
    await Promise.resolve();
    await Promise.resolve();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledTimes(1);

    insertDeferred.resolve({ error: null });

    await expect(first).resolves.toEqual({
      ok: true,
      draftId: "draft-dedupe",
    });
    await expect(second).resolves.toEqual({
      ok: true,
      draftId: "draft-dedupe",
    });
    expect(client.from).toHaveBeenCalledWith("form_drafts");
    expect(params.ensureDraftIdentityPromiseRef.current).toBeNull();
    randomUuidSpy.mockRestore();
  });

  it("moves local payload and pending sync state to the definitive draft key on success", async () => {
    const client = createSupabaseInsertClient([{ error: null }]);
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("draft-created");

    createClientMock.mockReturnValue(client);

    const { result, params } = renderIdentityHarness({
      latestLocalDraftRef: {
        current: {
          step: 2,
          data: { acuerdos: "local" },
          empresa: createEmpresa(),
          updatedAt: "2026-04-12T10:55:00.000Z",
        },
      },
    });

    await expect(result.ensureDraftIdentity(2, { acuerdos: "manual" })).resolves.toEqual(
      {
        ok: true,
        draftId: "draft-created",
      }
    );

    expect(moveDraftPayloadMock).toHaveBeenCalledWith(
      "draft__presentacion__session__session-1",
      "draft__presentacion__draft-created"
    );
    expect(movePendingCheckpointMock).toHaveBeenCalledWith(
      "draft__presentacion__session__session-1",
      "draft__presentacion__draft-created"
    );
    expect(params.setActiveDraftId).toHaveBeenCalledWith("draft-created");
    expect(params.syncRemoteDraftState).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "draft-created",
        empresa_nit: "9001",
      }),
      {
        checkpointHash: null,
        identityState: "ready",
      }
    );
    expect(emitDraftsChangedMock).toHaveBeenCalledWith({
      localChanged: true,
      remoteChanged: true,
    });
    randomUuidSpy.mockRestore();
  });

  it("falls back to local_only_fallback on non-throw identity failures", async () => {
    getCurrentUserIdMock.mockResolvedValue(null);

    const { result, params } = renderIdentityHarness();

    await expect(result.ensureDraftIdentity(2, { acuerdos: "manual" })).resolves.toEqual(
      {
        ok: false,
        error: "No autenticado",
      }
    );

    expect(params.setRemoteIdentityState).toHaveBeenNthCalledWith(1, "creating");
    expect(params.setRemoteIdentityState).toHaveBeenNthCalledWith(
      2,
      "local_only_fallback"
    );
    expect(params.setRemoteSyncState).toHaveBeenNthCalledWith(1, "syncing");
    expect(params.setRemoteSyncState).toHaveBeenNthCalledWith(
      2,
      "local_only_fallback"
    );
    expect(params.ensureDraftIdentityPromiseRef.current).toBeNull();
  });

  it("recovers on a second successful attempt after a prior failure", async () => {
    const client = createSupabaseInsertClient([{ error: null }]);
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("draft-recovered");

    createClientMock.mockReturnValue(client);
    getCurrentUserIdMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("user-1");

    const { result, params } = renderIdentityHarness({
      latestLocalDraftRef: {
        current: {
          step: 3,
          data: { acuerdos: "retry" },
          empresa: createEmpresa(),
          updatedAt: "2026-04-12T10:58:00.000Z",
        },
      },
    });

    await expect(result.ensureDraftIdentity(3, { acuerdos: "retry" })).resolves.toEqual({
      ok: false,
      error: "No autenticado",
    });
    expect(params.ensureDraftIdentityPromiseRef.current).toBeNull();

    await expect(result.ensureDraftIdentity(3, { acuerdos: "retry" })).resolves.toEqual({
      ok: true,
      draftId: "draft-recovered",
    });

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(params.syncRemoteDraftState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "draft-recovered",
      }),
      {
        checkpointHash: null,
        identityState: "ready",
      }
    );
    randomUuidSpy.mockRestore();
  });
});
