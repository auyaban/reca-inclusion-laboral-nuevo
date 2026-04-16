import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";

const {
  createClientMock,
  getUserMock,
  searchUsuariosRecaByCedulaPrefixMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  searchUsuariosRecaByCedulaPrefixMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/usuariosRecaServer", () => ({
  searchUsuariosRecaByCedulaPrefix: searchUsuariosRecaByCedulaPrefixMock,
}));

import { GET } from "@/app/api/usuarios-reca/route";

describe("GET /api/usuarios-reca", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    searchUsuariosRecaByCedulaPrefixMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when the user is not authenticated", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET(
      new Request("http://localhost/api/usuarios-reca?query=123")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado",
    });
    expect(searchUsuariosRecaByCedulaPrefixMock).not.toHaveBeenCalled();
  });

  it("allows requests through the server-side E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    searchUsuariosRecaByCedulaPrefixMock.mockResolvedValue([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana Perez",
      },
    ]);
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new Request("http://localhost/api/usuarios-reca?query=123", {
      headers: {
        cookie: `${E2E_AUTH_BYPASS_COOKIE}=1`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana Perez",
      },
    ]);
    expect(searchUsuariosRecaByCedulaPrefixMock).toHaveBeenCalledWith("123");
  });

  it("returns an empty array and skips lookup for queries shorter than 3 digits", async () => {
    const response = await GET(
      new Request("http://localhost/api/usuarios-reca?query=12")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(searchUsuariosRecaByCedulaPrefixMock).not.toHaveBeenCalled();
  });

  it("returns suggestions for a valid cédula prefix", async () => {
    searchUsuariosRecaByCedulaPrefixMock.mockResolvedValue([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana Perez",
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/usuarios-reca?query=123")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana Perez",
      },
    ]);
    expect(searchUsuariosRecaByCedulaPrefixMock).toHaveBeenCalledWith("123");
  });
});
