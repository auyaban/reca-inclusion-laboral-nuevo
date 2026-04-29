import { describe, it, expect } from "vitest";
import { extractPdfVacancyFields, extractPdfSelectionCargo } from "./vacancyPdfParser";

describe("extractPdfVacancyFields", () => {
  it("extracts cargo and total_vacantes", () => {
    const text = "Nombre de la vacante: Desarrollador Senior\nNumero de vacantes: 3";
    const [cargo, vacantes] = extractPdfVacancyFields(text);
    expect(cargo).toBe("Desarrollador Senior");
    expect(vacantes).toBe(3);
  });

  it("returns empty cargo when not found", () => {
    const [cargo, vacantes] = extractPdfVacancyFields("No vacancy info here");
    expect(cargo).toBe("");
    expect(vacantes).toBe(0);
  });
});

describe("extractPdfSelectionCargo", () => {
  it("extracts cargo from selection section", () => {
    const text = `2. datos del oferente
cargo contacto de emergencia parentesco telefono
Analista de datos Maria Madre 3101234567
3. desarrollo`;
    const cargo = extractPdfSelectionCargo(text);
    expect(cargo).toBe("Analista de datos");
  });

  it("returns empty when no cargo section", () => {
    const cargo = extractPdfSelectionCargo("No selection data");
    expect(cargo).toBe("");
  });
});
