import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeLocalStorageOptions = {
  throwOnGet?: boolean;
  throwOnSet?: boolean;
  throwOnRemove?: boolean;
  throwOnKey?: boolean;
};

function createFakeLocalStorage(options: FakeLocalStorageOptions = {}) {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    getItem(key: string) {
      if (options.throwOnGet) {
        throw new Error("localStorage get failed");
      }

      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (options.throwOnSet) {
        throw new Error("localStorage set failed");
      }

      storage.set(key, value);
    },
    removeItem(key: string) {
      if (options.throwOnRemove) {
        throw new Error("localStorage remove failed");
      }

      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
    key(index: number) {
      if (options.throwOnKey) {
        throw new Error("localStorage key failed");
      }

      return Array.from(storage.keys())[index] ?? null;
    },
  };
}

function createFakeIndexedDb({ failOpen = false }: { failOpen?: boolean } = {}) {
  return {
    open() {
      const request = {
        result: undefined as unknown,
        error: null as Error | null,
        onsuccess: null as null | (() => void),
        onerror: null as null | (() => void),
        onupgradeneeded: null as null | (() => void),
        onblocked: null as null | (() => void),
      };

      queueMicrotask(() => {
        if (failOpen) {
          request.error = new Error("IndexedDB open failed");
          request.onerror?.();
          return;
        }

        const stores = new Map<string, Map<string, unknown>>();
        const database = {
          objectStoreNames: {
            contains(name: string) {
              return stores.has(name);
            },
          },
          createObjectStore(name: string) {
            if (!stores.has(name)) {
              stores.set(name, new Map());
            }

            return {};
          },
          transaction(storeName: string) {
            const store = stores.get(storeName);
            if (!store) {
              throw new Error(`Store ${storeName} not initialized`);
            }

            return {
              error: null,
              onabort: null,
              onerror: null,
              objectStore() {
                return {
                  get(key: string) {
                    const inner = {
                      result: store.get(key),
                      error: null as Error | null,
                      onsuccess: null as null | (() => void),
                      onerror: null as null | (() => void),
                    };

                    queueMicrotask(() => inner.onsuccess?.());
                    return inner;
                  },
                  put(record: { storageKey: string }) {
                    const inner = {
                      result: undefined,
                      error: null as Error | null,
                      onsuccess: null as null | (() => void),
                      onerror: null as null | (() => void),
                    };

                    queueMicrotask(() => {
                      store.set(record.storageKey, JSON.parse(JSON.stringify(record)));
                      inner.onsuccess?.();
                    });
                    return inner;
                  },
                  delete(key: string) {
                    const inner = {
                      result: undefined,
                      error: null as Error | null,
                      onsuccess: null as null | (() => void),
                      onerror: null as null | (() => void),
                    };

                    queueMicrotask(() => {
                      store.delete(key);
                      inner.onsuccess?.();
                    });
                    return inner;
                  },
                  getAllKeys() {
                    const inner = {
                      result: Array.from(store.keys()),
                      error: null as Error | null,
                      onsuccess: null as null | (() => void),
                      onerror: null as null | (() => void),
                    };

                    queueMicrotask(() => inner.onsuccess?.());
                    return inner;
                  },
                };
              },
            };
          },
          close() {
            return undefined;
          },
          onversionchange: null,
        };

        request.result = database;
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });

      return request;
    },
  };
}

function installBrowserEnv({
  indexedDB = createFakeIndexedDb(),
  localStorage = createFakeLocalStorage(),
}: {
  indexedDB?: ReturnType<typeof createFakeIndexedDb>;
  localStorage?: ReturnType<typeof createFakeLocalStorage>;
} = {}) {
  const windowLike = {
    indexedDB,
    localStorage,
  } as unknown as Window & typeof globalThis;

  vi.stubGlobal("window", windowLike);
  vi.stubGlobal("localStorage", localStorage as unknown as Storage);

  return { localStorage };
}

