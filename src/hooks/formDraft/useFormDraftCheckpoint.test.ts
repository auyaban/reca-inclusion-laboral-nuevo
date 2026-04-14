import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFormDraftCheckpoint } from "./useFormDraftCheckpoint";

const {
  buildDraftSnapshotHashMock,
  createClientMock,
  emitDraftsChangedMock,
  buildDraftSummaryMock,
  getCheckpointColumnsModeMock,
  getDraftCheckpointWritePayloadMock,
  getDraftFieldsMock,
  getDraftSchemaModeMock,
  getDraftWritePayloadMock,
  getErrorMessageMock,
  getStorageKeyMock,
  isMissingDraftSchemaErrorMock,
  markCheckpointColumnsUnsupportedMock,
  markDraftSchemaExtendedMock,
  markDraftSchemaLegacyMock,
  readLocalCopyMock,
  saveLocalCopyMock,
} = vi.hoisted(() => ({
  buildDraftSnapshotHashMock: vi.fn(
    (step: number, data: Record<string, unknown>) =>
      `hash:${step}:${JSON.stringify(data)}`
  ),
  createClientMock: vi.fn(),
  emitDraftsChangedMock: vi.fn(),
  buildDraftSummaryMock: vi.fn(),
  getCheckpointColumnsModeMock: vi.fn(),
  getDraftCheckpointWritePayloadMock: vi.fn(),
  getDraftFieldsMock: vi.fn(),
  getDraftSchemaModeMock: vi.fn(),
  getDraftWritePayloadMock: vi.fn(),
  getErrorMessageMock: vi.fn(),
  getStorageKeyMock: vi.fn(),
  isMissingDraftSchemaErrorMock: vi.fn(),
  markCheckpointColumnsUnsupportedMock: vi.fn(),
  markDraftSchemaExtendedMock: vi.fn(),
  markDraftSchemaLegacyMock: vi.fn(),
  readLocalCopyMock: vi.fn(),
  saveLocalCopyMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/draftEvents", () => ({
  emitDraftsChanged: emitDraftsChangedMock,
}));

vi.mock("@/lib/drafts", () => ({
  buildDraftSnapshotHash: buildDraftSnapshotHashMock,
  buildDraftSummary: buildDraftSummaryMock,
  getCheckpointColumnsMode: getCheckpointColumnsModeMock,
  getDraftCheckpointWritePayload: getDraftCheckpointWritePayloadMock,
  getDraftFields: getDraftFieldsMock,
  getDraftSchemaMode: getDraftSchemaModeMock,
  getDraftWritePayload: getDraftWritePayloadMock,
  getErrorMessage: getErrorMessageMock,
  getStorageKey: getStorageKeyMock,
  isMissingDraftSchemaError: isMissingDraftSchemaErrorMock,
  markCheckpointColumnsUnsupported: markCheckpointColumnsUnsupportedMock,
  markDraftSchemaExtended: markDraftSchemaExtendedMock,
  markDraftSchemaLegacy: markDraftSchemaLegacyMock,
  readLocalCopy: readLocalCopyMock,
  saveLocalCopy: saveLocalCopyMock,
}));

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

function createSupabaseUpdateClient(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ single }));
  const secondEq = vi.fn(() => ({ select }));
  const firstEq = vi.fn(() => ({ eq: secondEq }));
  const update = vi.fn(() => ({ eq: firstEq }));
  const from = vi.fn(() => ({ update }));

  return {
    from,
    update,
    select,
    single,
  };
}

