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

    const hubDrafts = drafts.buildHubDrafts(
      [
        {
          id: "draft-synced",
          form_slug: "presentacion",
          step: 2,
          empresa_nit: "9001",
          empresa_nombre: "Empresa Uno",
          last_checkpoint_at: "2026-04-12T10:00:00.000Z",
          updated_at: "2026-04-12T10:00:00.000Z",
        },
        {
          id: "draft-local-newer",
          form_slug: "sensibilizacion",
          step: 1,
          empresa_nit: "9002",
          empresa_nombre: "Empresa Dos",
          last_checkpoint_at: "2026-04-12T09:00:00.000Z",
          updated_at: "2026-04-12T09:00:00.000Z",
        },
        {
          id: "draft-remote-only",
          form_slug: "presentacion",
          step: 4,
          empresa_nit: "9003",
          empresa_nombre: "Empresa Tres",
          last_checkpoint_at: "2026-04-12T11:00:00.000Z",
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
});
