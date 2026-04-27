// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, waitFor } from "@testing-library/react";

const {
  projectRecoverableDraftsMock,
  fetchDraftPayloadMock,
  fetchDraftSummariesMock,
  getCurrentUserIdMock,
  purgeDraftArtifactsMock,
  reconcileLocalDraftIndexMock,
  emitDraftsChangedMock,
  subscribeDraftsChangedMock,
} = vi.hoisted(() => ({
  projectRecoverableDraftsMock: vi.fn(),
  fetchDraftPayloadMock: vi.fn(),
  fetchDraftSummariesMock: vi.fn(),
  getCurrentUserIdMock: vi.fn(),
  purgeDraftArtifactsMock: vi.fn(),
  reconcileLocalDraftIndexMock: vi.fn(),
  emitDraftsChangedMock: vi.fn(),
  subscribeDraftsChangedMock: vi.fn(() => () => {}),
}));

vi.mock("@/lib/drafts", () => ({
  projectRecoverableDrafts: projectRecoverableDraftsMock,
  fetchDraftPayload: fetchDraftPayloadMock,
  fetchDraftSummaries: fetchDraftSummariesMock,
  getCurrentUserId: getCurrentUserIdMock,
  purgeDraftArtifacts: purgeDraftArtifactsMock,
  reconcileLocalDraftIndex: reconcileLocalDraftIndexMock,
}));

vi.mock("@/lib/draftEvents", () => ({
  emitDraftsChanged: emitDraftsChangedMock,
  subscribeDraftsChanged: subscribeDraftsChangedMock,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

import { useDraftsHub } from "@/hooks/useDraftsHub";

function DraftsHubProbe(props: Parameters<typeof useDraftsHub>[0]) {
  const state = useDraftsHub(props);

  return (
    <div
      data-count={state.draftsCount}
      data-loading={state.loading ? "true" : "false"}
    />
  );
}

describe("useDraftsHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeDraftsChangedMock.mockReturnValue(() => {});
    reconcileLocalDraftIndexMock.mockResolvedValue([]);
    projectRecoverableDraftsMock.mockReturnValue({
      hubDrafts: [],
      draftsCount: 0,
    });
  });

  it("uses server-seeded remote drafts on the first render without hiding the count", () => {
    const initialRemoteDrafts = [
      {
        id: "draft-1",
        form_slug: "presentacion",
        step: 2,
        empresa_nit: "900123",
        empresa_nombre: "Acme",
        empresa_snapshot: null,
        updated_at: "2026-04-16T10:00:00.000Z",
        created_at: "2026-04-16T10:00:00.000Z",
        last_checkpoint_at: "2026-04-16T10:00:00.000Z",
        last_checkpoint_hash: "hash-1",
      },
    ];

    projectRecoverableDraftsMock.mockReturnValue({
      hubDrafts: initialRemoteDrafts,
      draftsCount: 1,
    });

    const html = renderToStaticMarkup(
      <DraftsHubProbe
        initialRemoteDrafts={initialRemoteDrafts}
        initialRemoteReady
      />
    );

    expect(html).toContain('data-count="1"');
    expect(html).toContain('data-loading="true"');
    expect(projectRecoverableDraftsMock).toHaveBeenCalledWith(
      initialRemoteDrafts,
      []
    );
  });

  it("does not refetch remote drafts on mount when remote data is server-seeded", async () => {
    const initialRemoteDrafts = [
      {
        id: "draft-1",
        form_slug: "presentacion",
        step: 2,
        empresa_nit: "900123",
        empresa_nombre: "Acme",
        empresa_snapshot: null,
        updated_at: "2026-04-16T10:00:00.000Z",
        created_at: "2026-04-16T10:00:00.000Z",
        last_checkpoint_at: "2026-04-16T10:00:00.000Z",
        last_checkpoint_hash: "hash-1",
      },
    ];

    projectRecoverableDraftsMock.mockReturnValue({
      hubDrafts: initialRemoteDrafts,
      draftsCount: 1,
    });

    render(
      <DraftsHubProbe
        initialRemoteDrafts={initialRemoteDrafts}
        initialRemoteReady
      />
    );

    await waitFor(() => expect(reconcileLocalDraftIndexMock).toHaveBeenCalled());

    expect(getCurrentUserIdMock).not.toHaveBeenCalled();
    expect(fetchDraftSummariesMock).not.toHaveBeenCalled();
  });
});
