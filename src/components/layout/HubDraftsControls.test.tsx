// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HubDraftsControls from "@/components/layout/HubDraftsControls";

const { useDraftsHubMock } = vi.hoisted(() => ({
  useDraftsHubMock: vi.fn(),
}));

const { sendProductAnalyticsEventMock } = vi.hoisted(() => ({
  sendProductAnalyticsEventMock: vi.fn(),
}));

const { replaceMock, pathnameMock, searchParamsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pathnameMock: vi.fn(),
  searchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => pathnameMock(),
  useSearchParams: () => new URLSearchParams(searchParamsMock()),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    return function DynamicDraftsHubMock({ open }: { open: boolean }) {
      return (
        <div data-testid="drafts-hub-mock" data-open={String(open)}>
          {open ? (
            <>
              <p>Borradores guardados</p>
              <p>No tienes borradores guardados.</p>
            </>
          ) : null}
        </div>
      );
    };
  },
}));

vi.mock("@/hooks/useDraftsHub", () => ({
  useDraftsHub: useDraftsHubMock,
}));

vi.mock("@/lib/analytics/productAnalytics", () => ({
  sendProductAnalyticsEvent: sendProductAnalyticsEventMock,
}));

describe("HubDraftsControls", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/hub");
    searchParamsMock.mockReturnValue("");

    useDraftsHubMock.mockReturnValue({
      hubDrafts: [],
      draftsCount: 0,
      loading: false,
      deleteHubDraft: vi.fn(),
    });
  });

  it("shows the server-seeded draft count", () => {
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

    useDraftsHubMock.mockReturnValue({
      hubDrafts: initialRemoteDrafts,
      draftsCount: 1,
      loading: false,
      deleteHubDraft: vi.fn(),
    });

    render(
      <HubDraftsControls
        initialRemoteDrafts={initialRemoteDrafts}
      />
    );

    expect(screen.getByText("Borradores (1)")).toBeTruthy();
    expect(useDraftsHubMock).toHaveBeenCalledWith({
      initialRemoteDrafts,
      initialRemoteReady: true,
    });
  });

  it("opens the drafts drawer from the seeded query-param state", () => {
    searchParamsMock.mockReturnValue("panel=drafts");

    render(
      <HubDraftsControls
        initialRemoteDrafts={[]}
      />
    );

    expect(screen.getByTestId("drafts-hub-mock").getAttribute("data-open")).toBe(
      "true"
    );
    expect(screen.getByText("Borradores guardados")).toBeTruthy();
  });

  it("keeps the drafts hub mounted after closing so the drawer can animate out", () => {
    render(
      <HubDraftsControls
        initialRemoteDrafts={[]}
      />
    );

    expect(screen.queryByTestId("drafts-hub-mock")).toBeNull();

    fireEvent.click(screen.getByTestId("hub-drafts-button"));

    expect(screen.getByTestId("drafts-hub-mock").getAttribute("data-open")).toBe(
      "true"
    );
    expect(screen.getByText("Borradores guardados")).toBeTruthy();

    fireEvent.click(screen.getByTestId("hub-drafts-button"));

    expect(screen.getByTestId("drafts-hub-mock").getAttribute("data-open")).toBe(
      "false"
    );
    expect(screen.queryByText("Borradores guardados")).toBeNull();
  });

  it("captures the drafts panel open event only when the user opens it", () => {
    useDraftsHubMock.mockReturnValue({
      hubDrafts: [],
      draftsCount: 2,
      loading: false,
      deleteHubDraft: vi.fn(),
    });

    render(
      <HubDraftsControls
        initialRemoteDrafts={[]}
      />
    );

    expect(sendProductAnalyticsEventMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("hub-drafts-button"));

    expect(sendProductAnalyticsEventMock).toHaveBeenCalledWith({
      event: "drafts_panel_opened",
      properties: {
        source: "hub",
        draft_count: 2,
      },
    });

    fireEvent.click(screen.getByTestId("hub-drafts-button"));

    expect(sendProductAnalyticsEventMock).toHaveBeenCalledTimes(1);
  });

  it("preserves the current hub route when opening and closing drafts", () => {
    pathnameMock.mockReturnValue("/hub/empresas");
    searchParamsMock.mockReturnValue("tab=mis");

    render(<HubDraftsControls initialRemoteDrafts={[]} />);

    fireEvent.click(screen.getByTestId("hub-drafts-button"));

    expect(replaceMock).toHaveBeenCalledWith("/hub/empresas?tab=mis&panel=drafts", {
      scroll: false,
    });

    searchParamsMock.mockReturnValue("tab=mis&panel=drafts");
    fireEvent.click(screen.getByTestId("hub-drafts-button"));

    expect(replaceMock).toHaveBeenLastCalledWith("/hub/empresas?tab=mis", {
      scroll: false,
    });
  });
});
