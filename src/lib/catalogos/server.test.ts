import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.admin,
}));

import {
  CatalogoServerError,
  createCatalogoRecord,
  deleteCatalogoRecord,
  listCatalogoRecords,
  restoreCatalogoRecord,
  updateCatalogoRecord,
} from "@/lib/catalogos/server";

function createQueryMock(result: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  const chain = () => query;

  for (const method of [
    "select",
    "is",
    "not",
    "or",
    "eq",
    "order",
    "range",
    "insert",
    "update",
    "single",
  ]) {
    query[method] = vi.fn(chain);
  }

  query.then = vi.fn((resolve) => Promise.resolve(resolve(result)));
  return query;
}

describe("catalogos server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excluye eliminados del listado normal", async () => {
    const query = createQueryMock({
      data: [{ id: "1", nombre: "Carlos Ruiz", deleted_at: null }],
      error: null,
      count: 1,
    });
    const from = vi.fn(() => query);
    mocks.admin.mockReturnValue({ from });

    const result = await listCatalogoRecords({
      kind: "asesores",
      params: {
        q: "",
        estado: "activos",
        sort: "nombre",
        direction: "asc",
        page: 1,
        pageSize: 50,
      },
    });

    expect(from).toHaveBeenCalledWith("asesores");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result.total).toBe(1);
  });

  it("crea registros normalizados", async () => {
    const query = createQueryMock({
      data: { id: "1", nombre: "Carlos Ruiz", deleted_at: null },
      error: null,
    });
    const from = vi.fn(() => query);
    mocks.admin.mockReturnValue({ from });

    await createCatalogoRecord({
      kind: "asesores",
      input: {
        nombre: " carlos   ruiz ",
        email: " CARLOS@TEST.COM ",
        telefono: "300 123 4567",
      },
    });

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Carlos Ruiz",
        email: "carlos@test.com",
        telefono: "3001234567",
      })
    );
  });

  it("hace soft delete y restauración por id", async () => {
    const deleteQuery = createQueryMock({
      data: { id: "1", nombre: "Carlos Ruiz", deleted_at: "2026-04-29" },
      error: null,
    });
    const restoreQuery = createQueryMock({
      data: { id: "1", nombre: "Carlos Ruiz", deleted_at: null },
      error: null,
    });
    const from = vi.fn().mockReturnValueOnce(deleteQuery).mockReturnValueOnce(restoreQuery);
    mocks.admin.mockReturnValue({ from });

    await deleteCatalogoRecord({ kind: "asesores", id: "1" });
    await restoreCatalogoRecord({ kind: "asesores", id: "1" });

    expect(deleteQuery.update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
    });
    expect(restoreQuery.update).toHaveBeenCalledWith({ deleted_at: null });
  });

  it("devuelve error 404 cuando una mutación no encuentra el registro", async () => {
    const errorResult = {
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    };
    const updateQuery = createQueryMock(errorResult);
    const deleteQuery = createQueryMock(errorResult);
    const restoreQuery = createQueryMock(errorResult);
    const from = vi
      .fn()
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(deleteQuery)
      .mockReturnValueOnce(restoreQuery);
    mocks.admin.mockReturnValue({ from });

    await expect(
      updateCatalogoRecord({
        kind: "gestores",
        id: "missing",
        input: { nombre: "Laura Mora" },
      })
    ).rejects.toMatchObject<CatalogoServerError>({
      status: 404,
      message: "Registro no encontrado.",
    });
    await expect(
      deleteCatalogoRecord({ kind: "gestores", id: "missing" })
    ).rejects.toMatchObject<CatalogoServerError>({
      status: 404,
      message: "Registro no encontrado.",
    });
    await expect(
      restoreCatalogoRecord({ kind: "gestores", id: "missing" })
    ).rejects.toMatchObject<CatalogoServerError>({
      status: 404,
      message: "Registro no encontrado.",
    });
  });
});
