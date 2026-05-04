import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fuzzyNitMatch,
  readPdfText,
  runImportPipeline,
  unwrapPayloadNormalized,
  type CatalogDependencies,
} from "@/lib/ods/import/pipeline";
import type { CompanyRow, TarifaRow } from "@/lib/ods/rules-engine/rulesEngine";

vi.mock("@/lib/ods/import/parsers/pdfActaId", () => ({
  extractPdfActaId: vi.fn(),
}));

vi.mock("@/lib/ods/import/edgeFunctionClient", () => ({
  callExtractActaEdgeFunction: vi.fn(),
}));

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(() =>
    Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() =>
        Promise.resolve({
          getTextContent: vi.fn(() =>
            Promise.resolve({
              items: [
                { str: "numero de nit: 900123456" },
                { str: "empresa: TechCorp" },
                { str: "fecha: 2026-03-15" },
              ],
            })
          ),
        })
      ),
    })
  ),
}));

import { extractPdfActaId } from "@/lib/ods/import/parsers/pdfActaId";
import { callExtractActaEdgeFunction } from "@/lib/ods/import/edgeFunctionClient";

const mockExtractPdfActaId = vi.mocked(extractPdfActaId);
const mockCallExtractActaEdgeFunction = vi.mocked(callExtractActaEdgeFunction);

const mockTarifas: TarifaRow[] = [
  {
    codigo_servicio: "SENS-VIR-01",
    referencia_servicio: "Sensibilizacion Virtual",
    descripcion_servicio: "Sensibilizacion Virtual",
    modalidad_servicio: "Virtual",
    valor_base: 50000,
  },
];

const mockCompany: CompanyRow = {
  nit_empresa: "900123456",
  nombre_empresa: "TechCorp",
  ciudad_empresa: "Bogota",
  sede_empresa: "Central",
  zona_empresa: "Urbana",
  caja_compensacion: "Compensar",
  correo_profesional: null,
  profesional_asignado: null,
  asesor: null,
};

function makeDeps(overrides?: Partial<CatalogDependencies>): CatalogDependencies {
  return {
    tarifas: mockTarifas,
    allKnownNits: ["900123456", "800987654"],
    companyByNit: (nit: string) =>
      nit.replace(/[^0-9]/g, "") === "900123456" ? mockCompany : null,
    companyByNameFuzzy: () => null,
    professionalByNameFuzzy: () => null,
    participantByCedula: () => null,
    finalizedRecordByActaRef: async () => null,
    ...overrides,
  };
}

