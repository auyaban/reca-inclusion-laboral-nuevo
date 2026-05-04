import { describe, expect, it, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";

const mocks = vi.hoisted(() => ({
  getCurrentUserContext: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("@/lib/auth/roles", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

const baseContext = {
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
  roles: [],
};

describe("getOdsTelemetriaAdminContextOrRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige sesiones no autenticadas o caducadas", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({ ok: false });
    const { getOdsTelemetriaAdminContextOrRedirect } = await import(
      "@/lib/ods/telemetry/access"
    );

    await expect(getOdsTelemetriaAdminContextOrRedirect()).rejects.toThrow(
      "NEXT_REDIRECT:/hub"
    );
    expect(redirect).toHaveBeenCalledWith("/hub");
  });

  it("redirige usuarios sin rol ods_telemetria_admin", async () => {
    mocks.getCurrentUserContext.mockResolvedValue(baseContext);
    const { getOdsTelemetriaAdminContextOrRedirect } = await import(
      "@/lib/ods/telemetry/access"
    );

    await expect(getOdsTelemetriaAdminContextOrRedirect()).rejects.toThrow(
      "NEXT_REDIRECT:/hub"
    );
    expect(redirect).toHaveBeenCalledWith("/hub");
  });

  it("retorna contexto para admins de telemetria", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ...baseContext,
      roles: ["ods_telemetria_admin"],
    });
    const { getOdsTelemetriaAdminContextOrRedirect } = await import(
      "@/lib/ods/telemetry/access"
    );

    await expect(getOdsTelemetriaAdminContextOrRedirect()).resolves.toMatchObject({
      ok: true,
      profile: { usuarioLogin: "aaron_vercel" },
      roles: ["ods_telemetria_admin"],
    });
  });
});
