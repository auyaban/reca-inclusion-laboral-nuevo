import { describe, expect, it } from "vitest";
import {
  deserializeEmpresaContacts,
  serializeEmpresaContacts,
  validateSerializedEmpresaContacts,
} from "@/lib/empresas/contacts";

describe("empresa contacts", () => {
  it("serializes responsable and additional contacts into aligned legacy columns", () => {
    const serialized = serializeEmpresaContacts({
      responsable: {
        nombre: "  sandra   pachon ",
        cargo: " gerente   reca ",
          telefono: " 300 123 4567 ",
        correo: " SANDRA@RECA.CO ",
      },
      adicionales: [
        {
          nombre: " laura   perez ",
          cargo: " lider   talento ",
          telefono: " 301 ",
          correo: " laura@example.com ",
        },
        {
          nombre: " luis   gomez ",
          cargo: "",
          telefono: " 302 ",
          correo: "",
        },
      ],
    });

    expect(serialized).toEqual({
      responsable_visita: "Sandra Pachon",
      contacto_empresa: "Sandra Pachon;Laura Perez;Luis Gomez",
      cargo: "Gerente Reca;Lider Talento;",
      telefono_empresa: "3001234567;301;302",
      correo_1: "sandra@reca.co;laura@example.com;",
    });
  });

  it("deserializes uneven legacy columns by preserving positions", () => {
    const parsed = deserializeEmpresaContacts({
      responsable_visita: "Sandra Pachon",
      contacto_empresa: "Sandra Pachon;Laura Perez;Luis Gomez",
      cargo: "Gerente Reca;;Analista",
      telefono_empresa: "300",
      correo_1: "sandra@reca.co;laura@example.com;",
    });

    expect(parsed.responsable).toEqual({
      nombre: "Sandra Pachon",
      cargo: "Gerente Reca",
      telefono: "300",
      correo: "sandra@reca.co",
    });
    expect(parsed.adicionales).toEqual([
      {
        nombre: "Laura Perez",
        cargo: null,
        telefono: null,
        correo: "laura@example.com",
      },
      {
        nombre: "Luis Gomez",
        cargo: "Analista",
        telefono: null,
        correo: null,
      },
    ]);
  });

  it("rejects invalid emails in serialized contact lists", () => {
    expect(
      validateSerializedEmpresaContacts({
        contacto_empresa: "Sandra Pachon",
        cargo: "Gerente Reca",
        telefono_empresa: "300",
        correo_1: "correo-invalido",
      })
    ).toEqual([
      {
        field: "correo_1",
        message: "Ingresa correos de contacto válidos.",
      },
    ]);
  });

  it("requires a name when an additional contact has other data", () => {
    expect(
      validateSerializedEmpresaContacts({
        contacto_empresa: "Sandra Pachon;",
        cargo: "Gerente Reca;Analista",
        telefono_empresa: "300;",
        correo_1: "sandra@reca.co;",
      })
    ).toContainEqual({
      field: "contacto_empresa",
      message: "Cada contacto adicional debe tener nombre.",
    });
  });

  it("requires cargo when an additional contact has a name", () => {
    expect(
      validateSerializedEmpresaContacts({
        contacto_empresa: "Sandra Pachon;Laura Perez",
        cargo: "Gerente Reca;",
        telefono_empresa: "300;301",
        correo_1: "sandra@reca.co;",
      })
    ).toContainEqual({
      field: "cargo",
      message: "Cada contacto adicional debe tener cargo.",
    });
  });

  it("rejects phones with symbols or more than ten digits", () => {
    expect(
      validateSerializedEmpresaContacts({
        contacto_empresa: "Sandra Pachon;Laura Perez",
        cargo: "Gerente Reca;Analista",
        telefono_empresa: "3001234567;+571234567890",
        correo_1: "sandra@reca.co;laura@example.com",
      })
    ).toContainEqual({
      field: "telefono_empresa",
      message: "El teléfono solo puede contener números y máximo 10 dígitos.",
    });
  });
});