function finalizedRecord(payload: Record<string, unknown>, registroId = "11111111-1111-4111-8111-111111111111") {
  return {
    acta_ref: "ABC12XYZ",
    registro_id: registroId,
    payload_normalized: payload,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runImportPipeline integration", () => {
  it("arranca en Nivel 2 despues del cleanup de RECA metadata", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");

    const result = await runImportPipeline(
      {
        fileBuffer: new ArrayBuffer(0),
        filePath: "test.pdf",
        fileType: "pdf",
        preResolvedFinalizedRecord: finalizedRecord({
          nit_empresa: "900123456",
          nombre_empresa: "TechCorp",
          fecha_servicio: "2026-03-15",
          participantes: [],
        }),
      },
      makeDeps()
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.formato_finalizado_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(result.decisionLog).toHaveLength(1);
    expect(result.decisionLog[0]).toMatchObject({
      level: 2,
      levelName: "ACTA ID Lookup",
      success: true,
    });
    expect(result.analysis.nit_empresa).toBe("900123456");
    expect(mockCallExtractActaEdgeFunction).not.toHaveBeenCalled();
  });

  it("Nivel 2 gana cuando ACTA ID tiene payload_normalized", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");
    const deps = makeDeps({
      finalizedRecordByActaRef: async () =>
        finalizedRecord(
          {
            nit_empresa: "900123456",
            nombre_empresa: "TechCorp",
            fecha_servicio: "2026-03-15",
            participantes: [],
          },
          "22222222-2222-4222-8222-222222222222"
        ),
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.formato_finalizado_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(result.analysis.nit_empresa).toBe("900123456");
    expect(mockCallExtractActaEdgeFunction).not.toHaveBeenCalled();
  });

  it("Nivel 2 falla y cae a Nivel 3", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");
    mockCallExtractActaEdgeFunction.mockResolvedValue({
      success: true,
      data: {
        nit_empresa: "900123456",
        nombre_empresa: "TechCorp",
        fecha_servicio: "2026-03-15",
        participantes: [],
        modalidad_servicio: "Virtual",
      },
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      makeDeps()
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(3);
    expect(result.decisionLog.some((d) => d.level === 2 && !d.success)).toBe(true);
    expect(result.decisionLog.some((d) => d.level === 3 && d.success)).toBe(true);
  });

  it("Niveles 2-3 fallan y cae a Nivel 4 regex parser", async () => {
    mockExtractPdfActaId.mockReturnValue("");
    mockCallExtractActaEdgeFunction.mockResolvedValue({ success: false, error: "fail" });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      makeDeps()
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(4);
    expect(result.decisionLog[0]).toMatchObject({
      level: 2,
      levelName: "ACTA ID Lookup",
      success: false,
    });
    expect(result.decisionLog.some((d) => d.level === 4 && d.success)).toBe(true);
  });

  it("empresa con NIT con typo corrige via fuzzyNitMatch", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");

    const result = await runImportPipeline(
      {
        fileBuffer: new ArrayBuffer(0),
        filePath: "test.pdf",
        fileType: "pdf",
        preResolvedFinalizedRecord: finalizedRecord({
          nit_empresa: "900123457",
          nombre_empresa: "TechCorp",
          participantes: [],
        }),
      },
      makeDeps()
    );

    expect(result.success).toBe(true);
    expect(result.companyMatch?.matchType).toBe("nit_fuzzy");
    expect(result.companyMatch?.nit_empresa).toBe("900123456");
  });
});

describe("Nivel 2 payload_normalized", () => {
  it("usa el primer asistente objeto como nombre_profesional y no el responsable de empresa", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");

    const result = await runImportPipeline(
      {
        fileBuffer: new ArrayBuffer(0),
        filePath: "test.pdf",
        fileType: "pdf",
        preResolvedFinalizedRecord: finalizedRecord({
          parsed_raw: {
            nit_empresa: "900123456",
            nombre_empresa: "TechCorp",
            fecha_servicio: "2026-03-15",
            asistentes: [{ nombre: "Asistente Uno" }],
            candidatos_profesional: ["Candidato Fallback"],
            nombre_profesional: "Responsable Empresa",
            participantes: [],
          },
        }),
      },
      makeDeps()
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.parseResult?.nombre_profesional).toBe("Asistente Uno");
    expect(result.analysis.nombre_profesional).toBe("Asistente Uno");
    expect((result.parseResult as Record<string, unknown>).candidatos_profesional).toEqual(["Candidato Fallback"]);
  });

  it("usa el primer asistente string del payload real de Nivel 2", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");
    const deps = makeDeps({
      finalizedRecordByActaRef: async () =>
        finalizedRecord({
          nit_empresa: "900123456",
          nombre_empresa: "TechCorp",
          fecha_servicio: "2026-03-15",
          asistentes: ["Asistente String"],
          nombre_profesional: "Responsable Empresa",
          participantes: [],
        }),
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.parseResult?.nombre_profesional).toBe("Asistente String");
  });

  it("mantiene nombre_profesional como fallback cuando no hay asistentes ni candidatos", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");

    const result = await runImportPipeline(
      {
        filePath: "ABC12XYZ",
        actaIdOrUrl: "ACTA ID: ABC12XYZ",
      },
      makeDeps({
        finalizedRecordByActaRef: async () =>
          finalizedRecord({
            nit_empresa: "900123456",
            nombre_empresa: "TechCorp",
            fecha_servicio: "2026-03-15",
            nombre_profesional: "Responsable Empresa",
            participantes: [],
          }),
      })
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.parseResult?.nombre_profesional).toBe("Responsable Empresa");
  });

  it("deja nombre_profesional vacio y agrega warning cuando el payload no trae ninguna fuente", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");

    const result = await runImportPipeline(
      {
        fileBuffer: new ArrayBuffer(0),
        filePath: "test.pdf",
        fileType: "pdf",
        preResolvedFinalizedRecord: finalizedRecord({
          nit_empresa: "900123456",
          nombre_empresa: "TechCorp",
          fecha_servicio: "2026-03-15",
          asistentes: ["", { nombre: "" }, { cargo: "Psicologo" }],
          participantes: [],
        }),
      },
      makeDeps()
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.parseResult?.nombre_profesional).toBe("");
    expect(result.warnings).toContain("No se detecto profesional/asistente en el payload_normalized.");
  });

  it("preserva campos completos y propaga formato_finalizado_id", async () => {
    mockExtractPdfActaId.mockReturnValue("ABC12XYZ");
    const deps = makeDeps({
      finalizedRecordByActaRef: async () =>
        finalizedRecord(
          {
            nit_empresa: "900123456",
            nombre_empresa: "TechCorp",
            fecha_servicio: "2026-03-15",
            participantes: [],
            is_fallido: true,
            cargo_objetivo: "Auxiliar",
            total_vacantes: 3,
            numero_seguimiento: "SEG-001",
          },
          "33333333-3333-4333-8333-333333333333"
        ),
    });

    const result = await runImportPipeline(
      { fileBuffer: new ArrayBuffer(0), filePath: "test.pdf", fileType: "pdf" },
      deps
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.formato_finalizado_id).toBe("33333333-3333-4333-8333-333333333333");
    expect((result.parseResult as Record<string, unknown>).is_fallido).toBe(true);
    expect(result.analysis.cargo_objetivo).toBe("Auxiliar");
    expect(result.analysis.total_vacantes).toBe(3);
  });

  it("resuelve direct input por ACTA ID sin leer PDF", async () => {
    const deps = makeDeps({
      finalizedRecordByActaRef: async (actaRef) => {
        expect(actaRef).toBe("ABC12XYZ");
        return finalizedRecord(
          {
            nit_empresa: "900123456",
            nombre_empresa: "TechCorp",
            fecha_servicio: "2026-03-15",
            participantes: [],
          },
          "44444444-4444-4444-8444-444444444444"
        );
      },
    });

    const result = await runImportPipeline(
      { filePath: "ABC12XYZ", actaIdOrUrl: "ACTA ID: ABC12XYZ" },
      deps
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(2);
    expect(result.formato_finalizado_id).toBe("44444444-4444-4444-8444-444444444444");
    expect(result.import_resolution).toEqual({
      strategy: "finalized_record",
      reason: "direct_input_lookup",
      acta_ref: "ABC12XYZ",
    });
  });
});

