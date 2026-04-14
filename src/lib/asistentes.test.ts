import { describe, expect, it } from "vitest";
import {
  ASESOR_AGENCIA_CARGO,
  getDefaultAsistentesForMode,
  getMeaningfulAsistentes,
  isCompleteAsistente,
  isMeaningfulAsistente,
  normalizePersistedAsistentesForMode,
  normalizeRestoredAsistentesForMode,
} from "@/lib/asistentes";

describe("attendee helpers", () => {
  it("builds advisor defaults with RECA + advisor rows", () => {
    expect(
      getDefaultAsistentesForMode({
        mode: "reca_plus_agency_advisor",
        profesionalAsignado: "Laura",
      })
    ).toEqual([
      { nombre: "Laura", cargo: "" },
      { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
    ]);
  });

  it("builds generic defaults with RECA + free attendee rows", () => {
    expect(
      getDefaultAsistentesForMode({
        mode: "reca_plus_generic_attendees",
        profesionalAsignado: "Laura",
      })
    ).toEqual([
      { nombre: "Laura", cargo: "" },
      { nombre: "", cargo: "" },
    ]);
  });

  it("restores a second advisor row when advisor-mode payload only has one attendee", () => {
    expect(
      normalizeRestoredAsistentesForMode([{ nombre: "Laura", cargo: "" }], {
        mode: "reca_plus_agency_advisor",
      })
    ).toEqual([
      { nombre: "Laura", cargo: "" },
      { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
    ]);
  });

  it("restores a second generic row when generic-mode payload only has one attendee", () => {
    expect(
      normalizeRestoredAsistentesForMode([{ nombre: "Laura", cargo: "" }], {
        mode: "reca_plus_generic_attendees",
      })
    ).toEqual([
      { nombre: "Laura", cargo: "" },
      { nombre: "", cargo: "" },
    ]);
  });

  it("normalizes the advisor row when persisting advisor-mode attendees", () => {
    expect(
      normalizePersistedAsistentesForMode(
        [
          { nombre: "Laura", cargo: "Profesional RECA" },
          { nombre: "  sofÍA aSeSorA ", cargo: "" },
        ],
        { mode: "reca_plus_agency_advisor" }
      )
    ).toEqual([
      { nombre: "Laura", cargo: "Profesional RECA" },
      { nombre: "Sofía Asesora", cargo: ASESOR_AGENCIA_CARGO },
    ]);
  });

  it("does not inject or rename advisor rows in generic mode", () => {
    expect(
      normalizePersistedAsistentesForMode(
        [
          { nombre: "Laura", cargo: "Profesional RECA" },
          { nombre: "Carlos", cargo: "Talento humano" },
        ],
        { mode: "reca_plus_generic_attendees" }
      )
    ).toEqual([
      { nombre: "Laura", cargo: "Profesional RECA" },
      { nombre: "Carlos", cargo: "Talento humano" },
    ]);
  });

  it("ignores fully empty rows", () => {
    expect(
      getMeaningfulAsistentes([
        { nombre: "  ", cargo: "" },
        { nombre: "", cargo: " " },
      ])
    ).toEqual([]);
  });

  it("keeps rows with only nombre as meaningful but incomplete", () => {
    const asistentes = getMeaningfulAsistentes([{ nombre: "Ana", cargo: "" }]);

    expect(asistentes).toEqual([{ nombre: "Ana", cargo: "" }]);
    expect(isMeaningfulAsistente(asistentes[0]!)).toBe(true);
    expect(isCompleteAsistente(asistentes[0]!)).toBe(false);
  });

  it("keeps rows with only cargo as meaningful but incomplete", () => {
    const asistentes = getMeaningfulAsistentes([
      { nombre: "", cargo: "Asesor Agencia" },
    ]);

    expect(asistentes).toEqual([
      { nombre: "", cargo: "Asesor Agencia" },
    ]);
    expect(isMeaningfulAsistente(asistentes[0]!)).toBe(true);
    expect(isCompleteAsistente(asistentes[0]!)).toBe(false);
  });

  it("treats fully filled rows as complete meaningful asistentes", () => {
    const asistentes = getMeaningfulAsistentes([
      { nombre: "Ana", cargo: "Profesional RECA" },
      { nombre: "Carlos", cargo: "Asesor Agencia" },
    ]);

    expect(asistentes).toEqual([
      { nombre: "Ana", cargo: "Profesional RECA" },
      { nombre: "Carlos", cargo: "Asesor Agencia" },
    ]);
    expect(asistentes.every((asistente) => isCompleteAsistente(asistente))).toBe(
      true
    );
  });
});