describe("drafts local persistence propagation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unmock("@/lib/draftStorage");
    vi.unstubAllGlobals();
  });

  it("propagates fallback state through saveLocalCopy and readLocalCopy", async () => {
    installBrowserEnv({ indexedDB: createFakeIndexedDb({ failOpen: true }) });
    const drafts = await import("@/lib/drafts");

    const saveResult = await drafts.saveLocalCopy(
      "draft__presentacion__propagation",
      3,
      { observaciones: "fallback" },
      null,
      "2026-04-12T14:00:00.000Z"
    );

    expect(saveResult).toMatchObject({
      state: "local_storage_fallback",
      updatedAt: "2026-04-12T14:00:00.000Z",
    });

    const readResult = await drafts.readLocalCopy("draft__presentacion__propagation");
    expect(readResult).toMatchObject({
      state: "local_storage_fallback",
      draft: {
        step: 3,
        data: { observaciones: "fallback" },
        updatedAt: "2026-04-12T14:00:00.000Z",
      },
    });
  });

  it("migrates legacy localStorage payloads and reports the resulting persistence mode", async () => {
    const { localStorage } = installBrowserEnv({
      indexedDB: createFakeIndexedDb({ failOpen: true }),
    });
    const drafts = await import("@/lib/drafts");
    const storage = await import("@/lib/draftStorage");

    localStorage.setItem(
      "draft__presentacion__legacy",
      JSON.stringify({
        version: 2,
        step: 1,
        data: { modalidad: "Presencial" },
        empresaSnapshot: null,
        updatedAt: "2026-04-12T14:30:00.000Z",
      })
    );

    const readResult = await drafts.readLocalCopy("draft__presentacion__legacy");

    expect(readResult).toMatchObject({
      state: "local_storage_fallback",
      draft: {
        step: 1,
        data: { modalidad: "Presencial" },
        updatedAt: "2026-04-12T14:30:00.000Z",
      },
    });
    expect(localStorage.getItem("draft__presentacion__legacy")).toBeNull();

    const migratedPayload = await storage.readDraftPayload("draft__presentacion__legacy");
    expect(migratedPayload).toMatchObject({
      ok: true,
      mode: "local_storage_fallback",
      value: {
        storageKey: "draft__presentacion__legacy",
        step: 1,
      },
    });
  });

  it("surfaces unavailable state when no local persistence backend can be used", async () => {
    installBrowserEnv({
      indexedDB: createFakeIndexedDb({ failOpen: true }),
      localStorage: createFakeLocalStorage({
        throwOnGet: true,
        throwOnSet: true,
        throwOnRemove: true,
        throwOnKey: true,
      }),
    });
    const drafts = await import("@/lib/drafts");

    const saveResult = await drafts.saveLocalCopy(
      "draft__presentacion__unavailable",
      0,
      { nombre: "Sin respaldo" },
      null
    );

    expect(saveResult.state).toBe("unavailable");
    expect(saveResult.updatedAt).toBeNull();
  });

  it("reconciles indexed entries, discovers stored drafts and skips duplicate sessions", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");

    const remoteStorageKey = drafts.getStorageKey(
      "presentacion",
      "draft-1",
      "session-a"
    );
    const duplicateSessionKey = drafts.getStorageKey(
      "presentacion",
      null,
      "session-b"
    );
    const standaloneSessionKey = drafts.getStorageKey(
      "sensibilizacion",
      null,
      "session-c"
    );

    await drafts.saveLocalCopy(
      remoteStorageKey,
      2,
      { modalidad: "Presencial" },
      {
        id: "empresa-1",
        nombre_empresa: "Empresa Uno",
        nit_empresa: "9001",
      },
      "2026-04-12T15:30:00.000Z"
    );
    await drafts.saveLocalCopy(
      duplicateSessionKey,
      2,
      { modalidad: "Presencial" },
      {
        id: "empresa-1",
        nombre_empresa: "Empresa Uno",
        nit_empresa: "9001",
      },
      "2026-04-12T15:30:00.000Z"
    );
    await drafts.saveLocalCopy(
      standaloneSessionKey,
      1,
      { modalidad: "Virtual" },
      {
        id: "empresa-2",
        nombre_empresa: "Empresa Dos",
        nit_empresa: "9002",
      },
      "2026-04-12T16:00:00.000Z"
    );

    localStorage.setItem(
      drafts.LOCAL_DRAFT_INDEX_KEY,
      JSON.stringify([
        {
          slug: "presentacion",
          sessionId: "session-a",
          draftId: "draft-1",
          empresaNit: "9001",
          empresaNombre: "Empresa Uno",
          empresaSnapshot: {
            id: "empresa-1",
            nombre_empresa: "Empresa Uno",
            nit_empresa: "9001",
          },
          step: 0,
          updatedAt: "2026-04-12T15:00:00.000Z",
        },
      ])
    );

    const entries = await drafts.reconcileLocalDraftIndex();

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      slug: "sensibilizacion",
      sessionId: "session-c",
      draftId: null,
      empresaNit: "9002",
      updatedAt: "2026-04-12T16:00:00.000Z",
    });
    expect(entries[1]).toMatchObject({
      slug: "presentacion",
      sessionId: "session-a",
      draftId: "draft-1",
      empresaNit: "9001",
    });
  });

  it("preserves the persisted index when IndexedDB discovery fails", async () => {
    installBrowserEnv();
    vi.doMock("@/lib/draftStorage", async () => {
      const actual =
        await vi.importActual<typeof import("@/lib/draftStorage")>(
          "@/lib/draftStorage"
        );
      return {
        ...actual,
        listDraftPayloadKeys: vi.fn().mockResolvedValue({
          ok: false,
          value: [],
          mode: "unavailable",
          errorCode: "indexeddb_list_failed",
          message: "IndexedDB unavailable",
        }),
      };
    });
    const drafts = await import("@/lib/drafts");

    const storageKey = drafts.getStorageKey("presentacion", "draft-1", "session-a");
    await drafts.saveLocalCopy(
      storageKey,
      2,
      { modalidad: "Presencial" },
      {
        id: "empresa-1",
        nombre_empresa: "Empresa Uno",
        nit_empresa: "9001",
      },
      "2026-04-12T15:30:00.000Z"
    );

    const originalIndex = JSON.stringify([
      {
        slug: "presentacion",
        sessionId: "session-a",
        draftId: "draft-1",
        empresaNit: "9001",
        empresaNombre: "Empresa Uno",
        empresaSnapshot: {
          id: "empresa-1",
          nombre_empresa: "Empresa Uno",
          nit_empresa: "9001",
        },
        step: 0,
        updatedAt: "2026-04-12T15:00:00.000Z",
      },
    ]);

    localStorage.setItem(drafts.LOCAL_DRAFT_INDEX_KEY, originalIndex);

    const entries = await drafts.reconcileLocalDraftIndex();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      draftId: "draft-1",
      step: 2,
      updatedAt: "2026-04-12T15:30:00.000Z",
    });
    expect(localStorage.getItem(drafts.LOCAL_DRAFT_INDEX_KEY)).toBe(originalIndex);
  });

  it("preserves the persisted index when localStorage discovery fails", async () => {
    const { localStorage } = installBrowserEnv({
      localStorage: createFakeLocalStorage({ throwOnKey: true }),
    });
    const drafts = await import("@/lib/drafts");

    const storageKey = drafts.getStorageKey("presentacion", "draft-1", "session-a");
    await drafts.saveLocalCopy(
      storageKey,
      2,
      { modalidad: "Presencial" },
      {
        id: "empresa-1",
        nombre_empresa: "Empresa Uno",
        nit_empresa: "9001",
      },
      "2026-04-12T15:30:00.000Z"
    );

    const originalIndex = JSON.stringify([
      {
        slug: "presentacion",
        sessionId: "session-a",
        draftId: "draft-1",
        empresaNit: "9001",
        empresaNombre: "Empresa Uno",
        empresaSnapshot: {
          id: "empresa-1",
          nombre_empresa: "Empresa Uno",
          nit_empresa: "9001",
        },
        step: 0,
        updatedAt: "2026-04-12T15:00:00.000Z",
      },
    ]);

    localStorage.setItem(drafts.LOCAL_DRAFT_INDEX_KEY, originalIndex);

    const entries = await drafts.reconcileLocalDraftIndex();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      draftId: "draft-1",
      step: 2,
      updatedAt: "2026-04-12T15:30:00.000Z",
    });
    expect(localStorage.getItem(drafts.LOCAL_DRAFT_INDEX_KEY)).toBe(originalIndex);
  });

  it("removes both legacy and modern local copies without throwing", async () => {
    const { localStorage } = installBrowserEnv({
      indexedDB: createFakeIndexedDb({ failOpen: true }),
    });
    const drafts = await import("@/lib/drafts");
    const storage = await import("@/lib/draftStorage");

    const storageKey = "draft__presentacion__cleanup";
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        step: 1,
        data: { modalidad: "Virtual" },
        empresaSnapshot: null,
        updatedAt: "2026-04-12T15:45:00.000Z",
      })
    );
    await storage.writeDraftPayload(storageKey, {
      step: 1,
      data: { modalidad: "Virtual" },
      empresaSnapshot: null,
      updatedAt: "2026-04-12T15:45:00.000Z",
    });

    await expect(drafts.removeLocalCopy(storageKey)).resolves.toBeUndefined();
    expect(localStorage.getItem(storageKey)).toBeNull();

    const readResult = await storage.readDraftPayload(storageKey);
    expect(readResult.value).toBeNull();
  });

  it("does not throw while removing local copies when browser storage is unavailable", async () => {
    installBrowserEnv({
      indexedDB: createFakeIndexedDb({ failOpen: true }),
      localStorage: createFakeLocalStorage({
        throwOnGet: true,
        throwOnSet: true,
        throwOnRemove: true,
        throwOnKey: true,
      }),
    });
    const drafts = await import("@/lib/drafts");

    await expect(
      drafts.removeLocalCopy("draft__presentacion__cleanup-unavailable")
    ).resolves.toBeUndefined();
  });

  it("builds hub drafts with stable sync statuses", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");
    const syncedHash = drafts.buildDraftSnapshotHash(2, { modalidad: "Presencial" });
    const localNewerHash = drafts.buildDraftSnapshotHash(3, {
      observaciones: "Pendiente",
    });

    const hubDrafts = drafts.buildHubDrafts(
      [
        {
          id: "draft-synced",
          form_slug: "presentacion",
          step: 2,
          empresa_nit: "9001",
          empresa_nombre: "Empresa Uno",
          last_checkpoint_at: "2026-04-12T10:00:00.000Z",
          last_checkpoint_hash: syncedHash,
          updated_at: "2026-04-12T10:00:00.000Z",
        },
        {
          id: "draft-local-newer",
          form_slug: "sensibilizacion",
          step: 1,
          empresa_nit: "9002",
          empresa_nombre: "Empresa Dos",
          last_checkpoint_at: "2026-04-12T09:00:00.000Z",
          last_checkpoint_hash: drafts.buildDraftSnapshotHash(1, {
            observaciones: "Viejo",
          }),
          updated_at: "2026-04-12T09:00:00.000Z",
        },
        {
          id: "draft-remote-only",
          form_slug: "presentacion",
          step: 4,
          empresa_nit: "9003",
          empresa_nombre: "Empresa Tres",
          last_checkpoint_at: "2026-04-12T11:00:00.000Z",
          last_checkpoint_hash: drafts.buildDraftSnapshotHash(4, {
            acuerdos: "ok",
          }),
          updated_at: "2026-04-12T11:00:00.000Z",
        },
      ],
      [
        {
          id: "draft:draft-synced",
          slug: "presentacion",
          sessionId: "draft:draft-synced",
          draftId: "draft-synced",
          empresaNit: "9001",
          empresaNombre: "Empresa Uno",
          empresaSnapshot: null,
          step: 2,
          updatedAt: "2026-04-12T10:00:00.000Z",
          snapshotHash: syncedHash,
        },
        {
          id: "draft:draft-local-newer",
          slug: "sensibilizacion",
          sessionId: "draft:draft-local-newer",
          draftId: "draft-local-newer",
          empresaNit: "9002",
          empresaNombre: "Empresa Dos",
          empresaSnapshot: null,
          step: 3,
          updatedAt: "2026-04-12T12:00:00.000Z",
          snapshotHash: localNewerHash,
        },
        {
          id: "session:presentacion:session-local",
          slug: "presentacion",
          sessionId: "session-local",
          draftId: null,
          empresaNit: "9004",
          empresaNombre: "Empresa Cuatro",
          empresaSnapshot: null,
          step: 1,
          updatedAt: "2026-04-12T08:00:00.000Z",
          snapshotHash: drafts.buildDraftSnapshotHash(1, {
            modalidad: "Virtual",
          }),
        },
      ]
    );

    expect(hubDrafts.map((draft) => draft.syncStatus)).toEqual([
      "local_newer",
      "remote_only",
      "synced",
      "local_only",
    ]);
  });

  it("treats a remote stub with a local copy as local_newer instead of local_only", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");

    const hubDrafts = drafts.buildHubDrafts(
      [
        {
          id: "draft-stub",
          form_slug: "sensibilizacion",
          step: 0,
          empresa_nit: "9005",
          empresa_nombre: "Empresa Cinco",
          last_checkpoint_at: null,
          last_checkpoint_hash: null,
          updated_at: "2026-04-12T09:00:00.000Z",
        },
      ],
      [
        {
          id: "draft:draft-stub",
          slug: "sensibilizacion",
          sessionId: "session-stub",
          draftId: "draft-stub",
          empresaNit: "9005",
          empresaNombre: "Empresa Cinco",
          empresaSnapshot: null,
          step: 2,
          updatedAt: "2026-04-12T09:01:00.000Z",
          snapshotHash: drafts.buildDraftSnapshotHash(2, {
            observaciones: "avance",
          }),
        },
      ]
    );

    expect(hubDrafts).toHaveLength(1);
    expect(hubDrafts[0]?.syncStatus).toBe("local_newer");
  });

  it("collapses stale local session shadows when a draft-backed or remote checkpoint match exists", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");
    const shadowHash = drafts.buildDraftSnapshotHash(2, {
      acuerdos: "sin cambios",
    });

    const hubDrafts = drafts.buildHubDrafts(
      [
        {
          id: "draft-remote",
          form_slug: "presentacion",
          step: 2,
          empresa_nit: "9010",
          empresa_nombre: "Empresa Diez",
          last_checkpoint_at: "2026-04-12T10:30:00.000Z",
          last_checkpoint_hash: shadowHash,
          updated_at: "2026-04-12T10:30:00.000Z",
        },
      ],
      [
        {
          id: "session:presentacion:shadow-session",
          slug: "presentacion",
          sessionId: "shadow-session",
          draftId: null,
          empresaNit: "9010",
          empresaNombre: "Empresa Diez",
          empresaSnapshot: null,
          step: 2,
          updatedAt: "2026-04-12T10:00:00.000Z",
          snapshotHash: shadowHash,
        },
      ]
    );

    expect(hubDrafts).toHaveLength(1);
    expect(hubDrafts[0]?.draftId).toBe("draft-remote");
    expect(hubDrafts[0]?.syncStatus).toBe("remote_only");
  });

  it("collapses session and draft artifacts for the same logical draft when a session alias exists", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");
    const checkpointHash = drafts.buildDraftSnapshotHash(2, {
      acuerdos: "sin cambios",
    });

    localStorage.setItem(
      drafts.LOCAL_DRAFT_ALIASES_KEY,
      JSON.stringify({
        "presentacion::session-linked": "draft-linked",
      })
    );

    const hubDrafts = drafts.buildHubDrafts(
      [
        {
          id: "draft-linked",
          form_slug: "presentacion",
          step: 2,
          empresa_nit: "9011",
          empresa_nombre: "Empresa Once",
          last_checkpoint_at: "2026-04-12T10:30:00.000Z",
          last_checkpoint_hash: checkpointHash,
          updated_at: "2026-04-12T10:30:00.000Z",
        },
      ],
      [
        {
          id: "session:presentacion:session-linked",
          slug: "presentacion",
          sessionId: "session-linked",
          draftId: null,
          empresaNit: "9011",
          empresaNombre: "Empresa Once",
          empresaSnapshot: null,
          step: 2,
          updatedAt: "2026-04-12T10:29:00.000Z",
          snapshotHash: checkpointHash,
        },
        {
          id: "draft:draft-linked",
          slug: "presentacion",
          sessionId: "session-linked",
          draftId: "draft-linked",
          empresaNit: "9011",
          empresaNombre: "Empresa Once",
          empresaSnapshot: null,
          step: 2,
          updatedAt: "2026-04-12T10:30:00.000Z",
          snapshotHash: checkpointHash,
        },
      ]
    );

    expect(hubDrafts).toHaveLength(1);
    expect(hubDrafts[0]?.draftId).toBe("draft-linked");
    expect(hubDrafts[0]?.syncStatus).toBe("synced");
  });

  it("keeps different drafts for the same company when they are genuinely distinct", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");

    const hubDrafts = drafts.buildHubDrafts(
      [
        {
          id: "draft-a",
          form_slug: "presentacion",
          step: 1,
          empresa_nit: "9020",
          empresa_nombre: "Empresa Veinte",
          last_checkpoint_at: "2026-04-12T10:00:00.000Z",
          last_checkpoint_hash: drafts.buildDraftSnapshotHash(1, {
            acuerdos: "A",
          }),
          updated_at: "2026-04-12T10:00:00.000Z",
        },
        {
          id: "draft-b",
          form_slug: "presentacion",
          step: 3,
          empresa_nit: "9020",
          empresa_nombre: "Empresa Veinte",
          last_checkpoint_at: "2026-04-12T11:00:00.000Z",
          last_checkpoint_hash: drafts.buildDraftSnapshotHash(3, {
            acuerdos: "B",
          }),
          updated_at: "2026-04-12T11:00:00.000Z",
        },
      ],
      []
    );

    expect(hubDrafts).toHaveLength(2);
    expect(hubDrafts.map((draft) => draft.draftId)).toEqual([
      "draft-b",
      "draft-a",
    ]);
  });

  it("projects local preview metadata into hub drafts without changing draft identity", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");

    const hubDrafts = drafts.buildHubDrafts([], [
      {
        id: "draft:vacancy-draft",
        slug: "condiciones-vacante",
        sessionId: "session-vacancy",
        draftId: "vacancy-draft",
        empresaNit: "9050",
        empresaNombre: "Empresa Cincuenta",
        empresaSnapshot: null,
        step: 4,
        updatedAt: "2026-04-14T12:00:00.000Z",
        snapshotHash: drafts.buildDraftSnapshotHash(4, {
          nombre_vacante: "Auxiliar de bodega",
          numero_vacantes: 3,
        }),
        hasMeaningfulContent: true,
        preview: {
          title: "Auxiliar de bodega",
          quantityLabel: "3 vacantes",
          visitDate: "2026-04-14T00:00:00.000Z",
        },
      },
    ]);

    expect(hubDrafts).toHaveLength(1);
    expect(hubDrafts[0]).toMatchObject({
      draftId: "vacancy-draft",
      sessionId: "session-vacancy",
      syncStatus: "local_only",
      preview: {
        title: "Auxiliar de bodega",
        quantityLabel: "3 vacantes",
      },
    });
  });

  it("finds the promoted draft id for a session-backed editor url", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");

    localStorage.setItem(
      drafts.LOCAL_DRAFT_INDEX_KEY,
      JSON.stringify([
        {
          slug: "presentacion",
          sessionId: "session-promoted",
          draftId: "draft-promoted",
          empresaNit: "9030",
          empresaNombre: "Empresa Treinta",
          empresaSnapshot: null,
          step: 2,
          updatedAt: "2026-04-13T10:00:00.000Z",
          snapshotHash: drafts.buildDraftSnapshotHash(2, {
            acuerdos_observaciones: "ok",
          }),
          hasMeaningfulContent: true,
        },
      ])
    );

    expect(
      drafts.findPersistedDraftIdForSession("presentacion", "session-promoted")
    ).toBe("draft-promoted");
  });

  it("counts drafts from the same projection used by the hub list", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");

    localStorage.setItem(
      drafts.LOCAL_DRAFT_ALIASES_KEY,
      JSON.stringify({
        "presentacion::session-linked": "draft-linked",
      })
    );

    const { hubDrafts, draftsCount } = drafts.projectRecoverableDrafts(
      [
        {
          id: "draft-linked",
          form_slug: "presentacion",
          step: 2,
          empresa_nit: "9012",
          empresa_nombre: "Empresa Doce",
          last_checkpoint_at: "2026-04-12T10:30:00.000Z",
          last_checkpoint_hash: drafts.buildDraftSnapshotHash(2, {
            acuerdos: "ok",
          }),
          updated_at: "2026-04-12T10:30:00.000Z",
        },
      ],
      [
        {
          id: "session:presentacion:session-linked",
          slug: "presentacion",
          sessionId: "session-linked",
          draftId: null,
          empresaNit: "9012",
          empresaNombre: "Empresa Doce",
          empresaSnapshot: null,
          step: 2,
          updatedAt: "2026-04-12T10:31:00.000Z",
          snapshotHash: drafts.buildDraftSnapshotHash(2, {
            acuerdos: "avance",
          }),
        },
      ]
    );

    expect(draftsCount).toBe(hubDrafts.length);
    expect(draftsCount).toBe(1);
  });

  it("hides empty local placeholders from the hub when they do not contain meaningful data", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");

    const hubDrafts = drafts.buildHubDrafts([], [
      {
        id: "session:presentacion:session-empty",
        slug: "presentacion",
        sessionId: "session-empty",
        draftId: null,
        empresaNit: "9040",
        empresaNombre: "Empresa Cuarenta",
        empresaSnapshot: null,
        step: 0,
        updatedAt: "2026-04-13T10:05:00.000Z",
        snapshotHash: drafts.buildDraftSnapshotHash(0, {
          motivacion: [],
        }),
        hasMeaningfulContent: false,
      },
    ]);

    expect(hubDrafts).toHaveLength(0);
  });

  it("purges session payloads, draft payloads, pending checkpoints, aliases and index entries together", async () => {
    installBrowserEnv();
    const drafts = await import("@/lib/drafts");
    const draftStorage = await import("@/lib/draftStorage");

    drafts.setDraftAlias("presentacion", "session-purge", "draft-purge");

    await drafts.saveLocalCopy(
      drafts.getStorageKey("presentacion", null, "session-purge"),
      2,
      { acuerdos: "session" },
      null,
      "2026-04-13T09:00:00.000Z"
    );
    await drafts.saveLocalCopy(
      drafts.getStorageKey("presentacion", "draft-purge", "session-purge"),
      2,
      { acuerdos: "draft" },
      null,
      "2026-04-13T09:01:00.000Z",
      {
        sessionIdOverride: "session-purge",
      }
    );
    await draftStorage.writePendingCheckpoint(
      drafts.getStorageKey("presentacion", "draft-purge", "session-purge"),
      {
        slug: "presentacion",
        draftId: "draft-purge",
        sessionId: "session-purge",
        step: 2,
        data: { acuerdos: "draft" },
        empresaSnapshot: null,
        updatedAt: "2026-04-13T09:01:00.000Z",
        checkpointHash: drafts.buildDraftSnapshotHash(2, { acuerdos: "draft" }),
        reason: "manual",
        lastError: null,
      }
    );

    await drafts.purgeDraftArtifacts({
      slug: "presentacion",
      draftId: "draft-purge",
      sessionId: "session-purge",
    });

    expect(
      (await drafts.readLocalCopy(
        drafts.getStorageKey("presentacion", null, "session-purge")
      )).draft
    ).toBeNull();
    expect(
      (await drafts.readLocalCopy(
        drafts.getStorageKey("presentacion", "draft-purge", "session-purge")
      )).draft
    ).toBeNull();
    expect(
      (
        await draftStorage.readPendingCheckpoint(
          drafts.getStorageKey("presentacion", "draft-purge", "session-purge")
        )
      ).value
    ).toBeNull();
    expect(drafts.findPersistedDraftIdForSession("presentacion", "session-purge")).toBeNull();
    expect(
      drafts.readLocalDraftIndex().filter((entry) => entry.slug === "presentacion")
    ).toHaveLength(0);
  });
});
