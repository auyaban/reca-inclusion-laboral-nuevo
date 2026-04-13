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
  it("renders the nominal indexeddb state without any warning banner", () => {
    const html = renderToStaticMarkup(
      <DraftPersistenceStatus
        {...baseProps}
        localPersistenceState="indexeddb"
        localPersistenceMessage={null}
      />
    );

    expect(html).toContain("Último cambio local");
    expect(html).toContain("Último cambio en la nube");
    expect(html).not.toContain("Guardado local en modo de respaldo temporal.");
    expect(html).not.toContain("Guardado local no disponible en este navegador.");
  });

  it("renders the fallback warning without changing the layout contract", () => {
    const html = renderToStaticMarkup(
      <DraftPersistenceStatus
        {...baseProps}
        localPersistenceState="local_storage_fallback"
        localPersistenceMessage="Guardado local en modo de respaldo temporal."
      />
    );

    expect(html).toContain("Guardado local en modo de respaldo temporal.");
    expect(html).toContain("Último cambio local");
    expect(html).toContain("Último cambio en la nube");
  });

  it("renders the unavailable warning when local persistence cannot be used", () => {
    const html = renderToStaticMarkup(
      <DraftPersistenceStatus
        {...baseProps}
        localPersistenceState="unavailable"
        localPersistenceMessage="Guardado local no disponible en este navegador."
      />
    );

    expect(html).toContain("Guardado local no disponible en este navegador.");
  });
});
