"use client";

import type { Empresa } from "@/lib/store/empresaStore";

export type DraftStoragePayload = {
  storageKey: string;
  version: 2;
  step: number;
  data: Record<string, unknown>;
  empresaSnapshot: Empresa | null;
  updatedAt: string;
};

export type PendingCheckpointSnapshot = {
  storageKey: string;
  slug: string;
  draftId: string | null;
  sessionId: string | null;
  step: number;
  data: Record<string, unknown>;
  empresaSnapshot: Empresa | null;
  updatedAt: string;
  checkpointHash: string;
  reason: "manual" | "interval" | "pagehide" | "visibilitychange" | "retry";
  lastError?: string | null;
};

const DB_NAME = "reca-drafts";
const DB_VERSION = 1;
const PAYLOAD_STORE = "draft-payloads";
const PENDING_STORE = "pending-checkpoints";
const PERSISTENCE_STATUS_KEY = "draft_storage_persistence__v1";

let dbPromise: Promise<IDBDatabase> | null = null;
let persistencePromise: Promise<"granted" | "denied" | "unsupported" | "error"> | null =
  null;

function resetDatabaseHandle() {
  dbPromise = null;
}

function openDatabase() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB no disponible"));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PAYLOAD_STORE)) {
        db.createObjectStore(PAYLOAD_STORE, { keyPath: "storageKey" });
      }

      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: "storageKey" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        try {
          db.close();
        } catch {
          // ignore
        }
        resetDatabaseHandle();
      };
      resolve(db);
    };
    request.onerror = () => {
      resetDatabaseHandle();
      reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
    };
    request.onblocked = () => {
      resetDatabaseHandle();
      reject(new Error("IndexedDB quedó bloqueado por otra pestaña."));
    };
  });

  return dbPromise;
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
) {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let transaction: IDBTransaction;
        try {
          transaction = db.transaction(storeName, mode);
        } catch (error) {
          resetDatabaseHandle();
          reject(error);
          return;
        }
        const store = transaction.objectStore(storeName);

        transaction.onabort = () =>
          reject(transaction.error ?? new Error("La transacción fue abortada."));
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("La transacción falló."));

        executor(store, resolve, reject);
      })
  );
}

function getPersistenceStatus() {
  try {
    const raw = localStorage.getItem(PERSISTENCE_STATUS_KEY);
    if (
      raw === "granted" ||
      raw === "denied" ||
      raw === "unsupported" ||
      raw === "error"
    ) {
      return raw;
    }
  } catch {
    // ignore
  }

  return null;
}

function setPersistenceStatus(status: "granted" | "denied" | "unsupported" | "error") {
  try {
    localStorage.setItem(PERSISTENCE_STATUS_KEY, status);
  } catch {
    // ignore
  }
}

export async function ensureDurableStorage() {
  const cached = getPersistenceStatus();
  if (cached) {
    return cached;
  }

  if (typeof navigator === "undefined" || !("storage" in navigator)) {
    setPersistenceStatus("unsupported");
    return "unsupported" as const;
  }

  if (persistencePromise) {
    return persistencePromise;
  }

  persistencePromise = (async () => {
    try {
      const persisted = await navigator.storage.persisted?.();
      if (persisted) {
        setPersistenceStatus("granted");
        return "granted" as const;
      }

      if (!navigator.storage.persist) {
        setPersistenceStatus("unsupported");
        return "unsupported" as const;
      }

      const granted = await navigator.storage.persist();
      const status = granted ? "granted" : "denied";
      setPersistenceStatus(status);
      return status;
    } catch {
      setPersistenceStatus("error");
      return "error" as const;
    } finally {
      persistencePromise = null;
    }
  })();

  return persistencePromise;
}

export async function readDraftPayload(storageKey: string | null) {
  if (!storageKey) {
    return null;
  }

  try {
    return await runTransaction<DraftStoragePayload | null>(
      PAYLOAD_STORE,
      "readonly",
      (store, resolve, reject) => {
        const request = store.get(storageKey);
        request.onsuccess = () =>
          resolve((request.result as DraftStoragePayload | undefined) ?? null);
        request.onerror = () =>
          reject(request.error ?? new Error("No se pudo leer el borrador local."));
      }
    );
  } catch {
    return null;
  }
}

export async function writeDraftPayload(
  storageKey: string | null,
  payload: Omit<DraftStoragePayload, "storageKey" | "version">
) {
  if (!storageKey) {
    return null;
  }

  const record: DraftStoragePayload = {
    storageKey,
    version: 2,
    ...payload,
  };

  try {
    await runTransaction<void>(PAYLOAD_STORE, "readwrite", (store, resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("No se pudo guardar el borrador local."));
    });
    void ensureDurableStorage();
    return record.updatedAt;
  } catch {
    return null;
  }
}

