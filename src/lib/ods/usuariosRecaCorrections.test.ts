import { describe, expect, it, vi } from "vitest";
import { correctUsuariosRecaCatalogFields } from "./usuariosRecaCorrections";

type UsuarioRow = {
  cedula_usuario: string;
  discapacidad_usuario: string | null;
  genero_usuario: string | null;
};

function makeAdmin(rows: UsuarioRow[], options: { updateError?: unknown } = {}) {
  const updates: Array<{ patch: Record<string, unknown>; cedula: string }> = [];
  const limit = vi.fn(async () => ({ data: rows, error: null }));
  const inFilter = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ in: inFilter }));
  const eq = vi.fn(async (_column: string, cedula: string) => {
    updates.push({ patch: currentPatch, cedula });
    return { data: null, error: options.updateError ?? null };
  });
  let currentPatch: Record<string, unknown> = {};
  const update = vi.fn((patch: Record<string, unknown>) => {
    currentPatch = patch;
    return { eq };
  });
  const from = vi.fn(() => ({ select, update }));

  return {
    admin: { from },
    updates,
    select,
    inFilter,
    limit,
    update,
    eq,
  };
}

describe("correctUsuariosRecaCatalogFields", () => {
  it("actualiza campos vacios o no canonicos cuando el payload trae valores canonicos", async () => {
    const { admin, updates } = makeAdmin([
      { cedula_usuario: "111", discapacidad_usuario: null, genero_usuario: "MUJER" },
    ]);

    const result = await correctUsuariosRecaCatalogFields({
      admin,
      ods: {
        cedula_usuario: "111",
        discapacidad_usuario: "Física",
        genero_usuario: "Mujer",
      },
    });

    expect(result).toMatchObject({ scanned: 1, updated: 1, errors: [] });
    expect(updates).toEqual([
      {
        cedula: "111",
        patch: {
          discapacidad_usuario: "Física",
          genero_usuario: "Mujer",
        },
      },
    ]);
  });

  it("no sobrescribe valores BD canonicos", async () => {
    const { admin, updates } = makeAdmin([
      { cedula_usuario: "111", discapacidad_usuario: "Auditiva", genero_usuario: "Otro" },
    ]);

    const result = await correctUsuariosRecaCatalogFields({
      admin,
      ods: {
        cedula_usuario: "111",
        discapacidad_usuario: "Física",
        genero_usuario: "Mujer",
      },
    });

    expect(result).toMatchObject({ scanned: 1, updated: 0, errors: [] });
    expect(updates).toEqual([]);
  });

  it("actualiza solo los campos necesarios cuando hay varias cedulas agregadas con punto y coma", async () => {
    const { admin, updates, inFilter, limit } = makeAdmin([
      { cedula_usuario: "111", discapacidad_usuario: "", genero_usuario: "Mujer" },
      { cedula_usuario: "222", discapacidad_usuario: "Visual", genero_usuario: "F" },
    ]);

    const result = await correctUsuariosRecaCatalogFields({
      admin,
      ods: {
        cedula_usuario: "111;222",
        discapacidad_usuario: "Física;Visual",
        genero_usuario: "Mujer;Hombre",
      },
    });

    expect(inFilter).toHaveBeenCalledWith("cedula_usuario", ["111", "222"]);
    expect(limit).toHaveBeenCalledWith(500);
    expect(result).toMatchObject({ scanned: 2, updated: 2, errors: [] });
    expect(updates).toEqual([
      { cedula: "111", patch: { discapacidad_usuario: "Física" } },
      { cedula: "222", patch: { genero_usuario: "Hombre" } },
    ]);
  });

  it("omite updates cuando el payload final no trae valor canonico", async () => {
    const { admin, updates } = makeAdmin([
      { cedula_usuario: "111", discapacidad_usuario: "", genero_usuario: "" },
    ]);

    const result = await correctUsuariosRecaCatalogFields({
      admin,
      ods: {
        cedula_usuario: "111",
        discapacidad_usuario: "",
        genero_usuario: "MUJER",
      },
    });

    expect(result).toMatchObject({ scanned: 1, updated: 0, errors: [] });
    expect(updates).toEqual([]);
  });

  it("retorna errores manejables sin lanzar cuando Supabase falla en update", async () => {
    const { admin, updates } = makeAdmin(
      [{ cedula_usuario: "111", discapacidad_usuario: "", genero_usuario: "" }],
      { updateError: { message: "permission denied" } }
    );

    const result = await correctUsuariosRecaCatalogFields({
      admin,
      ods: {
        cedula_usuario: "111",
        discapacidad_usuario: "Auditiva",
        genero_usuario: "Mujer",
      },
    });

    expect(updates).toHaveLength(1);
    expect(result.updated).toBe(0);
    expect(result.errors).toEqual(["update_failed"]);
  });
});
