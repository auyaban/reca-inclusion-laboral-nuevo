import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { NextResponse } from "next/server";
import { GET } from "@/app/api/empresas/search/route";

type EmpresaSearchRow = {
  id: string;
  nombre_empresa: string | null;
  nit_empresa: string | null;
  deleted_at?: string | null;
};

function stubOkAuthorization() {
  return {
    ok: true as const,
    context: {
      user: { id: "user-1" },
      profile: { id: "profile-1", displayName: "Profesional Uno" },
    },
  };
}

function stubForbiddenAuthorization() {
  return {
    ok: false as const,
    response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
  };
}

function stubEmpresaSearch(rows: EmpresaSearchRow[], error: unknown = null) {
  const chains: Array<ReturnType<typeof createChain>> = [];

  function createChain() {
    let ilikeField: "nombre_empresa" | "nit_empresa" | null = null;
    let ilikePattern = "";
    const chain = {
      select: vi.fn(() => chain),
      is: vi.fn(() => chain),
      ilike: vi.fn((field: "nombre_empresa" | "nit_empresa", pattern: string) => {
        ilikeField = field;
        ilikePattern = pattern;
        return chain;
      }),
      order: vi.fn(() => chain),
      limit: vi.fn(async () => {
        if (error) {
          return { data: null, error };
        }

        const term = ilikePattern.replaceAll("%", "").toLowerCase();
        return {
          data: rows.filter((row) => {
            if (row.deleted_at) {
              return false;
            }
            if (!ilikeField) {
              return true;
            }
            return String(row[ilikeField] ?? "").toLowerCase().includes(term);
          }),
          error: null,
        };
      }),
    };

    return chain;
  }

  mocks.createClient.mockResolvedValue({
    from: vi.fn(() => {
      const chain = createChain();
      chains.push(chain);
      return chain;
    }),
  });

  return chains;
}

describe("GET /api/empresas/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
    stubEmpresaSearch([]);
  });

  it("requires an authenticated app role", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());

    const response = await GET(
      new Request("http://localhost/api/empresas/search?q=Empresa")
    );

    expect(response.status).toBe(403);
  });

  it("returns active empresa matches by nombre or NIT", async () => {
    const chains = stubEmpresaSearch([
      {
        id: "empresa-1",
        nombre_empresa: "Empresa Uno SAS",
        nit_empresa: "900123456-1",
        deleted_at: null,
      },
      {
        id: "empresa-2",
        nombre_empresa: "Empresa Eliminada SAS",
        nit_empresa: "900123456-2",
        deleted_at: "2026-01-01",
      },
      {
        id: "empresa-3",
        nombre_empresa: "Otra Empresa SAS",
        nit_empresa: "800555123-0",
        deleted_at: null,
      },
    ]);

    const responseByName = await GET(
      new Request("http://localhost/api/empresas/search?q=Empresa%20Uno")
    );
    const responseByNit = await GET(
      new Request("http://localhost/api/empresas/search?q=800555")
    );

    await expect(responseByName.json()).resolves.toMatchObject({
      items: [{ id: "empresa-1" }],
    });
    await expect(responseByNit.json()).resolves.toMatchObject({
      items: [{ id: "empresa-3" }],
    });
    expect(mocks.requireAppRole).toHaveBeenCalledWith([
      "inclusion_empresas_admin",
      "inclusion_empresas_profesional",
      "ods_operador",
    ]);
    expect(chains[0]?.is).toHaveBeenCalledWith("deleted_at", null);
    expect(chains[0]?.ilike).toHaveBeenCalledWith(
      "nombre_empresa",
      "%Empresa Uno%"
    );
    expect(chains[1]?.ilike).toHaveBeenCalledWith(
      "nit_empresa",
      "%Empresa Uno%"
    );
    expect(chains[0]?.limit).toHaveBeenCalledWith(20);
  });

  it("short-circuits short queries with an empty result", async () => {
    const response = await GET(
      new Request("http://localhost/api/empresas/search?q=E")
    );

    await expect(response.json()).resolves.toEqual({ items: [] });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns a 500 error response when the lookup fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    stubEmpresaSearch([], new Error("lookup failed"));

    try {
      const response = await GET(
        new Request("http://localhost/api/empresas/search?q=Empresa")
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Error interno del servidor.",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[api/empresas/search.get] failed",
        expect.any(Error)
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
