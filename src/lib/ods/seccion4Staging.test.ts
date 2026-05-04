import { describe, expect, it, vi } from "vitest";
import type { OdsPersonaRow } from "@/hooks/useOdsStore";
import type { UsuarioNuevo } from "@/lib/ods/schemas";
import { isSeccion4RowEmpty, syncSeccion4UsuariosNuevos } from "./seccion4Staging";

function row(overrides: Partial<OdsPersonaRow> = {}): OdsPersonaRow {
  return {
    cedula_usuario: "",
    nombre_usuario: "",
    discapacidad_usuario: "",
    genero_usuario: "",
    fecha_ingreso: "",
    tipo_contrato: "",
    cargo_servicio: "",
    ...overrides,
  };
}

function usuario(overrides: Partial<UsuarioNuevo> = {}): UsuarioNuevo {
  return {
    cedula_usuario: "123",
    nombre_usuario: "Ana",
    discapacidad_usuario: "Física",
    genero_usuario: "Mujer",
    ...overrides,
  };
}

describe("syncSeccion4UsuariosNuevos", () => {
  it("incluye cedulas nuevas completas sin staging manual", async () => {
    const result = await syncSeccion4UsuariosNuevos({
      rows: [
        row({
          cedula_usuario: "123456",
          nombre_usuario: "Ana Ruiz",
          discapacidad_usuario: "Auditiva",
          genero_usuario: "Mujer",
          tipo_contrato: "Laboral",
          cargo_servicio: "Auxiliar",
          usuario_reca_exists: false,
        }),
      ],
      usuariosNuevos: [],
      lookupUsuarioExists: vi.fn(),
    });

    expect(result.errors).toEqual([]);
    expect(result.usuariosNuevos).toEqual([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana Ruiz",
        discapacidad_usuario: "Auditiva",
        genero_usuario: "Mujer",
        tipo_contrato: "Laboral",
        cargo_servicio: "Auxiliar",
      },
    ]);
  });

  it("omite cedulas existentes y no las duplica en usuarios_nuevos", async () => {
    const lookupUsuarioExists = vi.fn();
    const result = await syncSeccion4UsuariosNuevos({
      rows: [
        row({
          cedula_usuario: "999",
          nombre_usuario: "Usuario Existente",
          discapacidad_usuario: "Visual",
          genero_usuario: "Hombre",
          usuario_reca_exists: true,
        }),
      ],
      usuariosNuevos: [],
      lookupUsuarioExists,
    });

    expect(result.errors).toEqual([]);
    expect(result.usuariosNuevos).toEqual([]);
    expect(lookupUsuarioExists).not.toHaveBeenCalled();
  });

  it("si el lookup falla, asume no existe y deja que el server valide", async () => {
    const result = await syncSeccion4UsuariosNuevos({
      rows: [
        row({
          cedula_usuario: "123",
          nombre_usuario: "Ana",
          discapacidad_usuario: "Física",
          genero_usuario: "Mujer",
        }),
      ],
      usuariosNuevos: [],
      lookupUsuarioExists: vi.fn(async () => {
        throw new Error("network");
      }),
    });

    expect(result.errors).toEqual([]);
    expect(result.usuariosNuevos).toEqual([usuario()]);
  });

  it("ignora filas vacias", async () => {
    const lookupUsuarioExists = vi.fn();
    const result = await syncSeccion4UsuariosNuevos({
      rows: [row()],
      usuariosNuevos: [],
      lookupUsuarioExists,
    });

    expect(isSeccion4RowEmpty(row())).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.usuariosNuevos).toEqual([]);
    expect(lookupUsuarioExists).not.toHaveBeenCalled();
  });

  it("reporta fila parcial con campo faltante concreto", async () => {
    const result = await syncSeccion4UsuariosNuevos({
      rows: [
        row({
          cedula_usuario: "123",
          nombre_usuario: "Ana",
          genero_usuario: "Mujer",
        }),
      ],
      usuariosNuevos: [],
      lookupUsuarioExists: vi.fn(),
    });

    expect(result.usuariosNuevos).toEqual([]);
    expect(result.errors).toContain("Sección 4 (Oferentes): completa la discapacidad de la fila 1.");
  });

  it("reporta valores no canonicos con fila y valor", async () => {
    const result = await syncSeccion4UsuariosNuevos({
      rows: [
        row({
          cedula_usuario: "123",
          nombre_usuario: "Ana",
          discapacidad_usuario: "Auditiva",
          genero_usuario: "F",
        }),
      ],
      usuariosNuevos: [],
      lookupUsuarioExists: vi.fn(),
    });

    expect(result.usuariosNuevos).toEqual([]);
    expect(result.errors).toContain('Sección 4 (Oferentes): fila 1 tiene género inválido: "F".');
  });

  it("normaliza cedulas con espacios y caracteres no digitos antes de comparar", async () => {
    const result = await syncSeccion4UsuariosNuevos({
      rows: [
        row({
          cedula_usuario: "  123-456  ",
          nombre_usuario: "Ana",
          discapacidad_usuario: "Auditiva",
          genero_usuario: "Mujer",
          usuario_reca_exists: false,
        }),
      ],
      usuariosNuevos: [],
      lookupUsuarioExists: vi.fn(),
    });

    expect(result.errors).toEqual([]);
    expect(result.usuariosNuevos[0].cedula_usuario).toBe("123456");
  });

  it("bloquea cedulas duplicadas en la misma ODS", async () => {
    const result = await syncSeccion4UsuariosNuevos({
      rows: [
        row({ cedula_usuario: "123", nombre_usuario: "Ana", discapacidad_usuario: "Auditiva", genero_usuario: "Mujer" }),
        row({ cedula_usuario: "123", nombre_usuario: "Ana 2", discapacidad_usuario: "Visual", genero_usuario: "Mujer" }),
      ],
      usuariosNuevos: [],
      lookupUsuarioExists: vi.fn(),
    });

    expect(result.usuariosNuevos).toEqual([]);
    expect(result.errors).toContain("Sección 4 (Oferentes): la cédula 123 está duplicada en las filas 1 y 2.");
  });

  it("reconcilia staging manual viejo contra la fila actual", async () => {
    const result = await syncSeccion4UsuariosNuevos({
      rows: [
        row({
          cedula_usuario: "222",
          nombre_usuario: "Nueva Fila",
          discapacidad_usuario: "Visual",
          genero_usuario: "Hombre",
          usuario_reca_exists: false,
        }),
      ],
      usuariosNuevos: [usuario({ cedula_usuario: "111", nombre_usuario: "Staging Viejo" })],
      lookupUsuarioExists: vi.fn(),
    });

    expect(result.errors).toEqual([]);
    expect(result.usuariosNuevos).toEqual([
      {
        cedula_usuario: "222",
        nombre_usuario: "Nueva Fila",
        discapacidad_usuario: "Visual",
        genero_usuario: "Hombre",
      },
    ]);
  });
});
