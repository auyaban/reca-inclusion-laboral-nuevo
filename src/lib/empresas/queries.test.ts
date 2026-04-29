import { describe, expect, it, vi } from "vitest";
import { applyEmpresaListQuery } from "@/lib/empresas/queries";
import type { EmpresaListParams } from "@/lib/empresas/schemas";

function createQueryMock() {
  const query = {
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
  };
  return query;
}

describe("applyEmpresaListQuery", () => {
  it("filters out soft-deleted rows and applies search/filter/pagination", () => {
    const query = createQueryMock();
    const params: EmpresaListParams = {
      q: "acme",
      page: 2,
      pageSize: 50,
      sort: "nombre_empresa",
      direction: "asc",
      estado: "Activa",
      gestion: "RECA",
      caja: "",
      zona: "",
      asesor: "",
      profesionalId: null,
    };

    applyEmpresaListQuery(query, params);

    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("nombre_empresa.ilike.%acme%")
    );
    expect(query.eq).toHaveBeenCalledWith("estado", "Activa");
    expect(query.eq).toHaveBeenCalledWith("gestion", "RECA");
    expect(query.order).toHaveBeenCalledWith("nombre_empresa", {
      ascending: true,
      nullsFirst: false,
    });
    expect(query.range).toHaveBeenCalledWith(50, 99);
  });

  it("escapes wildcard characters in search terms", () => {
    const query = createQueryMock();
    const params: EmpresaListParams = {
      q: "test_co%",
      page: 1,
      pageSize: 50,
      sort: "updated_at",
      direction: "desc",
      estado: "",
      gestion: "",
      caja: "",
      zona: "",
      asesor: "",
      profesionalId: null,
    };

    applyEmpresaListQuery(query, params);

    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("nombre_empresa.ilike.%test\\_co\\%%")
    );
  });
});
