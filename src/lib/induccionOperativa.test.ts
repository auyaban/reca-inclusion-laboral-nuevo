import { describe, expect, it } from "vitest";
import { buildRequestHash } from "@/lib/finalization/idempotency";
import {
  buildInduccionOperativaRequestHash,
  getDefaultInduccionOperativaValues,
  normalizeInduccionOperativaValues,
} from "@/lib/induccionOperativa";

const EMPRESA = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: "Zona Norte",
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@reca.com",
  caja_compensacion: "Compensar",
} as const;

describe("induccionOperativa", () => {
  it("creates defaults with a singleton linked person and generic attendees", () => {
    const values = getDefaultInduccionOperativaValues(EMPRESA);

    expect(values.vinculado.numero).toBe("1");
    expect(values.nit_empresa).toBe("900123456");
    expect(values.asistentes).toEqual([
      { nombre: "Marta Ruiz", cargo: "" },
      { nombre: "", cargo: "" },
    ]);
  });

  it("normalizes the linked person and keeps numero derived", () => {
    const values = normalizeInduccionOperativaValues(
      {
        fecha_visita: "",
        modalidad: "Virtual",
        nit_empresa: "   ",
        vinculado: {
          numero: "9",
          nombre_oferente: "  Ana Perez  ",
          cedula: " 123456 ",
          telefono_oferente: " 3001234567 ",
          cargo_oferente: " Analista ",
        },
      },
      EMPRESA
    );

    expect(values.modalidad).toBe("Virtual");
    expect(values.nit_empresa).toBe("900123456");
    expect(values.vinculado).toEqual({
      numero: "1",
      nombre_oferente: "Ana Perez",
      cedula: "123456",
      telefono_oferente: "3001234567",
      cargo_oferente: "Analista",
    });
  });

  it("uses the shared request hash helper for stable payload hashing", () => {
    const payload = {
      section_4: {
        items: {
          reconoce_instrucciones: {
            nivel_apoyo: "0. No requiere apoyo.",
            observaciones: undefined,
          },
        },
      },
      vinculado: {
        cargo_oferente: "Analista",
        cedula: "123456",
        nombre_oferente: "Ana Perez",
        numero: "1",
        telefono_oferente: "3001234567",
      },
    };

    const variant = {
      vinculado: {
        telefono_oferente: "3001234567",
        numero: "1",
        nombre_oferente: "Ana Perez",
        cedula: "123456",
        cargo_oferente: "Analista",
      },
      section_4: {
        items: {
          reconoce_instrucciones: {
            observaciones: undefined,
            nivel_apoyo: "0. No requiere apoyo.",
          },
        },
      },
    };

    expect(buildInduccionOperativaRequestHash(payload)).toBe(
      buildRequestHash(payload)
    );
    expect(buildInduccionOperativaRequestHash(payload)).toBe(
      buildInduccionOperativaRequestHash(variant)
    );
  });
});
