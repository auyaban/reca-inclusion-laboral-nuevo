import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getCurrentUserContext: vi.fn(),
  markTemporaryPasswordChanged: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/auth/roles", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

vi.mock("@/lib/profesionales/server", () => ({
  markTemporaryPasswordChanged: mocks.markTemporaryPasswordChanged,
}));

import { POST } from "@/app/api/auth/cambiar-contrasena-temporal/route";

function installSession(options: { user?: { id: string } | null } = {}) {
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  const refreshSession = vi.fn().mockResolvedValue({ error: null });
  const user = Object.prototype.hasOwnProperty.call(options, "user")
    ? options.user
    : { id: "auth-user-1" };
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      updateUser,
      refreshSession,
    },
  });

  return { updateUser, refreshSession };
}

describe("/api/auth/cambiar-contrasena-temporal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", email: "sara@reca.test" },
      profile: {
        id: 7,
        authUserId: "auth-user-1",
        displayName: "Sara Zambrano",
        usuarioLogin: "sara_zambrano",
        email: "sara@reca.test",
        authPasswordTemp: true,
      },
      roles: ["inclusion_empresas_profesional"],
    });
  });

  it("returns 401 when there is no authenticated user", async () => {
    installSession({ user: null });

    const response = await POST(
      new Request("http://localhost/api/auth/cambiar-contrasena-temporal", {
        method: "POST",
        body: JSON.stringify({
          password: "NuevaClave123!",
          confirmPassword: "NuevaClave123!",
        }),
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.markTemporaryPasswordChanged).not.toHaveBeenCalled();
  });

  it("rejects weak final passwords", async () => {
    const { updateUser } = installSession();

    const response = await POST(
      new Request("http://localhost/api/auth/cambiar-contrasena-temporal", {
        method: "POST",
        body: JSON.stringify({
          password: "12345678",
          confirmPassword: "12345678",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates Auth, clears the temporary flag and refreshes the session", async () => {
    const { updateUser, refreshSession } = installSession();

    const response = await POST(
      new Request("http://localhost/api/auth/cambiar-contrasena-temporal", {
        method: "POST",
        body: JSON.stringify({
          password: "NuevaClave123!",
          confirmPassword: "NuevaClave123!",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(updateUser).toHaveBeenCalledWith({ password: "NuevaClave123!" });
    expect(mocks.markTemporaryPasswordChanged).toHaveBeenCalledWith({
      authUserId: "auth-user-1",
      profesionalId: 7,
    });
    expect(refreshSession).toHaveBeenCalled();
  });
});
