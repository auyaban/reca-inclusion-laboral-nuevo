// @vitest-environment jsdom

import { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDraftsHub } from "@/hooks/useDraftsHub";

const {
  projectRecoverableDraftsMock,
  fetchDraftSummariesMock,
  getCurrentUserIdMock,
  purgeDraftArtifactsMock,
  reconcileLocalDraftIndexMock,
  emitDraftsChangedMock,
  subscribeDraftsChangedMock,
} = vi.hoisted(() => ({
  projectRecoverableDraftsMock: vi.fn(),
  fetchDraftSummariesMock: vi.fn(),
  getCurrentUserIdMock: vi.fn(),
  purgeDraftArtifactsMock: vi.fn(),
  reconcileLocalDraftIndexMock: vi.fn(),
  emitDraftsChangedMock: vi.fn(),
  subscribeDraftsChangedMock: vi.fn(() => () => {}),
}));

vi.mock("@/lib/drafts", () => ({
  projectRecoverableDrafts: projectRecoverableDraftsMock,
  fetchDraftPayload: vi.fn(),
  fetchDraftSummaries: fetchDraftSummariesMock,
  getCurrentUserId: getCurrentUserIdMock,
  purgeDraftArtifacts: purgeDraftArtifactsMock,
  reconcileLocalDraftIndex: reconcileLocalDraftIndexMock,
}));

vi.mock("@/lib/draftEvents", () => ({
  emitDraftsChanged: emitDraftsChangedMock,
  subscribeDraftsChanged: subscribeDraftsChangedMock,
}));

const REMOTE_DRAFT = {
  id: "draft-1",
  form_slug: "evaluacion",
  step: 2,
  empresa_nit: "900123",
  empresa_nombre: "Acme",
  empresa_snapshot: null,
  updated_at: "2026-04-20T10:00:00.000Z",
  created_at: "2026-04-20T09:00:00.000Z",
  last_checkpoint_at: "2026-04-20T10:00:00.000Z",
  last_checkpoint_hash: "hash-1",
};

function DraftsHubDeleteProbe() {
  const { hubDrafts, deleteHubDraft } = useDraftsHub({
    initialRemoteDrafts: [REMOTE_DRAFT],
    initialRemoteReady: true,
  });

  useEffect(() => {
    // noop: render reacts to hook state only
  }, [hubDrafts]);

  return (
    <div>
      <div data-testid="hub-drafts-count">{hubDrafts.length}</div>
      <button
        type="button"
        onClick={() => {
          if (hubDrafts[0]) {
            void deleteHubDraft(hubDrafts[0]).catch(() => {});
          }
        }}
      >
        Delete first draft
      </button>
    </div>
  );
}

describe("useDraftsHub deleteHubDraft", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdMock.mockResolvedValue("user-1");
    fetchDraftSummariesMock.mockImplementation(() => new Promise(() => {}));
    reconcileLocalDraftIndexMock.mockResolvedValue([]);
    projectRecoverableDraftsMock.mockImplementation((remoteDrafts) => ({
      hubDrafts: remoteDrafts.map((draft: typeof REMOTE_DRAFT) => ({
        id: `hub-${draft.id}`,
        form_slug: draft.form_slug,
        empresa_nit: draft.empresa_nit,
        empresa_nombre: draft.empresa_nombre,
        empresa_snapshot: draft.empresa_snapshot,
        step: draft.step,
        draftId: draft.id,
        sessionId: null,
        localUpdatedAt: null,
        remoteUpdatedAt: draft.updated_at,
        effectiveUpdatedAt: draft.updated_at,
        syncStatus: "remote_only",
        preview: null,
      })),
      draftsCount: remoteDrafts.length,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      })
    );
  });

  it("removes the draft from the visible list immediately before the backend resolves", async () => {
    let resolveFetch: ((value: { ok: boolean }) => void) | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            resolveFetch = resolve;
          })
      )
    );
    purgeDraftArtifactsMock.mockResolvedValue(undefined);

    render(<DraftsHubDeleteProbe />);

    expect(screen.getByTestId("hub-drafts-count").textContent).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Delete first draft" }));

    await waitFor(() => {
      expect(screen.getByTestId("hub-drafts-count").textContent).toBe("0");
    });

    resolveFetch?.({ ok: true });
    await waitFor(() => {
      expect(emitDraftsChangedMock).toHaveBeenCalledWith({
        localChanged: true,
        remoteChanged: true,
      });
    });
  });

  it("restores the draft when the backend delete fails", async () => {
    let resolveFetch: ((value: { ok: boolean }) => void) | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            resolveFetch = resolve;
          })
      )
    );

    render(<DraftsHubDeleteProbe />);

    fireEvent.click(screen.getByRole("button", { name: "Delete first draft" }));

    await waitFor(() => {
      expect(screen.getByTestId("hub-drafts-count").textContent).toBe("0");
    });

    resolveFetch?.({ ok: false });

    await waitFor(() => {
      expect(screen.getByTestId("hub-drafts-count").textContent).toBe("1");
    });
    expect(purgeDraftArtifactsMock).not.toHaveBeenCalled();
  });

  it("keeps the draft removed when the backend reports success for an already-missing draft", async () => {
    render(<DraftsHubDeleteProbe />);

    fireEvent.click(screen.getByRole("button", { name: "Delete first draft" }));

    await waitFor(() => {
      expect(screen.getByTestId("hub-drafts-count").textContent).toBe("0");
    });
  });
});
