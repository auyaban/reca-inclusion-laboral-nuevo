import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerClientMock,
  getUserMock,
  createAdminClientMock,
  enforceInterpretesCatalogRateLimitMock,
  adminFromMock,
  adminSelectMock,
  adminIsMock,
  adminOrderMock,
  adminEqMock,
  adminInsertMock,
  adminInsertSelectMock,
  adminSingleMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getUserMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  enforceInterpretesCatalogRateLimitMock: vi.fn(),
  adminFromMock: vi.fn(),
  adminSelectMock: vi.fn(),
  adminIsMock: vi.fn(),
  adminOrderMock: vi.fn(),
  adminEqMock: vi.fn(),
  adminInsertMock: vi.fn(),
  adminInsertSelectMock: vi.fn(),
  adminSingleMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createServerClientMock,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createAdminClientMock,
}));

vi.mock("@/lib/security/interpretesCatalogRateLimit", () => ({
  enforceInterpretesCatalogRateLimit: enforceInterpretesCatalogRateLimitMock,
}));

import { GET, POST } from "@/app/api/interpretes/route";

function buildPostRequest(body: unknown) {
  return new Request("http://localhost/api/interpretes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("/api/interpretes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    enforceInterpretesCatalogRateLimitMock.mockResolvedValue({
      allowed: true,
      backend: "memory",
      remaining: 4,
    });

    adminOrderMock.mockResolvedValue({
      data: [],
      error: null,
    });
    adminEqMock.mockResolvedValue({
      data: [],
      error: null,
    });
    adminSingleMock.mockResolvedValue({
      data: { id: "interp-2", nombre: "Nuevo Interprete" },
      error: null,
    });

    adminIsMock.mockReturnValue({
      order: adminOrderMock,
      eq: adminEqMock,
    });
    adminSelectMock.mockReturnValue({
      is: adminIsMock,
      order: adminOrderMock,
      eq: adminEqMock,
    });
    adminInsertSelectMock.mockReturnValue({
      single: adminSingleMock,
    });
    adminInsertMock.mockReturnValue({
      select: adminInsertSelectMock,
    });
    adminFromMock.mockReturnValue({
      select: adminSelectMock,
      insert: adminInsertMock,
    });
    createAdminClientMock.mockReturnValue({
      from: adminFromMock,
    });
  });

  it("returns 401 on GET when the user is not authenticated", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns the sorted interprete catalog on GET", async () => {
    adminOrderMock.mockResolvedValue({
      data: [
        { id: "interp-2", nombre: "Zulu" },
        { id: "interp-1", nombre: "Ana" },
      ],
      error: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "interp-1", nombre: "Ana" },
      { id: "interp-2", nombre: "Zulu" },
    ]);
    expect(adminFromMock).toHaveBeenCalledWith("interpretes");
    expect(adminIsMock).toHaveBeenCalledWith("deleted_at", null);
  });

  it("returns 400 on POST when the name is empty", async () => {
    const response = await POST(buildPostRequest({ nombre: "   " }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "El nombre del interprete es obligatorio.",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns 429 on POST when the rate limit blocks creation", async () => {
    enforceInterpretesCatalogRateLimitMock.mockResolvedValueOnce({
      allowed: false,
      backend: "memory",
      error:
        "Demasiados intentos de crear interpretes. Intenta de nuevo en unos segundos.",
      status: 429,
      retryAfterSeconds: 42,
    });

    const response = await POST(buildPostRequest({ nombre: "Laura Gaitan" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    await expect(response.json()).resolves.toEqual({
      error:
        "Demasiados intentos de crear interpretes. Intenta de nuevo en unos segundos.",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns the existing interprete when the normalized name already exists", async () => {
    adminEqMock.mockResolvedValue({
      data: [{ id: "interp-1", nombre: "Ana Perez" }],
      error: null,
    });

    const response = await POST(buildPostRequest({ nombre: " ana   perez " }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "interp-1",
      nombre: "Ana Perez",
    });
    expect(adminInsertMock).not.toHaveBeenCalled();
    expect(adminEqMock).toHaveBeenCalledWith("nombre_key", "ana perez");
  });

  it("creates a new interprete when the name is valid and unique", async () => {
    adminSingleMock.mockResolvedValue({
      data: { id: "interp-3", nombre: "Laura Gaitan" },
      error: null,
    });

    const response = await POST(buildPostRequest({ nombre: "Laura Gaitan" }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "interp-3",
      nombre: "Laura Gaitan",
    });
    expect(adminInsertMock).toHaveBeenCalledWith({
      nombre: "Laura Gaitan",
      nombre_key: "laura gaitan",
    });
  });

  it("deduplicates exact wildcard names without treating them as patterns", async () => {
    adminEqMock.mockResolvedValue({
      data: [{ id: "interp-4", nombre: "Ana_% Perez" }],
      error: null,
    });

    const response = await POST(buildPostRequest({ nombre: " Ana_%   Perez " }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "interp-4",
      nombre: "Ana_% Perez",
    });
    expect(adminEqMock).toHaveBeenCalledWith("nombre_key", "ana_% perez");
  });

  it("recovers the existing interprete when the unique index wins a concurrent insert", async () => {
    adminSingleMock.mockResolvedValueOnce({
      data: null,
      error: { code: "23505" },
    });
    adminEqMock
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: "interp-5", nombre: "Laura Gaitan" }],
        error: null,
      });

    const response = await POST(buildPostRequest({ nombre: "Laura Gaitan" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "interp-5",
      nombre: "Laura Gaitan",
    });
  });
});
