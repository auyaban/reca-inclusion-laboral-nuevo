import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserContext: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

import { GET } from "@/app/api/auth/me/route";

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authenticated professional profile and app roles", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: {
        id: "auth-user-1",
        email: "sara@reca.test",
      },
      profile: {
        id: 7,
        authUserId: "auth-user-1",
        displayName: "Sara Zambrano",
        usuarioLogin: "sarazambrano",
        email: "sara@reca.test",
        authPasswordTemp: true,
      },
      roles: ["inclusion_empresas_admin"],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=60, stale-while-revalidate=120"
    );
    await expect(response.json()).resolves.toEqual({
      authUserId: "auth-user-1",
      email: "sara@reca.test",
      displayName: "Sara Zambrano",
      usuarioLogin: "sarazambrano",
      profesionalId: 7,
      roles: ["inclusion_empresas_admin"],
      rolesDisplay: ["Admin Inclusión"],
      authPasswordTemp: true,
    });
  });

  it("returns the context error status when the user cannot be resolved", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: false,
      status: 401,
      error: "No autenticado.",
    });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado.",
    });
  });

  it("returns 500 when the current profile lookup fails unexpectedly", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.getCurrentUserContext.mockRejectedValue(new Error("database failed"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Error interno del servidor.",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[api/auth/me] failed",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
