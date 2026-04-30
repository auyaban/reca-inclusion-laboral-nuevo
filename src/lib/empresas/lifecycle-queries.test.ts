import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EmpresaEventosParams,
  EmpresaMisListParams,
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
  getEmpresaOperativaDetail,
  listEmpresaEventosOperativos,
  listEmpresaPool,
  listMisEmpresas,
} from "@/lib/empresas/lifecycle-queries";

const actor = {
  userId: "auth-user-1",
  profesionalId: 7,
  nombre: "Sara Zambrano",
};

const misParams: EmpresaMisListParams = {
  q: "",
  estado: "",
  nuevas: false,
  page: 1,
  pageSize: 25,
  sort: "ultimoFormato",
  direction: "desc",
};

const poolParams: EmpresaOperativaListParams = {
  q: "empresa",
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
  const misResumenRpc = vi.fn(async () => ({
    data: [
      {
        id: "empresa-1",
        nombre_empresa: "Empresa Propia",
        nit_empresa: "9001",
        estado: "Activa",
        updated_at: "2026-04-29T10:00:00.000Z",
        profesional_asignado_id: 7,
        profesional_asignado: "Sara Zambrano",
        ultimo_formato_at: "2026-04-29T12:00:00.000Z",
        ultimo_formato_nombre: "Presentacion",
        es_nueva: true,
        total_count: 1,
        new_count: 1,
      },
    ],
    error: null,
  }));
  const ultimoFormatoRpc = vi.fn(async () => ({
    data: [
      {
        ultimo_formato_at: "2026-04-29T12:00:00.000Z",
        ultimo_formato_nombre: "Presentacion",
      },
    ],
    error: null,
  }));
  const empresasListQuery = createQuery({
    data: [
      {
        id: "empresa-1",
        nombre_empresa: "Empresa Libre",
        nit_empresa: "9001",
        ciudad_empresa: "Bogota",
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
        ciudad_empresa: "Bogota",
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
  const empresaDetailQuery = createQuery({
    data: {
      id: "empresa-1",
      nombre_empresa: "Empresa Propia",
      nit_empresa: "9001-1",
      direccion_empresa: "Calle 1",
      ciudad_empresa: "Bogota",
      sede_empresa: "Principal",
      zona_empresa: "Norte",
      correo_1: "ana@empresa.test;luis@empresa.test",
      contacto_empresa: "Ana Perez;Luis Gomez",
      telefono_empresa: "300;301",
      cargo: "Gerente;Talento",
      responsable_visita: "Ana Perez",
      profesional_asignado_id: 7,
      profesional_asignado: "Sara Zambrano",
      correo_profesional: "sara@recacolombia.org",
      asesor: "Asesor Uno",
      correo_asesor: "asesor@test.com",
      caja_compensacion: "Compensar",
      estado: "Activa",
      observaciones: "Seguimiento mensual",
      comentarios_empresas: null,
      gestion: "RECA",
      created_at: "2026-04-28T10:00:00.000Z",
      updated_at: "2026-04-29T10:00:00.000Z",
      deleted_at: null,
    },
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

          if (fields.includes("direccion_empresa")) {
            return empresaDetailQuery;
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

  const rpc = vi.fn((name: string, args: unknown) => {
    if (name === "empresas_profesional_mis_resumen") {
      expect(args).toEqual(
        expect.objectContaining({
          p_profesional_id: 7,
          p_sort: "ultimoFormato",
          p_direction: "desc",
        })
      );
      return misResumenRpc(args);
    }

    if (name === "empresa_ultimo_formato") {
      expect(args).toEqual({
        p_nit_empresa: "9001-1",
        p_nombre_empresa: "Empresa Propia",
      });
      return ultimoFormatoRpc(args);
    }

    throw new Error(`Unexpected rpc ${name}`);
  });

  return {
    from,
    rpc,
    misResumenRpc,
    ultimoFormatoRpc,
    empresasListQuery,
    empresaExistsQuery,
    empresaDetailQuery,
    eventosQuery,
  };
}

describe("empresa lifecycle queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.E3_3_ASSIGNMENT_ALERTS_START_AT = "2026-04-29T00:00:00.000Z";
  });

  it("lists mis empresas from the E3.3 resumen RPC with latest format and new flags", async () => {
    const admin = createAdminMock();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await listMisEmpresas({
      actor,
      params: { ...misParams, nuevas: true },
    });

    expect(admin.rpc).toHaveBeenCalledWith(
      "empresas_profesional_mis_resumen",
      expect.objectContaining({ p_nuevas: true })
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: "empresa-1",
          nombreEmpresa: "Empresa Propia",
          ultimoFormatoAt: "2026-04-29T12:00:00.000Z",
          ultimoFormatoNombre: "Presentacion",
          esNueva: true,
          assignmentStatus: "tuya",
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      newCount: 1,
    });
  });

  it("does not query the operational search pool when q has fewer than 3 characters", async () => {
    const admin = createAdminMock();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await listEmpresaPool({
      actor,
      params: { ...poolParams, q: "ab" },
    });

    expect(admin.from).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
    });
  });

  it("searches the operational pool by name and NIT only", async () => {
    const admin = createAdminMock();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await listEmpresaPool({
      actor,
      params: { ...poolParams, asignacion: "libres", q: "empresa" },
    });

    expect(admin.empresasListQuery.is).toHaveBeenCalledWith("deleted_at", null);
    expect(admin.empresasListQuery.is).toHaveBeenCalledWith(
      "profesional_asignado_id",
      null
    );
    expect(admin.empresasListQuery.or).toHaveBeenCalledWith(
      "nombre_empresa.ilike.%empresa%,nit_empresa.ilike.%empresa%"
    );
    expect(result.items.map((item) => item.assignmentStatus)).toEqual([
      "libre",
      "tuya",
      "asignada",
    ]);
  });

  it("loads a read-only operational detail with parsed contacts and latest format", async () => {
    const admin = createAdminMock();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const detail = await getEmpresaOperativaDetail({
      actor,
      empresaId: "empresa-1",
    });

    expect(admin.empresaDetailQuery.is).toHaveBeenCalledWith("deleted_at", null);
    expect(admin.rpc).toHaveBeenCalledWith("empresa_ultimo_formato", {
      p_nit_empresa: "9001-1",
      p_nombre_empresa: "Empresa Propia",
    });
    expect(detail).toEqual(
      expect.objectContaining({
        id: "empresa-1",
        nombreEmpresa: "Empresa Propia",
        assignmentStatus: "tuya",
        ultimoFormatoAt: "2026-04-29T12:00:00.000Z",
        responsable: expect.objectContaining({ nombre: "Ana Perez" }),
        contactos: [
          expect.objectContaining({ nombre: "Ana Perez", cargo: "Gerente" }),
          expect.objectContaining({ nombre: "Luis Gomez", cargo: "Talento" }),
        ],
      })
    );
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
