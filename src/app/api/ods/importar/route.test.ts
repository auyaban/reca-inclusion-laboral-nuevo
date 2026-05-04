import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogDependencies, PipelineInput } from "@/lib/ods/import/pipeline";

type QueryCall = {
  table: string;
  selectFields?: string;
  eqs: Record<string, unknown>;
  inFilters: Record<string, unknown[]>;
  ilikes: Array<{ column: string; value: string }>;
  isFilters: Array<{ column: string; value: unknown }>;
  orFilters: string[];
  limitValue?: number;
};

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  createClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  readPdfText: vi.fn(),
  runImportPipeline: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

vi.mock("@/lib/ods/import/pipeline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ods/import/pipeline")>();
  return {
    ...actual,
    readPdfText: mocks.readPdfText,
    runImportPipeline: mocks.runImportPipeline,
  };
});

const authOk = {
  ok: true,
  context: {
    user: { id: "auth-user-1", email: "ods@reca.test" },
    profile: {
      id: 10,
      authUserId: "auth-user-1",
      displayName: "ODS User",
      usuarioLogin: "ods_user",
      email: "ods@reca.test",
      authPasswordTemp: false,
    },
    roles: ["ods_operador"],
  },
};

const empresaSelect =
  "nit_empresa, nombre_empresa, ciudad_empresa, sede_empresa, zona_empresa, caja_compensacion, correo_profesional, profesional_asignado, asesor";

const company = {
  nit_empresa: "900123456",
  nombre_empresa: "TechCorp",
  ciudad_empresa: "Bogota",
  sede_empresa: "Central",
  zona_empresa: "Urbana",
  caja_compensacion: "Compensar",
  correo_profesional: null,
  profesional_asignado: null,
  asesor: "Asesor Uno",
};

const fallbackCompany = {
  ...company,
  nit_empresa: "9004597375",
  nombre_empresa: "GRUPO EDS AUTOGAS SAS",
};

const tarifa = {
  codigo_servicio: "SENS-VIR-01",
  referencia_servicio: "Sensibilizacion Virtual",
  descripcion_servicio: "Sensibilizacion Virtual",
  modalidad_servicio: "Virtual",
  valor_base: 50000,
};

function makeQuery(
  table: string,
  calls: QueryCall[],
  resolver: (call: QueryCall, mode: "many" | "single") => unknown
) {
  const call: QueryCall = {
    table,
    eqs: {},
    inFilters: {},
    ilikes: [],
    isFilters: [],
    orFilters: [],
  };
  calls.push(call);

  const query = {
    select: vi.fn((fields: string) => {
      call.selectFields = fields;
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      call.eqs[column] = value;
      return query;
    }),
    in: vi.fn((column: string, values: unknown[]) => {
      call.inFilters[column] = values;
      return query;
    }),
    ilike: vi.fn((column: string, value: string) => {
      call.ilikes.push({ column, value });
      return query;
    }),
    is: vi.fn((column: string, value: unknown) => {
      call.isFilters.push({ column, value });
      return query;
    }),
    or: vi.fn((value: string) => {
      call.orFilters.push(value);
      return query;
    }),
    limit: vi.fn((value: number) => {
      call.limitValue = value;
      return query;
    }),
    maybeSingle: vi.fn(() => Promise.resolve(resolver(call, "single"))),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(resolver(call, "many")).then(resolve, reject),
  };

  return query;
}

function makeSupabaseMock(resolver: (call: QueryCall, mode: "many" | "single") => unknown) {
  const calls: QueryCall[] = [];
  return {
    calls,
    client: {
      from: vi.fn((table: string) => makeQuery(table, calls, resolver)),
    },
  };
}

function buildRequest(options: { fileName?: string; actaIdOrUrl?: string }) {
  const formData = new FormData();
  if (options.fileName) {
    formData.append("file", new File(["pdf bytes"], options.fileName, { type: "application/pdf" }));
  }
  if (options.actaIdOrUrl) {
    formData.append("actaIdOrUrl", options.actaIdOrUrl);
  }
  return new Request("http://localhost/api/ods/importar", {
    method: "POST",
    body: formData,
  });
}

