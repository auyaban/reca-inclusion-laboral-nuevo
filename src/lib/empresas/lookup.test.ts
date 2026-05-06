import { describe, expect, it, vi } from "vitest";
import {
  getFirstActiveEmpresaByNit,
  listActiveEmpresasByNit,
  searchActiveEmpresasByNombreOrNit,
} from "@/lib/empresas/lookup";

type EmpresaLookupRow = {
  id: string;
  nombre_empresa: string | null;
  nit_empresa: string | null;
  deleted_at?: string | null;
};

function createLookupClient(rows: EmpresaLookupRow[], error: unknown = null) {
  const orderCalls: Array<[string, { ascending?: boolean } | undefined]> = [];
  const chains: Array<ReturnType<typeof createChain>> = [];

  function createChain() {
    let nitFilter: string | null = null;
    let ilikeField: "nombre_empresa" | "nit_empresa" | null = null;
    let ilikePattern = "";
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn((_field: string, value: string) => {
        nitFilter = value;
        return chain;
      }),
      is: vi.fn(() => chain),
      ilike: vi.fn((field: "nombre_empresa" | "nit_empresa", pattern: string) => {
        ilikeField = field;
        ilikePattern = pattern;
        return chain;
      }),
      order: vi.fn((field: string, options?: { ascending?: boolean }) => {
        orderCalls.push([field, options]);
        return chain;
      }),
      limit: vi.fn(async (count: number) => {
        if (error) {
          return { data: null, error };
        }

        const term = ilikePattern.replaceAll("%", "").toLowerCase();
        const filtered = rows
          .filter((row) => !row.deleted_at)
          .filter((row) => {
            if (nitFilter) {
              return row.nit_empresa === nitFilter;
            }
            if (ilikeField) {
              return String(row[ilikeField] ?? "").toLowerCase().includes(term);
            }
            return true;
          })
          .sort((left, right) => {
            const byName = String(left.nombre_empresa ?? "").localeCompare(
              String(right.nombre_empresa ?? "")
            );
            return byName || left.id.localeCompare(right.id);
          })
          .slice(0, count);

        return { data: filtered, error: null };
      }),
    };

    return chain;
  }

  return {
    client: {
      from: vi.fn(() => {
        const chain = createChain();
        chains.push(chain);
        return chain;
      }),
    },
    chains,
    orderCalls,
  };
}

describe("empresa lookup helpers", () => {
  it("searches active empresas by nombre or NIT", async () => {
    const { client, chains } = createLookupClient([
      { id: "empresa-1", nombre_empresa: "Empresa Uno SAS", nit_empresa: "900123" },
      { id: "empresa-2", nombre_empresa: "Empresa Dos SAS", nit_empresa: "800555" },
      {
        id: "empresa-3",
        nombre_empresa: "Empresa Eliminada SAS",
        nit_empresa: "900999",
        deleted_at: "2026-01-01",
      },
    ]);

    await expect(searchActiveEmpresasByNombreOrNit(client, "800")).resolves.toEqual([
      expect.objectContaining({ id: "empresa-2" }),
    ]);
    expect(chains).toHaveLength(2);
    expect(chains[0]?.ilike).toHaveBeenCalledWith("nombre_empresa", "%800%");
    expect(chains[1]?.ilike).toHaveBeenCalledWith("nit_empresa", "%800%");
  });

  it("does not interpolate search text into raw PostgREST filters", async () => {
    const { client, chains } = createLookupClient([
      {
        id: "empresa-1",
        nombre_empresa: "Empresa (Uno), SAS",
        nit_empresa: "900123",
      },
    ]);

    await expect(
      searchActiveEmpresasByNombreOrNit(client, "Empresa (Uno), SAS")
    ).resolves.toEqual([expect.objectContaining({ id: "empresa-1" })]);
    expect(chains[0]?.ilike).toHaveBeenCalledWith(
      "nombre_empresa",
      "%Empresa (Uno), SAS%"
    );
    expect(chains[1]?.ilike).toHaveBeenCalledWith(
      "nit_empresa",
      "%Empresa (Uno), SAS%"
    );
  });

  it("lists active empresas for a NIT without collapsing duplicates", async () => {
    const { client } = createLookupClient([
      { id: "empresa-b", nombre_empresa: "Zeta SAS", nit_empresa: "900123" },
      { id: "empresa-a", nombre_empresa: "Alfa SAS", nit_empresa: "900123" },
      { id: "empresa-x", nombre_empresa: "Inactiva SAS", nit_empresa: "900123", deleted_at: "x" },
    ]);

    await expect(listActiveEmpresasByNit(client, "900123")).resolves.toEqual([
      expect.objectContaining({ id: "empresa-a" }),
      expect.objectContaining({ id: "empresa-b" }),
    ]);
  });

  it("returns the first active empresa deterministically for single-row consumers", async () => {
    const { client, orderCalls } = createLookupClient([
      { id: "empresa-b", nombre_empresa: "Zeta SAS", nit_empresa: "900123" },
      { id: "empresa-a", nombre_empresa: "Alfa SAS", nit_empresa: "900123" },
    ]);

    await expect(getFirstActiveEmpresaByNit(client, "900123")).resolves.toEqual(
      expect.objectContaining({ id: "empresa-a", nombre_empresa: "Alfa SAS" })
    );
    expect(orderCalls).toEqual([
      ["nombre_empresa", { ascending: true }],
      ["id", { ascending: true }],
    ]);
  });

  it("returns null when no active empresa exists for the NIT", async () => {
    const { client } = createLookupClient([
      { id: "empresa-x", nombre_empresa: "Inactiva SAS", nit_empresa: "900123", deleted_at: "x" },
    ]);

    await expect(getFirstActiveEmpresaByNit(client, "900123")).resolves.toBeNull();
  });

  it("propagates Supabase lookup errors", async () => {
    const lookupError = new Error("supabase unavailable");
    const { client } = createLookupClient([], lookupError);

    await expect(listActiveEmpresasByNit(client, "900123")).rejects.toThrow(
      "supabase unavailable"
    );
  });
});
