import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerClientMock,
  getUserMock,
  createAdminClientMock,
  adminFromMock,
  adminSelectMock,
  adminOrderMock,
  adminIlikeMock,
  adminInsertMock,
  adminInsertSelectMock,
  adminSingleMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getUserMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  adminFromMock: vi.fn(),
  adminSelectMock: vi.fn(),
  adminOrderMock: vi.fn(),
  adminIlikeMock: vi.fn(),
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

    adminOrderMock.mockResolvedValue({
      data: [],
      error: null,
    });
    adminIlikeMock.mockResolvedValue({
      data: [],
      error: null,
    });
    adminSingleMock.mockResolvedValue({
      data: { id: "interp-2", nombre: "Nuevo Interprete" },
      error: null,
    });

    adminSelectMock.mockReturnValue({
      order: adminOrderMock,
      ilike: adminIlikeMock,
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
  });

  it("returns 400 on POST when the name is empty", async () => {
    const response = await POST(buildPostRequest({ nombre: "   " }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "El nombre del interprete es obligatorio.",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns the existing interprete when the normalized name already exists", async () => {
    adminIlikeMock.mockResolvedValue({
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
    });
  });
});
