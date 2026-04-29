import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EmpresaEventosParams,
  EmpresaOperativaListParams,
} from "@/lib/empresas/lifecycle-schemas";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  EMPRESA_OPERATIVA_LIST_FIELDS,
  listEmpresaEventosOperativos,
  listEmpresaPool,
  listMisEmpresas,
} from "@/lib/empresas/lifecycle-queries";

const actor = {
  userId: "auth-user-1",
  profesionalId: 7,
  nombre: "Sara Zambrano",
};

const listParams: EmpresaOperativaListParams = {
  q: "",
  estado: "",
  asignacion: "todo",
  page: 1,
  pageSize: 25,
  sort: "updated_at",
  direction: "desc",
};

const eventosParams: EmpresaEventosParams = {
  tipo: "todo",
  page: 1,
  pageSize: 20,
};

function createQuery(result: unknown) {
  const query = {
    is: vi.fn(() => query),
    not: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function createAdminMock() {
  const empresasListQuery = createQuery({
    data: [
      {
        id: "empresa-1",
        nombre_empresa: "Empresa Libre",
        nit_empresa: "9001",
        ciudad_empresa: "Bogotá",
        sede_empresa: "Principal",
        estado: "Activa",
        updated_at: "2026-04-29T10:00:00.000Z",
        profesional_asignado_id: null,
        profesional_asignado: null,
      },
      {
        id: "empresa-2",
        nombre_empresa: "Empresa Propia",
        nit_empresa: "9002",
        ciudad_empresa: "Bogotá",
        sede_empresa: "Norte",
        estado: "En Proceso",
        updated_at: "2026-04-29T11:00:00.000Z",
        profesional_asignado_id: 7,
        profesional_asignado: "Sara Zambrano",
      },
      {
        id: "empresa-3",
        nombre_empresa: "Empresa Asignada",
        nit_empresa: "9003",
        ciudad_empresa: "Cali",
        sede_empresa: "Sur",
        estado: "Pausada",
        updated_at: "2026-04-29T12:00:00.000Z",
        profesional_asignado_id: 8,
        profesional_asignado: "Ana Ruiz",
      },
    ],
    error: null,
    count: 3,
  });
  const empresaExistsQuery = createQuery({
    data: { id: "empresa-1" },
    error: null,
  });
  const eventosQuery = createQuery({
    data: [
      {
        id: "event-1",
        empresa_id: "empresa-1",
        tipo: "nota",
        actor_user_id: "auth-user-1",
        actor_profesional_id: 7,
        actor_nombre: "Sara Zambrano",
        payload: { contenido: "Cliente solicita seguimiento." },
        created_at: "2026-04-29T12:00:00.000Z",
      },
    ],
    error: null,
    count: 1,
  });

  const from = vi.fn((table: string) => {
    if (table === "empresas") {
      return {
        select: vi.fn((fields: string, options?: unknown) => {
          if (fields === "id") {
            return empresaExistsQuery;
          }

          expect(fields).toBe(EMPRESA_OPERATIVA_LIST_FIELDS);
          expect(options).toEqual({ count: "exact" });
          return empresasListQuery;
        }),
      };
    }

    if (table === "empresa_eventos") {
      return {
        select: vi.fn((fields: string, options?: unknown) => {
          expect(fields).toContain("payload");
          expect(options).toEqual({ count: "exact" });
          return eventosQuery;
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { from, empresasListQuery, empresaExistsQuery, eventosQuery };
}

describe("empresa lifecycle queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only empresas assigned to the current professional", async () => {
    const admin = createAdminMock();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await listMisEmpresas({
      actor,
      params: { ...listParams, asignacion: "libres" },
    });

    expect(admin.empresasListQuery.eq).toHaveBeenCalledWith(
      "profesional_asignado_id",
      7
    );
    expect(admin.empresasListQuery.is).not.toHaveBeenCalledWith(
      "profesional_asignado_id",
      null
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "empresa-1",
        nombreEmpresa: "Empresa Libre",
        assignmentStatus: "libre",
      })
    );
  });

  it("lists the claim pool with assignment status and optional assignment filters", async () => {
    const admin = createAdminMock();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await listEmpresaPool({
      actor,
      params: { ...listParams, asignacion: "libres", q: "empresa" },
    });

    expect(admin.empresasListQuery.is).toHaveBeenCalledWith("deleted_at", null);
    expect(admin.empresasListQuery.is).toHaveBeenCalledWith(
      "profesional_asignado_id",
      null
    );
    expect(admin.empresasListQuery.or).toHaveBeenCalledWith(
      "nombre_empresa.ilike.%empresa%,nit_empresa.ilike.%empresa%,ciudad_empresa.ilike.%empresa%"
    );
    expect(result.items.map((item) => item.assignmentStatus)).toEqual([
      "libre",
      "tuya",
      "asignada",
    ]);
  });

  it("validates empresa existence and lists events without returning raw payload", async () => {
    const admin = createAdminMock();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await listEmpresaEventosOperativos({
      empresaId: "empresa-1",
      params: { ...eventosParams, tipo: "nota" },
    });

    expect(admin.empresaExistsQuery.is).toHaveBeenCalledWith("deleted_at", null);
    expect(admin.eventosQuery.eq).toHaveBeenCalledWith("tipo", "nota");
    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual({
      id: "event-1",
      tipo: "nota",
      actorNombre: "Sara Zambrano",
      createdAt: "2026-04-29T12:00:00.000Z",
      resumen: "Nota: Cliente solicita seguimiento.",
      detalle: "Cliente solicita seguimiento.",
    });
    expect(result.items[0]).not.toHaveProperty("payload");
  });
});