function createSupabaseUpdateClientWithDeferredWrites(
  ...deferredWrites: Array<ReturnType<typeof createDeferred<{ data: unknown; error: unknown }>>>
) {
  const single = vi.fn(() => {
    const nextDeferred = deferredWrites.shift();
    if (!nextDeferred) {
      throw new Error("No deferred write configured for this checkpoint.");
    }

    return nextDeferred.promise;
  });
  const select = vi.fn(() => ({ single }));
  const secondEq = vi.fn(() => ({ select }));
  const firstEq = vi.fn(() => ({ eq: secondEq }));
  const update = vi.fn(() => ({ eq: firstEq }));
  const from = vi.fn(() => ({ update }));

  return {
    from,
    update,
    select,
    single,
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

function renderCheckpointHarness(
  override: Partial<Parameters<typeof useFormDraftCheckpoint>[0]> = {}
) {
  let result: ReturnType<typeof useFormDraftCheckpoint> | null = null;

  const baseParams: Parameters<typeof useFormDraftCheckpoint>[0] = {
    slug: "presentacion",
    empresa: createEmpresa(),
    activeDraftId: null,
    localDraftSessionId: "session-1",
    editingAuthorityState: "editor",
    latestLocalDraftRef: { current: null },
    lastCheckpointHashRef: { current: null },
    lastCheckpointAtRef: { current: null },
    remoteUpdatedAtRef: { current: null },
    storageKeyRef: { current: "draft__presentacion__session__session-1" },
    hasPendingAutosaveRef: { current: false },
    hasLocalDirtyChangesRef: { current: false },
    hasPendingRemoteSyncRef: { current: false },
    remoteSyncStateRef: { current: "synced" },
    savingDraftRef: { current: false },
    manualSaveInFlightRef: { current: false },
    setSavingDraft: vi.fn(),
    setDraftSavedAt: vi.fn(),
    setLocalDraftSavedAt: vi.fn(),
    setRemoteIdentityState: vi.fn(),
    setRemoteSyncState: vi.fn(),
    setHasPendingAutosave: vi.fn(),
    setHasLocalDirtyChanges: vi.fn(),
    setHasPendingRemoteSync: vi.fn(),
    getUserId: vi.fn().mockResolvedValue("user-1"),
    flushAutosave: vi.fn().mockResolvedValue(false),
    flushAndFreezeDraft: vi.fn().mockResolvedValue(undefined),
    refreshLocalDraftIndex: vi.fn().mockResolvedValue(undefined),
    ensureDraftIdentity: vi.fn().mockResolvedValue({
      ok: true,
      draftId: "draft-created",
    }),
    confirmDraftLease: vi.fn().mockReturnValue("lease-1"),
    applyReadOnlyConflict: vi.fn().mockResolvedValue(undefined),
    syncRemoteDraftState: vi.fn(),
    markPendingRemoteSync: vi.fn().mockResolvedValue(undefined),
    clearPendingRemoteSync: vi.fn().mockResolvedValue(undefined),
    releaseDraftLock: vi.fn(),
    applyLocalPersistenceStatus: vi.fn(),
    ...override,
  };

  function Harness() {
    // eslint-disable-next-line react-hooks/globals -- server render harness captures the callbacks for node-only tests.
    result = useFormDraftCheckpoint(baseParams);
    return null;
  }

  renderToStaticMarkup(React.createElement(Harness));

  if (!result) {
    throw new Error("Checkpoint harness did not render.");
  }

  return {
    result,
    params: baseParams,
  };
}

describe("useFormDraftCheckpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDraftSchemaModeMock.mockReturnValue("legacy");
    getCheckpointColumnsModeMock.mockReturnValue("unsupported");
    getDraftWritePayloadMock.mockImplementation((_slug, empresa, step, data) => ({
      form_slug: "presentacion",
      empresa_snapshot: empresa,
      step,
      data,
    }));
    getDraftCheckpointWritePayloadMock.mockImplementation(
      (_slug, empresa, step, data, checkpointAt, checkpointHash) => ({
        form_slug: "presentacion",
        empresa_snapshot: empresa,
        step,
        data,
        last_checkpoint_at: checkpointAt,
        last_checkpoint_hash: checkpointHash,
      })
    );
    getDraftFieldsMock.mockReturnValue("id, updated_at");
    getErrorMessageMock.mockImplementation((error: unknown, fallback: string) =>
      error instanceof Error && error.message.trim() ? error.message : fallback
    );
    getStorageKeyMock.mockImplementation(
      (slug: string | null | undefined, draftId: string | null, sessionId: string) =>
        draftId
          ? `draft__${slug}__${draftId}`
          : `draft__${slug}__session__${sessionId}`
    );
    isMissingDraftSchemaErrorMock.mockReturnValue(false);
    buildDraftSummaryMock.mockImplementation((row, empresaSnapshot) => ({
      id: row.id,
      form_slug: row.form_slug,
      step: row.step ?? 0,
      empresa_nit: row.empresa_nit,
      empresa_nombre: row.empresa_nombre ?? undefined,
      empresa_snapshot: empresaSnapshot,
      updated_at: row.updated_at ?? undefined,
      created_at: row.created_at ?? undefined,
      last_checkpoint_at: row.last_checkpoint_at ?? null,
    }));
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
      updatedAt: "2026-04-12T11:10:00.000Z",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the created remote draft id when checkpoint persistence falls back to pending sync", async () => {
    createClientMock.mockReturnValue(
      createSupabaseUpdateClient({ data: null, error: new Error("write failed") })
    );

    const { result, params } = renderCheckpointHarness();

    const checkpointResult = await result.checkpointDraft(
      2,
      { acuerdos: "Pendiente" },
      "manual"
    );

    expect(checkpointResult).toMatchObject({
      ok: false,
      error: "write failed",
    });
    expect(params.markPendingRemoteSync).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "presentacion",
        draftId: "draft-created",
        sessionId: "session-1",
        step: 2,
      }),
      "write failed"
    );
    expect(params.setRemoteIdentityState).not.toHaveBeenCalledWith(
      "local_only_fallback"
    );
  });

  it("returns an error before write when the lease is lost and does not enqueue pending sync", async () => {
    const { result, params } = renderCheckpointHarness({
      confirmDraftLease: vi.fn().mockReturnValue(null),
    });

    const checkpointResult = await result.checkpointDraft(
      2,
      { acuerdos: "Pendiente" },
      "manual"
    );

    expect(checkpointResult).toMatchObject({
      ok: false,
      error:
        "Este borrador cambió de pestaña activa antes de guardar. Vuelve a tomar el control si necesitas continuar.",
    });
    expect(createClientMock).not.toHaveBeenCalled();
    expect(params.markPendingRemoteSync).not.toHaveBeenCalled();
    expect(params.applyReadOnlyConflict).not.toHaveBeenCalled();
  });

  it("switches to read only when the lease changes after the remote write", async () => {
    createClientMock.mockReturnValue(
      createSupabaseUpdateClient({
        data: {
          id: "draft-created",
          form_slug: "presentacion",
          empresa_nit: "9001",
          empresa_nombre: "Empresa Uno",
          empresa_snapshot: createEmpresa(),
          step: 2,
          data: { acuerdos: "Pendiente" },
          updated_at: "2026-04-12T11:10:00.000Z",
          created_at: "2026-04-12T10:00:00.000Z",
          last_checkpoint_at: "2026-04-12T11:10:00.000Z",
          last_checkpoint_hash: "hash-1",
        },
        error: null,
      })
    );

    const confirmDraftLease = vi
      .fn()
      .mockReturnValueOnce("lease-1")
      .mockReturnValueOnce(null);
    const { result, params } = renderCheckpointHarness({
      confirmDraftLease,
    });

    const checkpointResult = await result.checkpointDraft(
      2,
      { acuerdos: "Pendiente" },
      "manual"
    );

    expect(checkpointResult).toMatchObject({
      ok: false,
      error:
        "Este borrador cambió de pestaña activa durante el guardado. Revisa la pestaña que tiene el control.",
    });
    expect(params.applyReadOnlyConflict).toHaveBeenCalledWith("draft-created");
    expect(params.markPendingRemoteSync).not.toHaveBeenCalled();
    expect(saveLocalCopyMock).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite the current local_only_fallback identity when the remote draft is unavailable", async () => {
    const { result, params } = renderCheckpointHarness({
      ensureDraftIdentity: vi.fn().mockResolvedValue({
        ok: false,
        error: "Borrador remoto no disponible",
      }),
    });

    const checkpointResult = await result.checkpointDraft(
      2,
      { acuerdos: "Pendiente" },
      "manual"
    );

    expect(checkpointResult).toMatchObject({
      ok: false,
      error: "Borrador remoto no disponible",
    });
    expect(params.markPendingRemoteSync).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: null,
        step: 2,
      }),
      "Borrador remoto no disponible"
    );
    expect(params.setRemoteIdentityState).not.toHaveBeenCalledWith(
      "local_only_fallback"
    );
  });

  it("clears pending sync state after a later successful checkpoint", async () => {
    createClientMock.mockReturnValue(
      createSupabaseUpdateClient({
        data: {
          id: "draft-created",
          form_slug: "presentacion",
          empresa_nit: "9001",
          empresa_nombre: "Empresa Uno",
          empresa_snapshot: createEmpresa(),
          step: 2,
          data: { acuerdos: "Pendiente" },
          updated_at: "2026-04-12T11:10:00.000Z",
          created_at: "2026-04-12T10:00:00.000Z",
          last_checkpoint_at: "2026-04-12T11:10:00.000Z",
          last_checkpoint_hash: "hash-1",
        },
        error: null,
      })
    );

    const { result, params } = renderCheckpointHarness();

    const checkpointResult = await result.checkpointDraft(
      2,
      { acuerdos: "Pendiente" },
      "manual"
    );

    expect(checkpointResult).toEqual({
      ok: true,
      draftId: "draft-created",
    });
    expect(params.clearPendingRemoteSync).toHaveBeenCalledWith(
      "draft__presentacion__draft-created"
    );
    expect(params.syncRemoteDraftState).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "draft-created",
        data: { acuerdos: "Pendiente" },
        last_checkpoint_hash: "hash-1",
      }),
      {
        checkpointHash: "hash-1",
        identityState: "ready",
      }
    );
    expect(emitDraftsChangedMock).toHaveBeenCalledWith({
      localChanged: true,
      remoteChanged: true,
    });
  });

  it("stops the visible spinner after the manual save timeout and marks pending sync", async () => {
    vi.useFakeTimers();

    const saveDeferred = createDeferred<{ data: unknown; error: unknown }>();
    const single = vi.fn(() => saveDeferred.promise);
    const select = vi.fn(() => ({ single }));
    const secondEq = vi.fn(() => ({ select }));
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const update = vi.fn(() => ({ eq: firstEq }));

    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ update })),
    });

    const { result, params } = renderCheckpointHarness();
    const savePromise = result.saveDraft(2, { acuerdos: "Pendiente" });

    await vi.advanceTimersByTimeAsync(15_000);

    await expect(savePromise).resolves.toEqual({
      ok: true,
      draftId: "draft-created",
    });
    expect(params.setSavingDraft).toHaveBeenCalledWith(false);
    expect(params.setHasPendingRemoteSync).toHaveBeenCalledWith(true);
    expect(params.setRemoteSyncState).toHaveBeenCalledWith("pending_remote_sync");

    saveDeferred.resolve({
      data: {
        id: "draft-created",
        form_slug: "presentacion",
        empresa_nit: "9001",
        empresa_nombre: "Empresa Uno",
        empresa_snapshot: createEmpresa(),
        step: 2,
        data: { acuerdos: "Pendiente" },
        updated_at: "2026-04-12T11:10:00.000Z",
        created_at: "2026-04-12T10:00:00.000Z",
        last_checkpoint_at: "2026-04-12T11:10:00.000Z",
        last_checkpoint_hash: "hash-1",
      },
      error: null,
    });
    await Promise.resolve();
    vi.useRealTimers();
  });

  it("waits for an in-flight automatic checkpoint before running a manual save", async () => {
    const automaticDeferred = createDeferred<{ data: unknown; error: unknown }>();
    const manualDeferred = createDeferred<{ data: unknown; error: unknown }>();

    createClientMock.mockReturnValue(
      createSupabaseUpdateClientWithDeferredWrites(
        automaticDeferred,
        manualDeferred
      )
    );

    const { result, params } = renderCheckpointHarness();

    const automaticPromise = result.checkpointDraft(
      1,
      { acuerdos_observaciones: "Automatico" },
      "interval"
    );

    let manualResolved = false;
    const manualPromise = result
      .checkpointDraft(2, { acuerdos_observaciones: "Manual" }, "manual")
      .then((value) => {
        manualResolved = true;
        return value;
      });

    await Promise.resolve();

    expect(manualResolved).toBe(false);
    expect(params.setSavingDraft).toHaveBeenCalledWith(true);

    automaticDeferred.resolve({
      data: {
        id: "draft-created",
        form_slug: "presentacion",
        empresa_nit: "9001",
        empresa_nombre: "Empresa Uno",
        empresa_snapshot: createEmpresa(),
        step: 1,
        data: { acuerdos_observaciones: "Automatico" },
        updated_at: "2026-04-12T11:00:00.000Z",
        created_at: "2026-04-12T10:00:00.000Z",
        last_checkpoint_at: "2026-04-12T11:00:00.000Z",
        last_checkpoint_hash: "hash:auto",
      },
      error: null,
    });

    await expect(automaticPromise).resolves.toEqual({
      ok: true,
      draftId: "draft-created",
    });

    await Promise.resolve();

    expect(createClientMock).toHaveBeenCalledTimes(2);
    expect(manualResolved).toBe(false);

    manualDeferred.resolve({
      data: {
        id: "draft-created",
        form_slug: "presentacion",
        empresa_nit: "9001",
        empresa_nombre: "Empresa Uno",
        empresa_snapshot: createEmpresa(),
        step: 2,
        data: { acuerdos_observaciones: "Manual" },
        updated_at: "2026-04-12T11:10:00.000Z",
        created_at: "2026-04-12T10:00:00.000Z",
        last_checkpoint_at: "2026-04-12T11:10:00.000Z",
        last_checkpoint_hash: "hash:manual",
      },
      error: null,
    });

    await expect(manualPromise).resolves.toEqual({
      ok: true,
      draftId: "draft-created",
    });
  });

  it("skips an automatic checkpoint while a manual save is in flight", async () => {
    const manualDeferred = createDeferred<{ data: unknown; error: unknown }>();

    createClientMock.mockReturnValue(
      createSupabaseUpdateClientWithDeferredWrites(manualDeferred)
    );

    const { result } = renderCheckpointHarness();

    const manualPromise = result.checkpointDraft(
      2,
      { acuerdos: "Manual" },
      "manual"
    );

    await Promise.resolve();

    await expect(
      result.checkpointDraft(3, { acuerdos: "Automatico" }, "interval")
    ).resolves.toEqual({ ok: false });
    expect(createClientMock).toHaveBeenCalledTimes(1);

    manualDeferred.resolve({
      data: {
        id: "draft-created",
        form_slug: "presentacion",
        empresa_nit: "9001",
        empresa_nombre: "Empresa Uno",
        empresa_snapshot: createEmpresa(),
        step: 2,
        data: { acuerdos: "Manual" },
        updated_at: "2026-04-12T11:10:00.000Z",
        created_at: "2026-04-12T10:00:00.000Z",
        last_checkpoint_at: "2026-04-12T11:10:00.000Z",
        last_checkpoint_hash: "hash:manual",
      },
      error: null,
    });

    await expect(manualPromise).resolves.toEqual({
      ok: true,
      draftId: "draft-created",
    });
  });
});
