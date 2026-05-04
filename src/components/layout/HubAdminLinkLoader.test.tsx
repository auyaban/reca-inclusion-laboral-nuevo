// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HubAdminLinkLoader from "@/components/layout/HubAdminLinkLoader";

const mocks = vi.hoisted(() => ({
  getHubAdminData: vi.fn(),
}));

vi.mock("@/lib/drafts/hubInitialData", () => ({
  getHubAdminData: mocks.getHubAdminData,
}));

describe("HubAdminLinkLoader", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("mantiene link de borradores para admins existentes", async () => {
    mocks.getHubAdminData.mockResolvedValue({ initialCanManageDraftCleanup: true });

    render(await HubAdminLinkLoader({ user: null, roles: [] }));

    expect(screen.getByTestId("hub-admin-draft-cleanup-link")).toBeTruthy();
    expect(screen.queryByTestId("hub-admin-ods-telemetry-link")).toBeNull();
  });

  it("muestra link de telemetria ODS para ods_telemetria_admin", async () => {
    mocks.getHubAdminData.mockResolvedValue({ initialCanManageDraftCleanup: false });

    render(
      await HubAdminLinkLoader({
        user: null,
        roles: ["ods_telemetria_admin"],
      })
    );

    const link = screen.getByTestId("hub-admin-ods-telemetry-link");
    expect(link.getAttribute("href")).toBe("/hub/admin/ods-telemetria");
  });
});
