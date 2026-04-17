import { describe, expect, it } from "vitest";
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";

describe("buildFinalizedRecordInsert", () => {
  it("construye el insert minimo util sin payload_raw ni columnas legacy redundantes", () => {
    const record = buildFinalizedRecordInsert({
      registroId: "registro-123",
      actaRef: "A7K29QF2",
      usuarioLogin: "aaron@reca.com",
      nombreUsuario: "aaron",
      nombreFormato: "Presentación del Programa",
      nombreEmpresa: "Empresa Demo",
      pathFormato: "https://docs.google.com/spreadsheets/d/demo",
      payloadNormalized: {
        form_id: "presentacion_programa",
      },
      payloadSource: "form_web",
      payloadGeneratedAt: "2026-04-11T15:00:00.000Z",
    });

    expect(record).toEqual({
      registro_id: "registro-123",
      acta_ref: "A7K29QF2",
      usuario_login: "aaron@reca.com",
      nombre_usuario: "aaron",
      nombre_formato: "Presentación del Programa",
      nombre_empresa: "Empresa Demo",
      path_formato: "https://docs.google.com/spreadsheets/d/demo",
      payload_normalized: {
        form_id: "presentacion_programa",
      },
      payload_source: "form_web",
      payload_generated_at: "2026-04-11T15:00:00.000Z",
    });

    expect(record).not.toHaveProperty("payload_raw");
    expect(Object.keys(record).sort()).toEqual([
      "acta_ref",
      "nombre_empresa",
      "nombre_formato",
      "nombre_usuario",
      "path_formato",
      "payload_generated_at",
      "payload_normalized",
      "payload_source",
      "registro_id",
      "usuario_login",
    ]);
  });
});
