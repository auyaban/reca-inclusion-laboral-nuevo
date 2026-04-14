import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeLocalStorageOptions = {
  throwOnGet?: boolean;
  throwOnSet?: boolean;
  throwOnRemove?: boolean;
  throwOnKey?: boolean;
};

type FakeIndexedDbOptions = {
  failOpen?: boolean;
  failGet?: boolean;
  failPut?: boolean;
  failDelete?: boolean;
  failGetAllKeys?: boolean;
};

function cloneValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

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

function createFakeIndexedDb(options: FakeIndexedDbOptions = {}) {
  const stores = new Map<string, Map<string, unknown>>();

  const createRequest = <T,>(runner: (request: {
    result?: T;
    error: Error | null;
    onsuccess: null | (() => void);
    onerror: null | (() => void);
    onupgradeneeded?: null | (() => void);
    onblocked?: null | (() => void);
  }) => void) => {
    const request = {
      result: undefined as T | undefined,
      error: null as Error | null,
      onsuccess: null as null | (() => void),
      onerror: null as null | (() => void),
      onupgradeneeded: null as null | (() => void),
      onblocked: null as null | (() => void),
    };

    queueMicrotask(() => runner(request));
    return request;
  };

  const createStore = (storeName: string) => {
    const store = stores.get(storeName);
    if (!store) {
      throw new Error(`Store ${storeName} not initialized`);
    }

    return {
      get(key: string) {
        return createRequest((request) => {
          if (options.failGet) {
            request.error = new Error("IndexedDB get failed");
            request.onerror?.();
            return;
          }

          request.result = cloneValue(store.get(key));
          request.onsuccess?.();
        });
      },
      put(record: { storageKey: string }) {
        return createRequest<void>((request) => {
          if (options.failPut) {
            request.error = new Error("IndexedDB put failed");
            request.onerror?.();
            return;
          }

          store.set(record.storageKey, cloneValue(record));
          request.onsuccess?.();
        });
      },
      delete(key: string) {
        return createRequest<void>((request) => {
          if (options.failDelete) {
            request.error = new Error("IndexedDB delete failed");
            request.onerror?.();
            return;
          }

          store.delete(key);
          request.onsuccess?.();
        });
      },
      getAllKeys() {
        return createRequest<unknown[]>((request) => {
          if (options.failGetAllKeys) {
            request.error = new Error("IndexedDB getAllKeys failed");
            request.onerror?.();
            return;
          }

          request.result = Array.from(store.keys());
          request.onsuccess?.();
        });
      },
    };
  };

  return {
    open() {
      return createRequest((request) => {
        if (options.failOpen) {
          request.error = new Error("IndexedDB open failed");
          request.onerror?.();
          return;
        }

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
            return {
              error: null,
              onabort: null,
              onerror: null,
              objectStore() {
                return createStore(storeName);
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

describe("draftStorage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes, reads, lists and deletes payloads with IndexedDB when available", async () => {
    installBrowserEnv();
    const storage = await import("@/lib/draftStorage");

    const writeResult = await storage.writeDraftPayload("draft__presentacion__1", {
      step: 2,
      data: { observaciones: "ok" },
      empresaSnapshot: null,
      updatedAt: "2026-04-12T10:00:00.000Z",
    });

    expect(writeResult).toMatchObject({
      ok: true,
      value: "2026-04-12T10:00:00.000Z",
      mode: "indexeddb",
    });

    const readResult = await storage.readDraftPayload("draft__presentacion__1");
    expect(readResult).toMatchObject({
      ok: true,
      mode: "indexeddb",
      value: {
        storageKey: "draft__presentacion__1",
        step: 2,
        updatedAt: "2026-04-12T10:00:00.000Z",
      },
    });

    const listResult = await storage.listDraftPayloadKeys();
    expect(listResult.value).toEqual(["draft__presentacion__1"]);

    const deleteResult = await storage.deleteDraftPayload("draft__presentacion__1");
    expect(deleteResult).toMatchObject({ ok: true, mode: "indexeddb" });

    const afterDelete = await storage.readDraftPayload("draft__presentacion__1");
    expect(afterDelete.value).toBeNull();
  });

  it("falls back to localStorage for payload persistence when IndexedDB fails", async () => {
    installBrowserEnv({ indexedDB: createFakeIndexedDb({ failOpen: true }) });
    const storage = await import("@/lib/draftStorage");

    const writeResult = await storage.writeDraftPayload("draft__presentacion__2", {
      step: 1,
      data: { nombre: "Empresa" },
      empresaSnapshot: null,
      updatedAt: "2026-04-12T10:30:00.000Z",
    });

    expect(writeResult).toMatchObject({
      ok: true,
      value: "2026-04-12T10:30:00.000Z",
      mode: "local_storage_fallback",
    });

    const readResult = await storage.readDraftPayload("draft__presentacion__2");
    expect(readResult).toMatchObject({
      ok: true,
      mode: "local_storage_fallback",
      value: {
        storageKey: "draft__presentacion__2",
        step: 1,
      },
    });
  });

  it("falls back to localStorage for pending checkpoints when IndexedDB fails", async () => {
    installBrowserEnv({ indexedDB: createFakeIndexedDb({ failOpen: true }) });
    const storage = await import("@/lib/draftStorage");

    const writeResult = await storage.writePendingCheckpoint(
      "draft__presentacion__3",
      {
        slug: "presentacion",
        draftId: "draft-3",
        sessionId: "session-3",
        step: 4,
        data: { acuerdos: "Pendiente" },
        empresaSnapshot: null,
        updatedAt: "2026-04-12T11:00:00.000Z",
        checkpointHash: "abc123",
        reason: "manual",
        lastError: "network down",
      }
    );

    expect(writeResult).toMatchObject({
      ok: true,
      mode: "local_storage_fallback",
    });

    const readResult = await storage.readPendingCheckpoint("draft__presentacion__3");
    expect(readResult).toMatchObject({
      ok: true,
      mode: "local_storage_fallback",
      value: {
        storageKey: "draft__presentacion__3",
        checkpointHash: "abc123",
        reason: "manual",
      },
    });
  });

  it("moves fallback payloads and cleans the original key", async () => {
    installBrowserEnv({ indexedDB: createFakeIndexedDb({ failOpen: true }) });
    const storage = await import("@/lib/draftStorage");

    await storage.writeDraftPayload("draft__presentacion__session__temp", {
      step: 0,
      data: { modalidad: "Virtual" },
      empresaSnapshot: null,
      updatedAt: "2026-04-12T11:30:00.000Z",
    });

    const moveResult = await storage.moveDraftPayload(
      "draft__presentacion__session__temp",
      "draft__presentacion__remote-id"
    );

    expect(moveResult).toMatchObject({
      ok: true,
      mode: "local_storage_fallback",
      value: true,
    });

    const oldPayload = await storage.readDraftPayload("draft__presentacion__session__temp");
    const nextPayload = await storage.readDraftPayload("draft__presentacion__remote-id");

    expect(oldPayload.value).toBeNull();
    expect(nextPayload).toMatchObject({
      ok: true,
      mode: "local_storage_fallback",
      value: {
        storageKey: "draft__presentacion__remote-id",
        step: 0,
      },
    });
  });

  it("reports unavailable when IndexedDB and localStorage both fail", async () => {
    installBrowserEnv({
      indexedDB: createFakeIndexedDb({ failOpen: true }),
      localStorage: createFakeLocalStorage({
        throwOnGet: true,
        throwOnSet: true,
        throwOnRemove: true,
        throwOnKey: true,
      }),
    });
    const storage = await import("@/lib/draftStorage");

    const writeResult = await storage.writeDraftPayload("draft__presentacion__4", {
      step: 1,
      data: { nit: "900" },
      empresaSnapshot: null,
      updatedAt: "2026-04-12T12:00:00.000Z",
    });
    const readResult = await storage.readDraftPayload("draft__presentacion__4");

    expect(writeResult).toMatchObject({
      ok: false,
      mode: "unavailable",
    });
    expect(readResult).toMatchObject({
      ok: false,
      mode: "unavailable",
    });
  });
});
