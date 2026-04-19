// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DraftsHub from "@/components/layout/DraftsHub";
import type { HubDraft } from "@/lib/drafts";

const { openActaTabMock, markDraftHubBootstrapMock } = vi.hoisted(() => ({
  openActaTabMock: vi.fn(() => true),
  markDraftHubBootstrapMock: vi.fn(),
}));

vi.mock("@/lib/actaTabs", () => ({
  openActaTab: openActaTabMock,
}));

vi.mock("@/lib/draftLocks", () => ({
  getDraftLockStatus: () => ({ isActive: false }),
}));

vi.mock("@/lib/drafts/invisibleDrafts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/drafts/invisibleDrafts")>(
    "@/lib/drafts/invisibleDrafts"
  );

  return {
    ...actual,
    markDraftHubBootstrap: markDraftHubBootstrapMock,
  };
});

function createDraft(overrides: Partial<HubDraft> = {}): HubDraft {
  return {
    id: "draft-entry-1",
    form_slug: "evaluacion",
    empresa_nit: "900123",
    empresa_nombre: "ACME SAS",
    empresa_snapshot: null,
    step: 2,
    draftId: "draft-123",
    sessionId: "session-123",
    localUpdatedAt: "2026-04-19T10:00:00.000Z",
    remoteUpdatedAt: "2026-04-19T10:00:00.000Z",
    effectiveUpdatedAt: "2026-04-19T10:00:00.000Z",
    syncStatus: "synced",
    preview: null,
    ...overrides,
  };
}

describe("DraftsHub", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens invisible-pilot drafts through the session URL when available", () => {
    render(
      <DraftsHub
        open
        drafts={[createDraft()]}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("hub-draft-open-draft-entry-1"));

    expect(markDraftHubBootstrapMock).toHaveBeenCalledWith("draft-123");
    expect(openActaTabMock).toHaveBeenCalledWith(
      "/formularios/evaluacion?session=session-123"
    );
  });

  it("falls back to the draft URL when the pilot slug has no session id", () => {
    render(
      <DraftsHub
        open
        drafts={[
          createDraft({
            id: "draft-entry-2",
            sessionId: null,
          }),
        ]}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("hub-draft-open-draft-entry-2"));

    expect(openActaTabMock).toHaveBeenCalledWith(
      "/formularios/evaluacion?draft=draft-123"
    );
  });

  it("treats pseudo draft sessions as legacy internal ids and falls back to draft url", () => {
    render(
      <DraftsHub
        open
        drafts={[
          createDraft({
            id: "draft-entry-3",
            sessionId: "draft:draft-123",
          }),
        ]}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("hub-draft-open-draft-entry-3"));

    expect(openActaTabMock).toHaveBeenCalledWith(
      "/formularios/evaluacion?draft=draft-123"
    );
  });
});