function pipelineSuccess(input: PipelineInput, deps: CatalogDependencies, nit = "900123456") {
  const match = deps.companyByNit(nit);
  return {
    success: true,
    level: input.preResolvedFinalizedRecord ? 2 : 4,
    analysis: {
      nit_empresa: nit,
      nombre_empresa: match?.nombre_empresa,
      nombre_profesional: "",
    },
    companyMatch: match
      ? {
          nit_empresa: match.nit_empresa || "",
          nombre_empresa: match.nombre_empresa || "",
          caja_compensacion: match.caja_compensacion || undefined,
          asesor_empresa: match.asesor || undefined,
          sede_empresa: match.sede_empresa || undefined,
          matchType: "nit_exact" as const,
          confidence: 1,
        }
      : undefined,
    participants: [],
    suggestions: [],
    decisionLog: [
      {
        level: input.preResolvedFinalizedRecord ? 2 : 4,
        levelName: input.preResolvedFinalizedRecord ? "ACTA ID Lookup" : "Regex Parser",
        success: true,
        durationMs: 1,
      },
    ],
    warnings: [],
    formato_finalizado_id: input.preResolvedFinalizedRecord?.registro_id,
  };
}

describe("/api/ods/importar", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(authOk);
    mocks.readPdfText.mockResolvedValue("ACTA ID: ABC12XYZ");
    mocks.runImportPipeline.mockImplementation(async (input: PipelineInput, deps: CatalogDependencies) =>
      pipelineSuccess(input, deps)
    );
  });

  it("usa admin pre-resolution para upload y retorna companyMatch completo con FK", async () => {
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: call.eqs.acta_ref,
            registro_id: "11111111-1111-4111-8111-111111111111",
            payload_normalized: {
              parsed_raw: {
                nit_empresa: "900123456",
                nombre_empresa: "TechCorp",
                fecha_servicio: "2026-03-15",
                participantes: [],
              },
              metadata: { acta_ref: "ABC12XYZ" },
              attachment: { document_kind: "vacancy_review" },
            },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "acta.pdf" }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.companyMatch).toMatchObject({
      nit_empresa: "900123456",
      nombre_empresa: "TechCorp",
      caja_compensacion: "Compensar",
      asesor_empresa: "Asesor Uno",
      sede_empresa: "Central",
    });
    expect(body.formato_finalizado_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(mocks.runImportPipeline.mock.calls[0][0].preResolvedFinalizedRecord).toMatchObject({
      acta_ref: "ABC12XYZ",
      registro_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(admin.calls.find((call) => call.table === "formatos_finalizados_il")?.eqs.acta_ref).toBe("ABC12XYZ");
  });

  it("carga fallback catalog acotado cuando no hay preliminary hints", async () => {
    mocks.readPdfText.mockResolvedValue("PDF sin acta id legible");
    mocks.runImportPipeline.mockImplementation(async (input: PipelineInput, deps: CatalogDependencies) =>
      pipelineSuccess(input, deps, "9004597375")
    );
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [fallbackCompany], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock(() => ({ data: null, error: null }));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "grupo-eds.pdf" }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.companyMatch).toMatchObject({
      nit_empresa: "9004597375",
      nombre_empresa: "GRUPO EDS AUTOGAS SAS",
    });
    const empresasCall = server.calls.find((call) => call.table === "empresas");
    expect(empresasCall?.selectFields).toBe(empresaSelect);
    expect(empresasCall?.isFilters).toContainEqual({ column: "deleted_at", value: null });
    expect(empresasCall?.limitValue).toBe(500);
    expect(mocks.runImportPipeline.mock.calls[0][0].preResolvedFinalizedRecord).toBeUndefined();
  });

  it("direct input not found retorna 404 util y no invoca pipeline", async () => {
    const server = makeSupabaseMock((call) => {
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock(() => ({ data: null, error: null }));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ actaIdOrUrl: "ABC12XYZ" }) as never);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("No encontramos un acta finalizada con ese ACTA ID o URL. Verifica el codigo o sube el PDF.");
    expect(mocks.runImportPipeline).not.toHaveBeenCalled();
  });

  it("Google artifact URL sin fila finalizada retorna 404 y no invoca pipeline", async () => {
    const server = makeSupabaseMock((call) => {
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call) => {
      if (call.table === "form_finalization_requests") return { data: [], error: null };
      return { data: null, error: null };
    });
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(
      buildRequest({
        actaIdOrUrl: "https://drive.google.com/file/d/1DriveFileOpaqueId/view",
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("No encontramos un acta finalizada con ese ACTA ID o URL. Verifica el codigo o sube el PDF.");
    const artifactCalls = admin.calls.filter((call) => call.table === "form_finalization_requests");
    expect(artifactCalls.length).toBeGreaterThan(0);
    expect(artifactCalls.some((call) =>
      call.eqs["external_artifacts->>pdfLink"] === "https://drive.google.com/file/d/1DriveFileOpaqueId/view"
    )).toBe(true);
    expect(artifactCalls.flatMap((call) => call.orFilters).join("|")).not.toContain("ilike");
    expect(mocks.runImportPipeline).not.toHaveBeenCalled();
  });

  it("Google artifact URL exige file ID exacto y no acepta substring en pdfLink", async () => {
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "form_finalization_requests") {
        return {
          data: [
            {
              external_artifacts: {
                pdfLink: "https://drive.google.com/file/d/prefix1DriveFileOpaqueIdSuffix/view",
                actaRef: "OTHER123",
              },
              response_payload: null,
            },
          ],
          error: null,
        };
      }
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: call.eqs.acta_ref,
            registro_id: "33333333-3333-4333-8333-333333333333",
            payload_normalized: {
              nit_empresa: "900123456",
              nombre_empresa: "TechCorp",
              participantes: [],
            },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(
      buildRequest({
        actaIdOrUrl: "https://drive.google.com/file/d/1DriveFileOpaqueId/view",
      }) as never
    );

    expect(response.status).toBe(404);
    expect(admin.calls.some((call) => call.table === "formatos_finalizados_il")).toBe(false);
    expect(mocks.runImportPipeline).not.toHaveBeenCalled();
  });

  it("si vienen actaIdOrUrl y file simultaneamente, el archivo gana", async () => {
    mocks.readPdfText.mockResolvedValue("ACTA ID: FILE1234");
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single" && call.eqs.acta_ref === "FILE1234") {
        return {
          data: {
            acta_ref: "FILE1234",
            registro_id: "22222222-2222-4222-8222-222222222222",
            payload_normalized: {
              nit_empresa: "900123456",
              nombre_empresa: "TechCorp",
              participantes: [],
            },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(
      buildRequest({ fileName: "acta.pdf", actaIdOrUrl: "IDINPUT1" }) as never
    );

    expect(response.status).toBe(200);
    expect(admin.calls.find((call) => call.table === "formatos_finalizados_il")?.eqs.acta_ref).toBe("FILE1234");
    expect(admin.calls.some((call) => call.table === "form_finalization_requests")).toBe(false);
    expect(mocks.runImportPipeline.mock.calls[0][0].actaIdOrUrl).toBe("IDINPUT1");
    expect(mocks.runImportPipeline.mock.calls[0][0].preResolvedFinalizedRecord.acta_ref).toBe("FILE1234");
  });

  it("retorna 500 generico sin exponer detalles internos", async () => {
    mocks.createSupabaseAdminClient.mockImplementation(() => {
      throw new Error("relation public.formatos_finalizados_il does not exist");
    });

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ actaIdOrUrl: "ABC12XYZ" }) as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Error interno", success: false });
  });
});