export async function deleteDraftPayload(storageKey: string | null) {
  if (!storageKey) {
    return;
  }

  try {
    await runTransaction<void>(PAYLOAD_STORE, "readwrite", (store, resolve, reject) => {
      const request = store.delete(storageKey);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("No se pudo eliminar el borrador local."));
    });
  } catch {
    // ignore
  }
}

export async function listDraftPayloadKeys() {
  try {
    return await runTransaction<string[]>(PAYLOAD_STORE, "readonly", (store, resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () =>
        resolve(
          ((request.result ?? []) as unknown[]).filter(
            (value): value is string => typeof value === "string"
          )
        );
      request.onerror = () =>
        reject(request.error ?? new Error("No se pudieron listar los borradores locales."));
    });
  } catch {
    return [];
  }
}

export async function moveDraftPayload(fromKey: string | null, toKey: string | null) {
  if (!fromKey || !toKey || fromKey === toKey) {
    return;
  }

  try {
    await runTransaction<void>(PAYLOAD_STORE, "readwrite", (store, resolve, reject) => {
      const readRequest = store.get(fromKey);
      readRequest.onsuccess = () => {
        const payload = (readRequest.result as DraftStoragePayload | undefined) ?? null;
        if (!payload) {
          resolve();
          return;
        }

        const putRequest = store.put({
          ...payload,
          storageKey: toKey,
        });
        putRequest.onerror = () =>
          reject(putRequest.error ?? new Error("No se pudo mover el borrador local."));
        putRequest.onsuccess = () => {
          const deleteRequest = store.delete(fromKey);
          deleteRequest.onerror = () =>
            reject(
              deleteRequest.error ?? new Error("No se pudo completar el traslado del borrador.")
            );
          deleteRequest.onsuccess = () => resolve();
        };
      };
      readRequest.onerror = () =>
        reject(readRequest.error ?? new Error("No se pudo leer el borrador local."));
    });
  } catch {
    // ignore
  }
}

export async function readPendingCheckpoint(storageKey: string | null) {
  if (!storageKey) {
    return null;
  }

  try {
    return await runTransaction<PendingCheckpointSnapshot | null>(
      PENDING_STORE,
      "readonly",
      (store, resolve, reject) => {
        const request = store.get(storageKey);
        request.onsuccess = () =>
          resolve((request.result as PendingCheckpointSnapshot | undefined) ?? null);
        request.onerror = () =>
          reject(
            request.error ??
              new Error("No se pudo leer el checkpoint pendiente.")
          );
      }
    );
  } catch {
    return null;
  }
}

export async function writePendingCheckpoint(
  storageKey: string | null,
  checkpoint: Omit<PendingCheckpointSnapshot, "storageKey">
) {
  if (!storageKey) {
    return;
  }

  const record: PendingCheckpointSnapshot = {
    storageKey,
    ...checkpoint,
  };

  try {
    await runTransaction<void>(PENDING_STORE, "readwrite", (store, resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          request.error ??
            new Error("No se pudo guardar el checkpoint pendiente.")
        );
    });
  } catch {
    // ignore
  }
}

export async function deletePendingCheckpoint(storageKey: string | null) {
  if (!storageKey) {
    return;
  }

  try {
    await runTransaction<void>(PENDING_STORE, "readwrite", (store, resolve, reject) => {
      const request = store.delete(storageKey);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          request.error ??
            new Error("No se pudo eliminar el checkpoint pendiente.")
        );
    });
  } catch {
    // ignore
  }
}

export async function movePendingCheckpoint(fromKey: string | null, toKey: string | null) {
  if (!fromKey || !toKey || fromKey === toKey) {
    return;
  }

  try {
    await runTransaction<void>(PENDING_STORE, "readwrite", (store, resolve, reject) => {
      const readRequest = store.get(fromKey);
      readRequest.onsuccess = () => {
        const checkpoint =
          (readRequest.result as PendingCheckpointSnapshot | undefined) ?? null;
        if (!checkpoint) {
          resolve();
          return;
        }

        const putRequest = store.put({
          ...checkpoint,
          storageKey: toKey,
        });
        putRequest.onerror = () =>
          reject(
            putRequest.error ?? new Error("No se pudo mover el checkpoint pendiente.")
          );
        putRequest.onsuccess = () => {
          const deleteRequest = store.delete(fromKey);
          deleteRequest.onerror = () =>
            reject(
              deleteRequest.error ??
                new Error("No se pudo completar el traslado del checkpoint pendiente.")
            );
          deleteRequest.onsuccess = () => resolve();
        };
      };
      readRequest.onerror = () =>
        reject(readRequest.error ?? new Error("No se pudo leer el checkpoint pendiente."));
    });
  } catch {
    // ignore
  }
}