describe("modalidades alternas", () => {
  it("Bogota normalizado no produce alternativa redundante", async () => {
    const tarifas: TarifaRow[] = [
      { codigo_servicio: "SENS-VIR-01", referencia_servicio: "Sens Virtual", descripcion_servicio: "Sens Virtual", modalidad_servicio: "Virtual", valor_base: 50000 },
      { codigo_servicio: "SENS-BOG-01", referencia_servicio: "Sens Bogota", descripcion_servicio: "Sens Bogota", modalidad_servicio: "Bogota", valor_base: 60000 },
      { codigo_servicio: "SENS-FUE-01", referencia_servicio: "Sens Fuera", descripcion_servicio: "Sens Fuera", modalidad_servicio: "Fuera de Bogota", valor_base: 70000 },
    ];

    const result = await runImportPipeline(
      {
        fileBuffer: new ArrayBuffer(0),
        filePath: "test.pdf",
        fileType: "pdf",
        preResolvedFinalizedRecord: finalizedRecord({
          nit_empresa: "900123456",
          nombre_empresa: "TechCorp",
          fecha_servicio: "2026-03-15",
          modalidad_servicio: "Bogota",
          participantes: [],
        }),
      },
      makeDeps({ tarifas })
    );

    expect(result.success).toBe(true);
    const codigos = result.suggestions.map((s) => s.codigo_servicio);
    const bogCount = codigos.filter((c) => c === "SENS-BOG-01").length;
    expect(bogCount).toBeLessThanOrEqual(1);
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });
});

