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

export type DraftStorageMode =
  | "indexeddb"
  | "local_storage_fallback"
  | "unavailable";

export type DraftStorageErrorCode =
  | "missing_storage_key"
  | "indexeddb_unavailable"
  | "indexeddb_read_failed"
  | "indexeddb_write_failed"
  | "indexeddb_delete_failed"
  | "indexeddb_list_failed"
  | "local_storage_unavailable"
  | "local_storage_read_failed"
  | "local_storage_write_failed"
  | "local_storage_delete_failed"
  | "local_storage_parse_failed";

export type DraftStorageResult<T> = {
  ok: boolean;
  value: T;
  mode: DraftStorageMode;
  errorCode?: DraftStorageErrorCode;
  message: string | null;
};

export type LocalPersistenceStatus = {
  state: DraftStorageMode;
  message: string | null;
  errorCode: DraftStorageErrorCode | null;
};

const DB_NAME = "reca-drafts";
const DB_VERSION = 1;
const PAYLOAD_STORE = "draft-payloads";
const PENDING_STORE = "pending-checkpoints";
const PERSISTENCE_STATUS_KEY = "draft_storage_persistence__v1";
const PAYLOAD_FALLBACK_PREFIX = "draft_storage_payload__v1__";
const PENDING_FALLBACK_PREFIX = "draft_storage_pending__v1__";
const LOCAL_FALLBACK_MESSAGE =
  "Guardado local en modo de respaldo temporal. Evita limpiar los datos del sitio hasta terminar de sincronizar.";
const LOCAL_UNAVAILABLE_MESSAGE =
  "Guardado local no disponible en este navegador. Guarda en la nube antes de cerrar o cambiar de pestana.";

let dbPromise: Promise<IDBDatabase> | null = null;
let persistencePromise: Promise<"granted" | "denied" | "unsupported" | "error"> | null =
  null;

function createResult<T>(
  ok: boolean,
  value: T,
  mode: DraftStorageMode,
  message: string | null,
  errorCode?: DraftStorageErrorCode
): DraftStorageResult<T> {
  return {
    ok,
    value,
    mode,
    message,
    errorCode,
  };
}

function successResult<T>(
  value: T,
  mode: DraftStorageMode = "indexeddb",
  message: string | null = null
) {
  return createResult(true, value, mode, message);
}

function failureResult<T>(
  value: T,
  errorCode: DraftStorageErrorCode,
  message = LOCAL_UNAVAILABLE_MESSAGE
) {
  return createResult(false, value, "unavailable", message, errorCode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isRecord(error)) {
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : null;
    if (message) {
      return message;
    }
  }

  return fallback;
}

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
          // noop
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
      reject(new Error("IndexedDB quedo bloqueado por otra pestana."));
    };
  });

  return dbPromise;
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  executor: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void
  ) => void
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
          reject(transaction.error ?? new Error("La transaccion fue abortada."));
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("La transaccion fallo."));

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
    // noop
  }

  return null;
}

function setPersistenceStatus(status: "granted" | "denied" | "unsupported" | "error") {
  try {
    localStorage.setItem(PERSISTENCE_STATUS_KEY, status);
  } catch {
    // noop
  }
}

function getLocalStorageHandle() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getFallbackStorageKey(prefix: string, storageKey: string) {
  return `${prefix}${storageKey}`;
}

function getFallbackStorageKeys(prefix: string) {
  const storage = getLocalStorageHandle();
  if (!storage) {
    return [];
  }

  try {
    return Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => typeof key === "string")
      .filter((key) => key.startsWith(prefix));
  } catch {
    return [];
  }
}

