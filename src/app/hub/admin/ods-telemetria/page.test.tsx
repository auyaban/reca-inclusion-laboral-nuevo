// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OdsTelemetryAdminPage from "@/app/hub/admin/ods-telemetria/page";

const mocks = vi.hoisted(() => ({
  getOdsTelemetriaAdminContextOrRedirect: vi.fn(),
  getOdsTelemetryAdminData: vi.fn(),
}));

vi.mock("@/lib/ods/telemetry/access", () => ({
  getOdsTelemetriaAdminContextOrRedirect:
    mocks.getOdsTelemetriaAdminContextOrRedirect,
}));

vi.mock("@/lib/ods/telemetry/admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ods/telemetry/admin")>()),
  getOdsTelemetryAdminData: mocks.getOdsTelemetryAdminData,
}));

vi.mock("@/components/ods/telemetry/OdsTelemetryAdminView", () => ({
  default: ({ result }: { result: { total: number } }) => (
    <section data-testid="ods-telemetry-admin-view">total:{result.total}</section>
  ),
}));

const context = {
  ok: true,
  user: { id: "user-1", email: "admin@reca.test" },
  profile: {
    id: 1,
    authUserId: "user-1",
    displayName: "Admin",
    usuarioLogin: "aaron_vercel",
    email: "admin@reca.test",
    authPasswordTemp: false,
  },
  roles: ["ods_telemetria_admin"],
};

describe("OdsTelemetryAdminPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("no ejecuta queries si el guard redirige al usuario", async () => {
    mocks.getOdsTelemetriaAdminContextOrRedirect.mockRejectedValue(
      new Error("NEXT_REDIRECT:/hub")
    );

    await expect(
      OdsTelemetryAdminPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("NEXT_REDIRECT:/hub");
    expect(mocks.getOdsTelemetryAdminData).not.toHaveBeenCalled();
  });

  it("renderiza vista para usuario autorizado", async () => {
    mocks.getOdsTelemetriaAdminContextOrRedirect.mockResolvedValue(context);
    mocks.getOdsTelemetryAdminData.mockResolvedValue({
      total: 3,
      items: [],
      page: 1,
      pageSize: 50,
      totalPages: 1,
      metrics: {
        total: 3,
        confirmed: 2,
        pending: 1,
        confirmedPercent: 67,
        pendingPercent: 33,
        accuracy: { confirmedCount: 2, fields: [] },
        topMismatchFields: [],
        topMismatchScanCapped: false,
        topMismatchTotal: 0,
      },
    });

    render(
      await OdsTelemetryAdminPage({
        searchParams: Promise.resolve({ origin: ["manual", "acta_pdf"] }),
      })
    );

    expect(screen.getByTestId("ods-telemetry-admin-view").textContent).toBe(
      "total:3"
    );
    expect(mocks.getOdsTelemetryAdminData).toHaveBeenCalled();
  });
});
