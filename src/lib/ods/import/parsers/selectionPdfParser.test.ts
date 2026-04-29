import { describe, it, expect } from "vitest";
import { extractPdfGroupalOferenteChunks } from "./selectionPdfParser";

describe("extractPdfGroupalOferenteChunks", () => {
  it("extracts participants from OFERENTE blocks", () => {
    const text = `OFERENTE 1
1 Juan Carlos Perez 12345678 Discapacidad Visual 3101234567 Pendiente CARGO`;
    const participants = extractPdfGroupalOferenteChunks(text);
    expect(participants.length).toBe(1);
    expect(participants[0].nombre_usuario).toBe("Juan Carlos Perez");
    expect(participants[0].cedula_usuario).toBe("12345678");
    expect(participants[0].discapacidad_usuario).toBe("Visual");
  });

  it("extracts multiple oferentes", () => {
    const text = `OFERENTE 1
1 Ana Gomez 87654321 Discapacidad Auditiva 3009876543 Aprobado CARGO
OFERENTE 2
2 Luis Martinez 11223344 Discapacidad Motriz 3112223333 Pendiente CARGO`;
    const participants = extractPdfGroupalOferenteChunks(text);
    expect(participants.length).toBe(2);
  });

  it("returns empty for non-matching text", () => {
    const participants = extractPdfGroupalOferenteChunks("No oferente data");
    expect(participants).toEqual([]);
  });
});
