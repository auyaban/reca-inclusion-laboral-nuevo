import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";

const baseProps = {
  savingDraft: false,
  remoteIdentityState: "ready" as const,
  remoteSyncState: "synced" as const,
  hasPendingAutosave: false,
  hasLocalDirtyChanges: false,
  hasPendingRemoteSync: false,
  localDraftSavedAt: new Date("2026-04-12T15:00:00.000Z"),
  draftSavedAt: new Date("2026-04-12T15:01:00.000Z"),
};

describe("DraftPersistenceStatus", () => {
  it("renders user-facing labels without any warning banner in the nominal state", () => {
    const html = renderToStaticMarkup(
      <DraftPersistenceStatus
        {...baseProps}
        localPersistenceState="indexeddb"
        localPersistenceMessage={null}
      />
    );

    expect(html).toContain("Último guardado en este dispositivo");
    expect(html).toContain("Estado de sincronización");
    expect(html).toContain("Sincronizado");
    expect(html).toContain('data-save-state="saved"');
    expect(html).toContain('data-local-saved-at="2026-04-12T15:00:00.000Z"');
    expect(html).not.toContain("Solo guardado en este dispositivo");
    expect(html).not.toContain("No se puede guardar localmente");
  });

  it("renders the fallback warning with user-facing copy", () => {
    const html = renderToStaticMarkup(
      <DraftPersistenceStatus
        {...baseProps}
        localPersistenceState="local_storage_fallback"
        localPersistenceMessage="Guardado local en modo de respaldo temporal."
      />
    );

    expect(html).toContain("Solo guardado en este dispositivo");
    expect(html).toContain("Estado de sincronización");
  });

  it("renders the unavailable warning when local persistence cannot be used", () => {
    const html = renderToStaticMarkup(
      <DraftPersistenceStatus
        {...baseProps}
        localPersistenceState="unavailable"
        localPersistenceMessage="Guardado local no disponible en este navegador."
      />
    );

    expect(html).toContain("No se puede guardar localmente");
  });

  it("surfaces pending sync status with non-technical copy", () => {
    const html = renderToStaticMarkup(
      <DraftPersistenceStatus
        {...baseProps}
        remoteSyncState="pending_remote_sync"
        hasPendingRemoteSync
        localPersistenceState="indexeddb"
        localPersistenceMessage={null}
      />
    );

    expect(html).toContain("Cambios sin sincronizar");
  });

  it("exposes a saving state while autosave is in progress", () => {
    const html = renderToStaticMarkup(
      <DraftPersistenceStatus
        {...baseProps}
        hasPendingAutosave
        hasLocalDirtyChanges
        localPersistenceState="indexeddb"
        localPersistenceMessage={null}
      />
    );

    expect(html).toContain('data-save-state="saving"');
  });
});
