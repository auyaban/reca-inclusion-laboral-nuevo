import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function makeSupabaseMock(
  resolver: (call: QueryCall, mode: "many" | "single") => unknown,
  rpcImpl?: (functionName: string, args: Record<string, unknown>) => unknown
) {
  const calls: QueryCall[] = [];
  const resolveRpc = (functionName: string, args: Record<string, unknown>) => {
    if (functionName === "formato_finalizado_lookup_by_acta_ref") {
      const call: QueryCall = {
        table: "formatos_finalizados_il",
        selectFields: "registro_id, acta_ref, payload_normalized",
        eqs: { acta_ref: args.p_acta_ref },
        inFilters: {},
        ilikes: [],
        isFilters: [],
        orFilters: [],
      };
      calls.push(call);
      return resolver(call, "single");
    }
    if (rpcImpl) return rpcImpl(functionName, args);
    return { data: null, error: null };
  };

  return {
    calls,
    rpc: vi.fn((functionName: string, args: Record<string, unknown>) =>
      Promise.resolve(resolveRpc(functionName, args))
    ),
    client: {
      from: vi.fn((table: string) => makeQuery(table, calls, resolver)),
      rpc: vi.fn((functionName: string, args: Record<string, unknown>) =>
        Promise.resolve(resolveRpc(functionName, args))
      ),
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
    import_resolution: input.preResolvedFinalizedRecord
      ? {
          strategy: "lookup" as const,
          reason: "acta_ref_lookup" as const,
          acta_ref: input.preResolvedFinalizedRecord.acta_ref,
        }
      : undefined,
  };
}

describe("/api/ods/importar", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.requireAppRole.mockResolvedValue(authOk);
    mocks.readPdfText.mockResolvedValue("ACTA ID: ABC12XYZ");
    mocks.runImportPipeline.mockImplementation(async (input: PipelineInput, deps: CatalogDependencies) =>
      pipelineSuccess(input, deps)
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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
    expect(admin.client.rpc).toHaveBeenCalledWith("formato_finalizado_lookup_by_acta_ref", {
      p_acta_ref: "ABC12XYZ",
    });
    expect(admin.client.from).not.toHaveBeenCalledWith("formatos_finalizados_il");
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
    expect(admin.client.rpc).not.toHaveBeenCalledWith(
      "formato_finalizado_lookup_by_acta_ref",
      expect.anything()
    );
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
    expect(admin.client.rpc).toHaveBeenCalledWith("formato_finalizado_lookup_by_acta_ref", {
      p_acta_ref: "FILE1234",
    });
    expect(admin.client.from).not.toHaveBeenCalledWith("formatos_finalizados_il");
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

  it("agrega telemetria_id cuando el RPC crea snapshot", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "2026-05-04T00:00:00Z");
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: "ABC12XYZ",
            registro_id: "11111111-1111-4111-8111-111111111111",
            payload_normalized: { nit_empresa: "900123456", nombre_empresa: "TechCorp", participantes: [] },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }, () => ({
      data: { ok: true, code: "created", message: "ok", data: { telemetria_id: "55555555-5555-4555-8555-555555555555" } },
      error: null,
    }));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "acta.pdf" }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.telemetria_id).toBe("55555555-5555-4555-8555-555555555555");
    expect(admin.client.rpc).toHaveBeenCalledWith(
      "ods_motor_telemetria_record",
      expect.objectContaining({
        p_ods_id: null,
        p_import_origin: "acta_pdf",
        p_confidence: "low",
        p_idempotency_key: expect.stringMatching(/^[a-f0-9]{64}$/),
      })
    );
  });

  it("agrega telemetria_id cuando el RPC dedupea snapshot", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "2026-05-04T00:00:00Z");
    mocks.readPdfText.mockResolvedValue("PDF sin acta id legible");
    mocks.runImportPipeline.mockImplementation(async (input: PipelineInput, deps: CatalogDependencies) => ({
      ...pipelineSuccess(input, deps),
      import_resolution: { strategy: "parser", reason: "no_acta_ref", acta_ref: "PARSED42" },
    }));
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock(() => ({ data: null, error: null }), () => ({
      data: { ok: true, code: "deduped", message: "ok", data: { telemetria_id: "66666666-6666-4666-8666-666666666666" } },
      error: null,
    }));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "acta.pdf" }) as never);
    const body = await response.json();

    expect(body.telemetria_id).toBe("66666666-6666-4666-8666-666666666666");
  });

  it("no propaga telemetria_id cuando el RPC retorna already_finalized", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "2026-05-04T00:00:00Z");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: "ABC12XYZ",
            registro_id: "11111111-1111-4111-8111-111111111111",
            payload_normalized: { nit_empresa: "900123456", nombre_empresa: "TechCorp", participantes: [] },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }, () => ({
      data: { ok: true, code: "already_finalized", message: "ok", data: { telemetria_id: "old-id" } },
      error: null,
    }));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "acta.pdf" }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.telemetria_id).toBeUndefined();
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/record] already_finalized");
  });

  it("no bloquea el preview cuando el RPC retorna ok false", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "2026-05-04T00:00:00Z");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: "ABC12XYZ",
            registro_id: "11111111-1111-4111-8111-111111111111",
            payload_normalized: { nit_empresa: "900123456", nombre_empresa: "TechCorp", participantes: [] },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }, () => ({
      data: { ok: false, code: "invalid_payload", message: "invalid", data: null },
      error: null,
    }));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "acta.pdf" }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.companyMatch).toBeTruthy();
    expect(body.telemetria_id).toBeUndefined();
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/record] invalid_payload");
  });

  it("no bloquea el preview cuando el RPC lanza error de red", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "2026-05-04T00:00:00Z");
    mocks.readPdfText.mockResolvedValue("PDF sin acta id legible");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: "ABC12XYZ",
            registro_id: "11111111-1111-4111-8111-111111111111",
            payload_normalized: { nit_empresa: "900123456", nombre_empresa: "TechCorp", participantes: [] },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    admin.client.rpc.mockRejectedValueOnce(new Error("network"));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "acta.pdf" }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.companyMatch).toBeTruthy();
    expect(body.telemetria_id).toBeUndefined();
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/record] exception");
  });

  it("no invoca telemetria cuando ODS_TELEMETRY_START_AT no esta configurado", async () => {
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: "ABC12XYZ",
            registro_id: "11111111-1111-4111-8111-111111111111",
            payload_normalized: { nit_empresa: "900123456", nombre_empresa: "TechCorp", participantes: [] },
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
    expect(body.telemetria_id).toBeUndefined();
    expect(admin.client.rpc).not.toHaveBeenCalledWith(
      "ods_motor_telemetria_record",
      expect.anything()
    );
  });

  it("no invoca telemetria cuando ODS_TELEMETRY_START_AT esta en el futuro", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "2999-01-01T00:00:00Z");
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: "ABC12XYZ",
            registro_id: "11111111-1111-4111-8111-111111111111",
            payload_normalized: { nit_empresa: "900123456", nombre_empresa: "TechCorp", participantes: [] },
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
    expect(body.telemetria_id).toBeUndefined();
    expect(admin.client.rpc).not.toHaveBeenCalledWith(
      "ods_motor_telemetria_record",
      expect.anything()
    );
  });

  it("no invoca telemetria y loguea stage cuando ODS_TELEMETRY_START_AT es invalido", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "not-a-date");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock((call, mode) => {
      if (call.table === "formatos_finalizados_il" && mode === "single") {
        return {
          data: {
            acta_ref: "ABC12XYZ",
            registro_id: "11111111-1111-4111-8111-111111111111",
            payload_normalized: { nit_empresa: "900123456", nombre_empresa: "TechCorp", participantes: [] },
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
    expect(body.telemetria_id).toBeUndefined();
    expect(admin.client.rpc).not.toHaveBeenCalledWith(
      "ods_motor_telemetria_record",
      expect.anything()
    );
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/record] invalid_start_at");
  });

  it("emite acta_pdf con idempotency_key null para PDF Nivel 4 sin ACTA ID", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "2026-05-04T00:00:00Z");
    mocks.readPdfText.mockResolvedValue("PDF sin acta id legible");
    mocks.runImportPipeline.mockImplementation(async (input: PipelineInput, deps: CatalogDependencies) => ({
      ...pipelineSuccess(input, deps),
      import_resolution: { strategy: "parser", reason: "no_acta_ref", acta_ref: "" },
    }));
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock(() => ({ data: null, error: null }), () => ({
      data: { ok: true, code: "created", message: "ok", data: { telemetria_id: "88888888-8888-4888-8888-888888888888" } },
      error: null,
    }));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "acta.pdf" }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.telemetria_id).toBe("88888888-8888-4888-8888-888888888888");
    expect(admin.client.rpc).toHaveBeenCalledWith(
      "ods_motor_telemetria_record",
      expect.objectContaining({
        p_import_origin: "acta_pdf",
        p_idempotency_key: null,
      })
    );
  });

  it("emite import_origin acta_excel para archivos Excel", async () => {
    vi.stubEnv("ODS_TELEMETRY_START_AT", "2026-05-04T00:00:00Z");
    mocks.runImportPipeline.mockImplementation(async (input: PipelineInput, deps: CatalogDependencies) => ({
      ...pipelineSuccess(input, deps),
      import_resolution: { strategy: "parser", reason: "no_acta_ref", acta_ref: "" },
    }));
    const server = makeSupabaseMock((call) => {
      if (call.table === "empresas") return { data: [company], error: null };
      if (call.table === "tarifas") return { data: [tarifa], error: null };
      return { data: [], error: null };
    });
    const admin = makeSupabaseMock(() => ({ data: null, error: null }), () => ({
      data: { ok: true, code: "created", message: "ok", data: { telemetria_id: "77777777-7777-4777-8777-777777777777" } },
      error: null,
    }));
    mocks.createClient.mockResolvedValue(server.client);
    mocks.createSupabaseAdminClient.mockReturnValue(admin.client);

    const { POST } = await import("@/app/api/ods/importar/route");
    const response = await POST(buildRequest({ fileName: "acta.xlsx" }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.telemetria_id).toBe("77777777-7777-4777-8777-777777777777");
    expect(admin.client.rpc).toHaveBeenCalledWith(
      "ods_motor_telemetria_record",
      expect.objectContaining({
        p_import_origin: "acta_excel",
        p_idempotency_key: null,
      })
    );
  });
});
