import { describe, expect, it } from "vitest";
import {
  cambiarEstadoEmpresaSchema,
  notaEmpresaSchema,
  parseEmpresaEventosParams,
  parseMisEmpresasListParams,
  parseEmpresaOperativaListParams,
  reclamarEmpresaSchema,
  soltarEmpresaSchema,
} from "@/lib/empresas/lifecycle-schemas";

describe("empresa lifecycle schemas", () => {
  it("parses operational list params with safe defaults and caps", () => {
    const parsed = parseEmpresaOperativaListParams(
      new URLSearchParams({
        q: "  acme  ",
        estado: " Activa ",
        asignacion: "desconocida",
        page: "-1",
        pageSize: "999",
        sort: "drop table",
        direction: "sideways",
      })
    );

    expect(parsed).toEqual({
      q: "acme",
      estado: "Activa",
      asignacion: "todo",
      page: 1,
      pageSize: 50,
      sort: "updated_at",
      direction: "desc",
    });
  });

  it("parses mis empresas params with explicit new-alert and latest-format sorting", () => {
    const parsed = parseMisEmpresasListParams(
      new URLSearchParams({
        q: "  nit 900  ",
        estado: " activa ",
        nuevas: "true",
        page: "2",
        pageSize: "999",
        sort: "ultimoFormato",
        direction: "asc",
      })
    );

    expect(parsed).toEqual({
      q: "nit 900",
      estado: "Activa",
      nuevas: true,
      page: 2,
      pageSize: 50,
      sort: "ultimoFormato",
      direction: "asc",
    });

    expect(parseMisEmpresasListParams(new URLSearchParams()).sort).toBe(
      "ultimoFormato"
    );
    expect(
      parseMisEmpresasListParams(new URLSearchParams({ sort: "ciudad" })).sort
    ).toBe("ultimoFormato");
  });

  it("parses event params with safe defaults", () => {
    const parsed = parseEmpresaEventosParams(
      new URLSearchParams({
        tipo: "nota",
        page: "2",
        pageSize: "999",
      })
    );

    expect(parsed).toEqual({
      tipo: "nota",
      page: 2,
      pageSize: 50,
    });

    expect(
      parseEmpresaEventosParams(new URLSearchParams({ tipo: "otro" })).tipo
    ).toBe("todo");
  });

  it("normalizes lifecycle action payloads", () => {
    expect(
      reclamarEmpresaSchema.parse({ comentario: "  seguimiento requerido  " })
    ).toEqual({ comentario: "seguimiento requerido" });

    expect(soltarEmpresaSchema.parse({ comentario: "  cierre operativo  " })).toEqual({
      comentario: "cierre operativo",
    });

    expect(
      cambiarEstadoEmpresaSchema.parse({
        estado: " pausada ",
        comentario: "  pendiente de visita  ",
      })
    ).toEqual({ estado: "Pausada", comentario: "pendiente de visita" });

    expect(notaEmpresaSchema.parse({ contenido: "  Cliente llamo.  " })).toEqual({
      contenido: "Cliente llamo.",
    });
  });

  it("rejects missing comments, invalid estados and empty notes", () => {
    expect(soltarEmpresaSchema.safeParse({ comentario: " " }).success).toBe(false);
    expect(reclamarEmpresaSchema.safeParse({ comentario: " " }).success).toBe(
      false
    );
    expect(
      cambiarEstadoEmpresaSchema.safeParse({
        estado: "SENA",
        comentario: "comentario",
      }).success
    ).toBe(false);
    expect(notaEmpresaSchema.safeParse({ contenido: " " }).success).toBe(false);
  });
});
