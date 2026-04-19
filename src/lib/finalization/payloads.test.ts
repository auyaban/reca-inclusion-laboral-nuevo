import { describe, expect, it } from "vitest";
import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
} from "@/lib/finalization/payloads";

describe("finalization payload helpers", () => {
  it("deduplicates asistentes preserving insertion order", () => {
    const parsed = buildBaseParsedRaw({
      section1Data: {
        nit_empresa: "900123456",
        nombre_empresa: "ACME SAS",
        fecha_visita: "2026-04-19",
        profesional_asignado: " Marta Ruiz ",
      },
      asistentes: [
        { nombre: " Ana Perez ", cargo: "Profesional RECA" },
        { nombre: "Ana Perez", cargo: "Profesional RECA" },
        { nombre: " Luis Mora ", cargo: "Asesor" },
      ],
    });

    expect(parsed.asistentes).toEqual(["Ana Perez", "Luis Mora"]);
    expect(parsed.candidatos_profesional).toEqual([
      "Marta Ruiz",
      "Ana Perez",
      "Luis Mora",
    ]);
  });

  it("returns defensive metadata copies for raw and normalized payloads", () => {
    const result = buildCompletionPayloads({
      formId: "presentacion",
      formName: "Presentación",
      cacheSnapshot: { foo: "bar" },
      attachment: { file: "demo" },
      parsedRaw: { parsed: true },
      output: { sheetLink: "https://example.com/sheet" },
      generatedAt: "2026-04-19T12:00:00.000Z",
      payloadSource: "manual",
      actaRef: " ACTA-1 ",
    });

    expect(result.payloadRaw.metadata).toEqual(result.payloadNormalized.metadata);
    expect(result.payloadRaw.metadata).toEqual(result.payloadMetadata);
    expect(result.payloadRaw.metadata).not.toBe(result.payloadNormalized.metadata);
    expect(result.payloadRaw.metadata).not.toBe(result.payloadMetadata);
    expect(result.payloadNormalized.metadata).not.toBe(result.payloadMetadata);

    result.payloadRaw.metadata.extra = "solo-raw";

    expect(result.payloadNormalized.metadata).not.toHaveProperty("extra");
    expect(result.payloadMetadata).not.toHaveProperty("extra");
  });
});