describe("readPdfText", () => {
  it("limita paginas a 25 aunque numPages sea 100", async () => {
    const getPageMock = vi.fn(() =>
      Promise.resolve({
        getTextContent: vi.fn(() => Promise.resolve({ items: [{ str: "x" }] })),
      })
    );
    const unpdf = await import("unpdf");
    const mockGetDocumentProxy = vi.mocked(unpdf.getDocumentProxy);
    mockGetDocumentProxy.mockResolvedValueOnce({
      numPages: 100,
      getPage: getPageMock,
    } as never);

    await readPdfText(new ArrayBuffer(0));

    expect(getPageMock.mock.calls.length).toBeLessThanOrEqual(25);
  });
});

describe("unwrapPayloadNormalized", () => {
  it("forma flat: devuelve el payload tal cual cuando no hay parsed_raw", () => {
    const flat = {
      nit_empresa: "900696296-4",
      modalidad_servicio: "Bogota",
      participantes: [{ cedula_usuario: "100", nombre_usuario: "X" }],
    };
    expect(unwrapPayloadNormalized(flat)).toEqual(flat);
  });

  it.each([
    ["vacancy_review"],
    ["program_presentation"],
    ["operational_induction"],
  ])("forma envoltorio %s: hace unwrap de parsed_raw", (documentKind) => {
    const wrapper = {
      form_id: documentKind,
      metadata: { acta_ref: "V2GAZSSU" },
      attachment: { document_kind: documentKind },
      parsed_raw: {
        nit_empresa: "900696296-4",
        nombre_empresa: "CORONA INDUSTRIAL SAS",
        modalidad_servicio: "Presencial",
        ciudad_empresa: "Bogota",
        cargo_objetivo: "Auxiliar",
        participantes: [
          { cargo_servicio: "Auxiliar", cedula_usuario: "200000000", nombre_usuario: "Test 1" },
        ],
      },
      schema_version: 1,
    };

    const out = unwrapPayloadNormalized(wrapper);

    expect(out.nit_empresa).toBe("900696296-4");
    expect(out.nombre_empresa).toBe("CORONA INDUSTRIAL SAS");
    expect(out.acta_ref).toBe("V2GAZSSU");
    expect(out.document_kind).toBe(documentKind);
    expect(out.metadata).toBeUndefined();
    expect(out.attachment).toBeUndefined();
    expect(out.form_id).toBeUndefined();
  });

  it("parsed_raw prevalece sobre campos derivados del wrapper", () => {
    const wrapper = {
      metadata: { acta_ref: "WRAPPER-ID" },
      attachment: { document_kind: "wrong_kind" },
      parsed_raw: {
        acta_ref: "INNER-ID",
        document_kind: "right_kind",
        nit_empresa: "900",
      },
    };

    const out = unwrapPayloadNormalized(wrapper);

    expect(out.acta_ref).toBe("INNER-ID");
    expect(out.document_kind).toBe("right_kind");
  });
});

describe("fuzzyNitMatch", () => {
  it("returns exact match when NIT matches exactly", () => {
    const result = fuzzyNitMatch("900123456", ["900123456", "800987654"]);
    expect(result).toEqual({ nit: "900123456", confidence: 1.0 });
  });

  it("returns fuzzy match when NIT has typo", () => {
    const result = fuzzyNitMatch("900123457", ["900123456", "800987654"]);
    expect(result?.nit).toBe("900123456");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("returns null when no match above threshold", () => {
    expect(fuzzyNitMatch("111111111", ["900123456"])).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(fuzzyNitMatch("", ["900123456"])).toBeNull();
  });
});