function readFallbackRecord<T>(
  prefix: string,
  storageKey: string
): DraftStorageResult<T | null> {
  const storage = getLocalStorageHandle();
  if (!storage) {
    return failureResult(
      null,
      "local_storage_unavailable",
      LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  try {
    const raw = storage.getItem(getFallbackStorageKey(prefix, storageKey));
    if (!raw) {
      return successResult<T | null>(null, "local_storage_fallback", LOCAL_FALLBACK_MESSAGE);
    }

    const parsed = JSON.parse(raw) as unknown;
    return successResult<T | null>(
      (parsed as T | null) ?? null,
      "local_storage_fallback",
      LOCAL_FALLBACK_MESSAGE
    );
  } catch (error) {
    return failureResult(
      null,
      error instanceof SyntaxError
        ? "local_storage_parse_failed"
        : "local_storage_read_failed",
      getErrorMessage(error, LOCAL_UNAVAILABLE_MESSAGE)
    );
  }
}

function writeFallbackRecord<T>(
  prefix: string,
  storageKey: string,
  value: T
): DraftStorageResult<T> {
  const storage = getLocalStorageHandle();
  if (!storage) {
    return failureResult(
      value,
      "local_storage_unavailable",
      LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  try {
    storage.setItem(
      getFallbackStorageKey(prefix, storageKey),
      JSON.stringify(value)
    );
    return successResult(value, "local_storage_fallback", LOCAL_FALLBACK_MESSAGE);
  } catch (error) {
    return failureResult(
      value,
      "local_storage_write_failed",
      getErrorMessage(error, LOCAL_UNAVAILABLE_MESSAGE)
    );
  }
}

function deleteFallbackRecord(prefix: string, storageKey: string) {
  const storage = getLocalStorageHandle();
  if (!storage) {
    return failureResult(
      false,
      "local_storage_unavailable",
      LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  try {
    storage.removeItem(getFallbackStorageKey(prefix, storageKey));
    return successResult(true, "local_storage_fallback", LOCAL_FALLBACK_MESSAGE);
  } catch (error) {
    return failureResult(
      false,
      "local_storage_delete_failed",
      getErrorMessage(error, LOCAL_UNAVAILABLE_MESSAGE)
    );
  }
}

function stripFallbackPrefix(prefix: string, value: string) {
  return value.startsWith(prefix) ? value.slice(prefix.length) : null;
}

export function toLocalPersistenceStatus<T>(
  result: DraftStorageResult<T>
): LocalPersistenceStatus {
  return {
    state: result.mode,
    message:
      result.mode === "indexeddb"
        ? null
        : result.message ??
          (result.mode === "local_storage_fallback"
            ? LOCAL_FALLBACK_MESSAGE
            : LOCAL_UNAVAILABLE_MESSAGE),
    errorCode: result.errorCode ?? null,
  };
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

export async function readDraftPayload(
  storageKey: string | null
): Promise<DraftStorageResult<DraftStoragePayload | null>> {
  if (!storageKey) {
    return failureResult(null, "missing_storage_key");
  }

  try {
    const value = await runTransaction<DraftStoragePayload | null>(
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

    if (value) {
      return successResult(value, "indexeddb");
    }

    const fallback = readFallbackRecord<DraftStoragePayload>(
      PAYLOAD_FALLBACK_PREFIX,
      storageKey
    );
    if (fallback.ok && fallback.value) {
      return fallback;
    }

    return successResult(null, "indexeddb");
  } catch (error) {
    const fallback = readFallbackRecord<DraftStoragePayload>(
      PAYLOAD_FALLBACK_PREFIX,
      storageKey
    );
    if (fallback.ok) {
      return fallback;
    }

    return failureResult(
      null,
      fallback.errorCode ?? "indexeddb_read_failed",
      getErrorMessage(error, LOCAL_UNAVAILABLE_MESSAGE)
    );
  }
}

export async function writeDraftPayload(
  storageKey: string | null,
  payload: Omit<DraftStoragePayload, "storageKey" | "version">
): Promise<DraftStorageResult<string | null>> {
  if (!storageKey) {
    return failureResult(null, "missing_storage_key");
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
    deleteFallbackRecord(PAYLOAD_FALLBACK_PREFIX, storageKey);
    return successResult(record.updatedAt, "indexeddb");
  } catch (error) {
    const fallback = writeFallbackRecord(
      PAYLOAD_FALLBACK_PREFIX,
      storageKey,
      record
    );
    if (fallback.ok) {
      return successResult(record.updatedAt, "local_storage_fallback", fallback.message);
    }

    return failureResult(
      null,
      fallback.errorCode ?? "indexeddb_write_failed",
      getErrorMessage(error, LOCAL_UNAVAILABLE_MESSAGE)
    );
  }
}

export async function deleteDraftPayload(
  storageKey: string | null
): Promise<DraftStorageResult<boolean>> {
  if (!storageKey) {
    return failureResult(false, "missing_storage_key");
  }

  let indexedDbError: unknown = null;
  try {
    await runTransaction<void>(PAYLOAD_STORE, "readwrite", (store, resolve, reject) => {
      const request = store.delete(storageKey);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("No se pudo eliminar el borrador local."));
    });
  } catch (error) {
    indexedDbError = error;
  }

  const fallbackDeletion = deleteFallbackRecord(PAYLOAD_FALLBACK_PREFIX, storageKey);
  if (!indexedDbError) {
    return successResult(true, "indexeddb");
  }

  if (fallbackDeletion.ok) {
    return successResult(true, "local_storage_fallback", fallbackDeletion.message);
  }

  return failureResult(
    false,
    fallbackDeletion.errorCode ?? "indexeddb_delete_failed",
    getErrorMessage(indexedDbError, LOCAL_UNAVAILABLE_MESSAGE)
  );
}

export async function listDraftPayloadKeys(): Promise<DraftStorageResult<string[]>> {
  const fallbackKeys = getFallbackStorageKeys(PAYLOAD_FALLBACK_PREFIX)
    .map((key) => stripFallbackPrefix(PAYLOAD_FALLBACK_PREFIX, key))
    .filter((key): key is string => typeof key === "string");

  try {
    const indexedDbKeys = await runTransaction<string[]>(
      PAYLOAD_STORE,
      "readonly",
      (store, resolve, reject) => {
        const request = store.getAllKeys();
        request.onsuccess = () =>
          resolve(
            ((request.result ?? []) as unknown[]).filter(
              (value): value is string => typeof value === "string"
            )
          );
        request.onerror = () =>
          reject(
            request.error ?? new Error("No se pudieron listar los borradores locales.")
          );
      }
    );

    return successResult(
      Array.from(new Set([...indexedDbKeys, ...fallbackKeys])),
      "indexeddb"
    );
  } catch (error) {
    if (fallbackKeys.length > 0) {
      return successResult(
        Array.from(new Set(fallbackKeys)),
        "local_storage_fallback",
        LOCAL_FALLBACK_MESSAGE
      );
    }

    if (getLocalStorageHandle()) {
      return successResult([], "local_storage_fallback", LOCAL_FALLBACK_MESSAGE);
    }

    return failureResult(
      [],
      "indexeddb_list_failed",
      getErrorMessage(error, LOCAL_UNAVAILABLE_MESSAGE)
    );
  }
}

export async function moveDraftPayload(
  fromKey: string | null,
  toKey: string | null
): Promise<DraftStorageResult<boolean>> {
  if (!fromKey || !toKey || fromKey === toKey) {
    return successResult(false, "indexeddb");
  }

  const current = await readDraftPayload(fromKey);
  if (!current.ok) {
    return failureResult(
      false,
      current.errorCode ?? "indexeddb_read_failed",
      current.message ?? LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  if (!current.value) {
    return successResult(false, current.mode, current.message);
  }

  const nextRecord = {
    step: current.value.step,
    data: current.value.data,
    empresaSnapshot: current.value.empresaSnapshot,
    updatedAt: current.value.updatedAt,
  };
  const written = await writeDraftPayload(toKey, nextRecord);
  if (!written.ok) {
    return failureResult(
      false,
      written.errorCode ?? "indexeddb_write_failed",
      written.message ?? LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  const deleted = await deleteDraftPayload(fromKey);
  if (!deleted.ok) {
    return failureResult(
      false,
      deleted.errorCode ?? "indexeddb_delete_failed",
      deleted.message ?? LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  return successResult(
    true,
    written.mode === "indexeddb" && current.mode === "indexeddb"
      ? "indexeddb"
      : "local_storage_fallback",
    written.mode === "local_storage_fallback" || current.mode === "local_storage_fallback"
      ? LOCAL_FALLBACK_MESSAGE
      : null
  );
}

export async function readPendingCheckpoint(
  storageKey: string | null
): Promise<DraftStorageResult<PendingCheckpointSnapshot | null>> {
  if (!storageKey) {
    return failureResult(null, "missing_storage_key");
  }

  try {
    const value = await runTransaction<PendingCheckpointSnapshot | null>(
      PENDING_STORE,
      "readonly",
      (store, resolve, reject) => {
        const request = store.get(storageKey);
        request.onsuccess = () =>
          resolve((request.result as PendingCheckpointSnapshot | undefined) ?? null);
        request.onerror = () =>
          reject(request.error ?? new Error("No se pudo leer el checkpoint pendiente."));
      }
    );

    if (value) {
      return successResult(value, "indexeddb");
    }

    const fallback = readFallbackRecord<PendingCheckpointSnapshot>(
      PENDING_FALLBACK_PREFIX,
      storageKey
    );
    if (fallback.ok && fallback.value) {
      return fallback;
    }

    return successResult(null, "indexeddb");
  } catch (error) {
    const fallback = readFallbackRecord<PendingCheckpointSnapshot>(
      PENDING_FALLBACK_PREFIX,
      storageKey
    );
    if (fallback.ok) {
      return fallback;
    }

    return failureResult(
      null,
      fallback.errorCode ?? "indexeddb_read_failed",
      getErrorMessage(error, LOCAL_UNAVAILABLE_MESSAGE)
    );
  }
}

export async function writePendingCheckpoint(
  storageKey: string | null,
  checkpoint: Omit<PendingCheckpointSnapshot, "storageKey">
): Promise<DraftStorageResult<boolean>> {
  if (!storageKey) {
    return failureResult(false, "missing_storage_key");
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
        reject(request.error ?? new Error("No se pudo guardar el checkpoint pendiente."));
    });
    deleteFallbackRecord(PENDING_FALLBACK_PREFIX, storageKey);
    return successResult(true, "indexeddb");
  } catch (error) {
    const fallback = writeFallbackRecord(
      PENDING_FALLBACK_PREFIX,
      storageKey,
      record
    );
    if (fallback.ok) {
      return successResult(true, "local_storage_fallback", fallback.message);
    }

    return failureResult(
      false,
      fallback.errorCode ?? "indexeddb_write_failed",
      getErrorMessage(error, LOCAL_UNAVAILABLE_MESSAGE)
    );
  }
}

export async function deletePendingCheckpoint(
  storageKey: string | null
): Promise<DraftStorageResult<boolean>> {
  if (!storageKey) {
    return failureResult(false, "missing_storage_key");
  }

  let indexedDbError: unknown = null;
  try {
    await runTransaction<void>(PENDING_STORE, "readwrite", (store, resolve, reject) => {
      const request = store.delete(storageKey);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          request.error ?? new Error("No se pudo eliminar el checkpoint pendiente.")
        );
    });
  } catch (error) {
    indexedDbError = error;
  }

  const fallbackDeletion = deleteFallbackRecord(PENDING_FALLBACK_PREFIX, storageKey);
  if (!indexedDbError) {
    return successResult(true, "indexeddb");
  }

  if (fallbackDeletion.ok) {
    return successResult(true, "local_storage_fallback", fallbackDeletion.message);
  }

  return failureResult(
    false,
    fallbackDeletion.errorCode ?? "indexeddb_delete_failed",
    getErrorMessage(indexedDbError, LOCAL_UNAVAILABLE_MESSAGE)
  );
}

export async function movePendingCheckpoint(
  fromKey: string | null,
  toKey: string | null
): Promise<DraftStorageResult<boolean>> {
  if (!fromKey || !toKey || fromKey === toKey) {
    return successResult(false, "indexeddb");
  }

  const current = await readPendingCheckpoint(fromKey);
  if (!current.ok) {
    return failureResult(
      false,
      current.errorCode ?? "indexeddb_read_failed",
      current.message ?? LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  if (!current.value) {
    return successResult(false, current.mode, current.message);
  }

  const written = await writePendingCheckpoint(toKey, {
    slug: current.value.slug,
    draftId: current.value.draftId,
    sessionId: current.value.sessionId,
    step: current.value.step,
    data: current.value.data,
    empresaSnapshot: current.value.empresaSnapshot,
    updatedAt: current.value.updatedAt,
    checkpointHash: current.value.checkpointHash,
    reason: current.value.reason,
    lastError: current.value.lastError ?? null,
  });
  if (!written.ok) {
    return failureResult(
      false,
      written.errorCode ?? "indexeddb_write_failed",
      written.message ?? LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  const deleted = await deletePendingCheckpoint(fromKey);
  if (!deleted.ok) {
    return failureResult(
      false,
      deleted.errorCode ?? "indexeddb_delete_failed",
      deleted.message ?? LOCAL_UNAVAILABLE_MESSAGE
    );
  }

  return successResult(
    true,
    written.mode === "indexeddb" && current.mode === "indexeddb"
      ? "indexeddb"
      : "local_storage_fallback",
    written.mode === "local_storage_fallback" || current.mode === "local_storage_fallback"
      ? LOCAL_FALLBACK_MESSAGE
      : null
  );
}
