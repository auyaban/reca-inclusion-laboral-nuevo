import { describe, expect, it } from "vitest";
import {
  buildInduccionParticipantes,
  buildInduccionSection2Snapshot,
  createEmptyInduccionLinkedPerson,
  getDefaultInduccionBaseValues,
  getInduccionCargoObjetivo,
  hasMeaningfulInduccionLinkedPerson,
  normalizeInduccionBaseValues,
  normalizeInduccionLinkedPerson,
} from "@/lib/inducciones";

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

describe("inducciones", () => {
  it("creates an empty linked person with numero fixed to 1", () => {
    expect(createEmptyInduccionLinkedPerson()).toEqual({
      numero: "1",
      nombre_oferente: "",
      cedula: "",
      telefono_oferente: "",
      cargo_oferente: "",
    });
  });

  it("normalizes linked person payloads and keeps numero derived", () => {
    expect(
      normalizeInduccionLinkedPerson({
        numero: "9",
        nombre_oferente: "  Ana Perez  ",
        cedula: " 1000123 ",
        telefono_oferente: " 3001234567 ",
        cargo_oferente: " Analista ",
      })
    ).toEqual({
      numero: "1",
      nombre_oferente: "Ana Perez",
      cedula: "1000123",
      telefono_oferente: "3001234567",
      cargo_oferente: "Analista",
    });
  });

  it("builds default base values for inducciones with generic attendees", () => {
    const values = getDefaultInduccionBaseValues(EMPRESA);

    expect(values.modalidad).toBe("Presencial");
    expect(values.nit_empresa).toBe("900123456");
    expect(values.vinculado.numero).toBe("1");
    expect(values.asistentes).toEqual([
      { nombre: "Marta Ruiz", cargo: "" },
      { nombre: "", cargo: "" },
    ]);
  });

  it("normalizes base values and restores asistentes in generic mode", () => {
    const values = normalizeInduccionBaseValues(
      {
        fecha_visita: "",
        modalidad: "Mixto",
        nit_empresa: "  ",
        vinculado: {
          numero: "7",
          nombre_oferente: "  Ana Perez ",
          cedula: " 1000123 ",
          telefono_oferente: " 3001234567 ",
          cargo_oferente: " Analista ",
        },
        asistentes: [{ nombre: "Invitado", cargo: "Lider" }],
      },
      EMPRESA
    );

    expect(values.modalidad).toBe("Mixta");
    expect(values.nit_empresa).toBe("900123456");
    expect(values.vinculado).toEqual({
      numero: "1",
      nombre_oferente: "Ana Perez",
      cedula: "1000123",
      telefono_oferente: "3001234567",
      cargo_oferente: "Analista",
    });
    expect(values.asistentes).toEqual([
      { nombre: "Invitado", cargo: "Lider" },
      { nombre: "", cargo: "" },
    ]);
  });

  it("detects whether a linked person has meaningful data", () => {
    expect(
      hasMeaningfulInduccionLinkedPerson(createEmptyInduccionLinkedPerson())
    ).toBe(false);
    expect(
      hasMeaningfulInduccionLinkedPerson({
        ...createEmptyInduccionLinkedPerson(),
        cedula: "123",
      })
    ).toBe(true);
  });

  it("builds a singleton section_2 snapshot from the linked person", () => {
    expect(
      buildInduccionSection2Snapshot(createEmptyInduccionLinkedPerson())
    ).toEqual([]);

    const legacyLinkedPerson = normalizeInduccionLinkedPerson({
      numero: "9",
      nombre_oferente: " Ana Perez ",
      cedula: " 123 ",
      telefono_oferente: " 300 ",
      cargo_oferente: " Analista ",
    });

    expect(buildInduccionSection2Snapshot(legacyLinkedPerson)).toEqual([
      {
        numero: "1",
        nombre_oferente: "Ana Perez",
        cedula: "123",
        telefono_oferente: "300",
        cargo_oferente: "Analista",
      },
    ]);
  });

  it("builds participantes and cargo objetivo from the linked person", () => {
    expect(
      buildInduccionParticipantes(createEmptyInduccionLinkedPerson())
    ).toEqual([]);

    const linkedPerson = normalizeInduccionLinkedPerson({
      numero: "1",
      nombre_oferente: "Ana Perez",
      cedula: "1000123",
      telefono_oferente: "3001234567",
      cargo_oferente: "Analista",
    });

    expect(buildInduccionParticipantes(linkedPerson)).toEqual([
      {
        nombre: "Ana Perez",
        cedula: "1000123",
        cargo: "Analista",
      },
    ]);
    expect(getInduccionCargoObjetivo(linkedPerson)).toBe("Analista");
  });
});
