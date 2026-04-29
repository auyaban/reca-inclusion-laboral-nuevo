import { describe, expect, it } from "vitest";
import {
  createEmpresaSchema,
  parseEmpresaListParams,
  updateEmpresaSchema,
} from "@/lib/empresas/schemas";

describe("empresa schemas", () => {
  it("normalizes create payloads and applies the default estado", () => {
    const parsed = createEmpresaSchema.parse({
      nombre_empresa: "  ACME SAS  ",
      gestion: "RECA",
      nit_empresa: "",
      profesional_asignado_id: "",
    });

    expect(parsed).toMatchObject({
      nombre_empresa: "ACME SAS",
      gestion: "RECA",
      estado: "En Proceso",
      nit_empresa: null,
      profesional_asignado_id: null,
    });
  });

  it("requires a comment when estado changes", () => {
    const result = updateEmpresaSchema.safeParse({
      nombre_empresa: "ACME SAS",
      gestion: "RECA",
      estado: "Cerrada",
      previous_estado: "Activa",
      comentario: " ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.comentario).toContain(
        "El comentario es obligatorio cuando cambia el estado."
      );
    }
  });

  it("clamps list pagination and ignores unsupported sort fields", () => {
    const parsed = parseEmpresaListParams(
      new URLSearchParams({
        page: "-10",
        pageSize: "999",
        sort: "drop table",
        direction: "sideways",
        q: "  acme  ",
      })
    );

    expect(parsed).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 100,
        sort: "updated_at",
        direction: "desc",
        q: "acme",
      })
    );
  });
});
