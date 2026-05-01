import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmpresaServerError } from "@/lib/empresas/server";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  EMPRESA_LIFECYCLE_EVIDENCE_FIELDS,
  getEmpresaLifecycleTree,
} from "@/lib/empresas/lifecycle-tree-server";

function createQuery(result: unknown) {
  const query = {
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function createAdminMock(options: { empresa?: unknown; evidence?: unknown[] } = {}) {
  const empresaQuery = createQuery({
    data:
      options.empresa === undefined
        ? {
            id: "empresa-1",
            nombre_empresa: "Empresa Demo",
            nit_empresa: "900123456-1",
            caja_compensacion: "Compensar",
          }
        : options.empresa,
    error: null,
  });
  const evidenceQuery = createQuery({
    data:
      options.evidence ??
      [
        {
          registro_id: "presentacion-1",
          nombre_formato: "Presentacion del Programa",
          nombre_empresa: "Empresa Demo",
          created_at: "2026-04-20T10:00:00.000Z",
          finalizado_at_colombia: null,
          finalizado_at_iso: null,
          path_formato: null,
          payload_source: "form_web",
          payload_schema_version: "1",
          payload_generated_at: null,
          acta_ref: "acta-presentacion-1",
          payload_normalized: {
            parsed_raw: {
              nit_empresa: "900.123.456-1",
              nombre_empresa: "Empresa Demo",
              caja_compensacion: "Compensar",
              fecha_servicio: "2026-04-20",
            },
          },
        },
      ],
    error: null,
  });

  const from = vi.fn((table: string) => {
    if (table === "empresas") {
      return {
        select: vi.fn((fields: string) => {
          expect(fields).toBe(
            "id, nombre_empresa, nit_empresa, caja_compensacion"
          );
          return empresaQuery;
        }),
      };
    }

    if (table === "formatos_finalizados_il") {
      return {
        select: vi.fn((fields: string) => {
          expect(fields).toBe(EMPRESA_LIFECYCLE_EVIDENCE_FIELDS);
          return evidenceQuery;
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { from, empresaQuery, evidenceQuery };
}

describe("empresa lifecycle tree server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads a company and limited finalized evidence using minimal fields", async () => {
    const admin = createAdminMock();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const tree = await getEmpresaLifecycleTree({ empresaId: "empresa-1" });

    expect(admin.empresaQuery.eq).toHaveBeenCalledWith("id", "empresa-1");
    expect(admin.empresaQuery.is).toHaveBeenCalledWith("deleted_at", null);
    expect(admin.evidenceQuery.or).toHaveBeenCalledWith(
      expect.stringContaining("payload_normalized->parsed_raw->>nit_empresa.ilike")
    );
    expect(admin.evidenceQuery.order).toHaveBeenNthCalledWith(
      1,
      "finalizado_at_iso",
      {
        ascending: false,
        nullsFirst: false,
      }
    );
    expect(admin.evidenceQuery.order).toHaveBeenNthCalledWith(2, "created_at", {
      ascending: false,
      nullsFirst: false,
    });
    expect(admin.evidenceQuery.limit).toHaveBeenCalledWith(250);
    expect(tree.empresa.id).toBe("empresa-1");
    expect(tree.companyStages).toHaveLength(1);
  });

  it("does not query by noisy short NIT values", async () => {
    const admin = createAdminMock({
      empresa: {
        id: "empresa-1",
        nombre_empresa: "Empresa Demo",
        nit_empresa: "123",
        caja_compensacion: "Compensar",
      },
    });
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    await getEmpresaLifecycleTree({ empresaId: "empresa-1" });

    expect(admin.evidenceQuery.or).toHaveBeenCalledWith(
      expect.not.stringContaining("nit_empresa.ilike")
    );
    expect(admin.evidenceQuery.or).toHaveBeenCalledWith(
      expect.stringContaining("nombre_empresa.ilike")
    );
  });

  it("drops false positives from broad filters and warns on name fallback matches", async () => {
    const admin = createAdminMock({
      evidence: [
        {
          registro_id: "discarded",
          nombre_formato: "Presentacion del Programa",
          nombre_empresa: "Otra Empresa",
          created_at: "2026-04-20T10:00:00.000Z",
          finalizado_at_colombia: null,
          finalizado_at_iso: null,
          path_formato: null,
          payload_source: "form_web",
          payload_schema_version: "1",
          payload_generated_at: null,
          acta_ref: "acta-discarded",
          payload_normalized: {
            parsed_raw: {
              nit_empresa: "999999999",
              nombre_empresa: "Otra Empresa",
              fecha_servicio: "2026-04-20",
            },
          },
        },
        {
          registro_id: "name-fallback",
          nombre_formato: "Presentacion del Programa",
          nombre_empresa: "Empresa Demo",
          created_at: "2026-04-21T10:00:00.000Z",
          finalizado_at_colombia: null,
          finalizado_at_iso: null,
          path_formato: null,
          payload_source: "form_web",
          payload_schema_version: "1",
          payload_generated_at: null,
          acta_ref: "acta-name-fallback",
          payload_normalized: {
            parsed_raw: {
              nit_empresa: "",
              nombre_empresa: "Empresa Demo",
              fecha_servicio: "2026-04-21",
            },
          },
        },
      ],
    });
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const tree = await getEmpresaLifecycleTree({ empresaId: "empresa-1" });

    expect(tree.companyStages.flatMap((stage) => stage.evidence)).toEqual([
      expect.objectContaining({ id: "name-fallback" }),
    ]);
    expect(tree.dataQualityWarnings).toContainEqual(
      expect.objectContaining({
        code: "matched_by_name_fallback",
        evidenceId: "name-fallback",
      })
    );
  });

  it("returns 404 when the company is missing or soft-deleted", async () => {
    const admin = createAdminMock({ empresa: null });
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    await expect(
      getEmpresaLifecycleTree({ empresaId: "empresa-1" })
    ).rejects.toEqual(new EmpresaServerError(404, "Empresa no encontrada."));
  });
});
