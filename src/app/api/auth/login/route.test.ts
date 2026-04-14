import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdminClientMock,
  createServerClientMock,
  enforceAuthLookupRateLimitMock,
  adminFromMock,
  adminSelectMock,
  adminIlikeMock,
  adminMaybeSingleMock,
  signInWithPasswordMock,
} = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  createServerClientMock: vi.fn(),
  enforceAuthLookupRateLimitMock: vi.fn(),
  adminFromMock: vi.fn(),
  adminSelectMock: vi.fn(),
  adminIlikeMock: vi.fn(),
  adminMaybeSingleMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createAdminClientMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createServerClientMock,
}));

vi.mock("@/lib/security/authLookupRateLimit", () => ({
  enforceAuthLookupRateLimit: enforceAuthLookupRateLimitMock,
}));

import { POST } from "@/app/api/auth/login/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    enforceAuthLookupRateLimitMock.mockResolvedValue({
      allowed: true,
      backend: "memory",
      remaining: 9,
    });

    adminIlikeMock.mockReturnValue({
      maybeSingle: adminMaybeSingleMock,
    });
    adminSelectMock.mockReturnValue({
      ilike: adminIlikeMock,
    });
    adminFromMock.mockReturnValue({
      select: adminSelectMock,
    });
    createAdminClientMock.mockReturnValue({
      from: adminFromMock,
    });

    adminMaybeSingleMock.mockResolvedValue({
      data: { correo_profesional: "aaron@example.com" },
      error: null,
    });

    signInWithPasswordMock.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        session: { access_token: "token" },
      },
      error: null,
    });
    createServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: signInWithPasswordMock,
      },
    });
  });

  it("returns 400 when the request body is invalid", async () => {
    const response = await POST(
      buildRequest({ usuario_login: "aaron_vercel" })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Solicitud inválida.",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("enforces the rate limit before parsing the request body", async () => {
    enforceAuthLookupRateLimitMock.mockResolvedValue({
      allowed: false,
      backend: "memory",
      error: "Demasiados intentos. Intenta de nuevo más tarde.",
      status: 429,
      retryAfterSeconds: 4,
    });

    const json = vi.fn();
    const response = await POST({
      headers: new Headers(),
      json,
    } as unknown as Request);

    expect(json).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("4");
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns 503 when auth is temporarily unavailable", async () => {
    enforceAuthLookupRateLimitMock.mockResolvedValue({
      allowed: false,
      backend: "unavailable",
      error: "Servicio temporalmente no disponible.",
      status: 503,
      retryAfterSeconds: null,
    });

    const response = await POST(
      buildRequest({
        usuario_login: "aaron_vercel",
        password: "Password1234",
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Servicio temporalmente no disponible.",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the username does not resolve to a professional email", async () => {
    adminMaybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    const response = await POST(
      buildRequest({
        usuario_login: "aaron_vercel",
        password: "Password1234",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Usuario o contraseña incorrectos.",
    });
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the password is incorrect", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: new Error("Invalid login credentials"),
    });

    const response = await POST(
      buildRequest({
        usuario_login: "aaron_vercel",
        password: "Password1234",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Usuario o contraseña incorrectos.",
    });
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "aaron@example.com",
      password: "Password1234",
    });
  });

  it("returns 200 and authenticates server-side for valid credentials", async () => {
    const response = await POST(
      buildRequest({
        usuario_login: "aaron_vercel",
        password: "Password1234",
      })
    );

    expect(createServerClientMock).toHaveBeenCalledOnce();
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "aaron@example.com",
      password: "Password1234",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
