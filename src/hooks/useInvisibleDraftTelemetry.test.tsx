// @vitest-environment jsdom

import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DraftLockConflict,
  EditingAuthorityState,
} from "@/hooks/formDraft/shared";
import { useInvisibleDraftTelemetry } from "./useInvisibleDraftTelemetry";

const { consumeDraftHubBootstrapMock, reportInvisibleDraftEventMock } =
  vi.hoisted(() => ({
    consumeDraftHubBootstrapMock: vi.fn(),
    reportInvisibleDraftEventMock: vi.fn(),
  }));

vi.mock("@/lib/drafts/invisibleDrafts", () => ({
  consumeDraftHubBootstrap: consumeDraftHubBootstrapMock,
  reportInvisibleDraftEvent: reportInvisibleDraftEventMock,
}));

type HarnessProps = {
  formSlug?: string;
  draftParam?: string | null;
  activeDraftId?: string | null;
  editingAuthorityState?: EditingAuthorityState;
  lockConflict?: DraftLockConflict | null;
  invisibleDraftPilotEnabled?: boolean;
  showTakeoverPrompt?: boolean;
};

let latestTelemetry: ReturnType<typeof useInvisibleDraftTelemetry> | null = null;

function Harness({
  formSlug = "presentacion",
  draftParam = null,
  activeDraftId = null,
  editingAuthorityState = "editor",
  lockConflict = null,
  invisibleDraftPilotEnabled = true,
  showTakeoverPrompt = false,
}: HarnessProps) {
  const telemetry = useInvisibleDraftTelemetry({
    formSlug,
    draftParam,
    activeDraftId,
    editingAuthorityState,
    lockConflict,
    invisibleDraftPilotEnabled,
    showTakeoverPrompt,
  });

  useEffect(() => {
    latestTelemetry = telemetry;
  }, [telemetry]);

  return null;
}

function createConflict(overrides: Partial<DraftLockConflict> = {}): DraftLockConflict {
  return {
    draftId: "draft-1",
    ownerTabId: "tab-1",
    ownerSeenAt: "2026-04-17T12:00:00.000Z",
    canTakeOver: true,
    ...overrides,
  };
}

describe("useInvisibleDraftTelemetry", () => {
  beforeEach(() => {
    latestTelemetry = null;
    consumeDraftHubBootstrapMock.mockReturnValue(false);
    reportInvisibleDraftEventMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports draft bootstrap only once and distinguishes hub bootstrap", async () => {
    consumeDraftHubBootstrapMock.mockReturnValue(true);

    const { rerender } = render(
      <Harness draftParam="draft-123" activeDraftId="draft-123" />
    );

    await waitFor(() => {
      expect(reportInvisibleDraftEventMock).toHaveBeenCalledWith(
        "draft_hub_bootstrap",
        expect.objectContaining({
          formSlug: "presentacion",
          source: "hub",
          activeDraftIdPresent: true,
        })
      );
    });

    rerender(<Harness draftParam="draft-123" activeDraftId="draft-123" />);
    expect(reportInvisibleDraftEventMock).toHaveBeenCalledTimes(1);
  });

  it("reports the takeover prompt only when the rendered banner is visible", async () => {
    render(
      <Harness
        activeDraftId="draft-123"
        editingAuthorityState="read_only"
        lockConflict={createConflict()}
        showTakeoverPrompt={false}
      />
    );

    await waitFor(() => {
      expect(reportInvisibleDraftEventMock).toHaveBeenCalledWith(
        "draft_conflict_detected",
        expect.objectContaining({
          formSlug: "presentacion",
          source: "session",
          activeDraftIdPresent: true,
        })
      );
    });

    expect(reportInvisibleDraftEventMock).not.toHaveBeenCalledWith(
      "draft_takeover_prompt_shown",
      expect.anything()
    );
  });

  it("reports takeover confirmation when authority returns from read only to editor", async () => {
    const { rerender } = render(
      <Harness
        activeDraftId="draft-123"
        editingAuthorityState="read_only"
        lockConflict={createConflict()}
        showTakeoverPrompt
      />
    );

    await waitFor(() => {
      expect(reportInvisibleDraftEventMock).toHaveBeenCalledWith(
        "draft_takeover_prompt_shown",
        expect.objectContaining({
          formSlug: "presentacion",
          source: "session",
          activeDraftIdPresent: true,
        })
      );
    });

    rerender(
      <Harness
        activeDraftId="draft-123"
        editingAuthorityState="editor"
        lockConflict={createConflict()}
      />
    );

    await waitFor(() => {
      expect(reportInvisibleDraftEventMock).toHaveBeenCalledWith(
        "draft_takeover_confirmed",
        expect.objectContaining({
          formSlug: "presentacion",
          source: "session",
          activeDraftIdPresent: true,
        })
      );
    });
  });

  it("returns a suppression reporter tied to the shared telemetry payload", () => {
    render(
      <Harness
        formSlug="contratacion"
        activeDraftId="draft-123"
        editingAuthorityState="checking"
      />
    );

    act(() => {
      latestTelemetry?.reportInvisibleDraftSuppression(
        "save_draft_redirect",
        "session"
      );
    });

    expect(reportInvisibleDraftEventMock).toHaveBeenCalledWith(
      "draft_visible_promotion_suppressed",
      {
        formSlug: "contratacion",
        source: "session",
        activeDraftIdPresent: true,
        lockState: "checking",
        reason: "save_draft_redirect",
      }
    );
  });
});
