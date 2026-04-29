import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPRESA_LIST_FIELDS,
  EMPRESA_SELECT_FIELDS,
} from "@/lib/empresas/constants";
import type { EmpresaFormInput, EmpresaListParams } from "@/lib/empresas/schemas";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  select: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  eventInsert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { createEmpresa, getEmpresaCatalogos, listEmpresas } from "@/lib/empresas/server";

const actor = {
  userId: "auth-user-1",
  profesionalId: 7,
  nombre: "Sara Zambrano",
};

const listParams: EmpresaListParams = {
  q: "",
  page: 1,
  pageSize: 50,
  sort: "updated_at",
  direction: "desc",
  estado: "",
  gestion: "",
  caja: "",
  zona: "",
  asesor: "",
  profesionalId: null,
};

function createThenableQuery(result: unknown) {
  const query = {
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function createAdminMock() {
  const profesionalesQuery = {
    is: vi.fn(() => ({
      order: vi.fn(async () => ({
        data: [
          {
            id: 1,
            nombre_profesional: "Ana Ruiz",
            correo_profesional: "ana@recacolombia.org",
          },
        ],
        error: null,
      })),
    })),
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({
        data: {
          id: 1,
          nombre_profesional: "Ana Ruiz",
          correo_profesional: "ana@recacolombia.org",
        },
        error: null,
      })),
    })),
  };

  const asesoresQuery = {
    is: vi.fn(() => ({
      order: vi.fn(async () => ({
        data: [
          { nombre: "Laura Mora", email: "laura@example.com" },
          { nombre: "", email: "sin-nombre@example.com" },
        ],
        error: null,
      })),
    })),
  };

  const empresasInsertResult = {
    id: "empresa-1",
    nombre_empresa: "Empresa Demo",
    nit_empresa: "900123456-1",
    direccion_empresa: "Calle 1",
    ciudad_empresa: "Bogotá",
    sede_empresa: "Principal",
    zona_empresa: "Zona Norte",
    correo_1: "contacto@example.com",
    contacto_empresa: "Responsable",
    telefono_empresa: "3001234567",
    cargo: "Gerente",
    responsable_visita: "Responsable",
    profesional_asignado_id: 1,
    profesional_asignado: "Ana Ruiz",
    correo_profesional: "ana@recacolombia.org",
    asesor: "Laura Mora",
    correo_asesor: "laura@example.com",
    caja_compensacion: "Compensar",
    estado: "Activa",
    observaciones: null,
    comentarios_empresas: null,
    gestion: "RECA",
    created_at: "2026-04-29T00:00:00.000Z",
    updated_at: "2026-04-29T00:00:00.000Z",
    deleted_at: null,
  };

  return {
    rpc: mocks.rpc.mockReturnValue({
      maybeSingle: vi.fn(async () => ({
        data: {
          zonas: ["Zona Norte", "Zona Sur"],
          estados: ["Activa"],
          gestores: ["RECA"],
          cajas: ["Compensar"],
          asesores: ["Laura Mora"],
        },
        error: null,
      })),
    }),
    from: vi.fn((table: string) => {
      if (table === "empresas") {
        return {
          select: mocks.select.mockImplementation((fields: string) => {
            if (fields === "zona_empresa") {
              throw new Error("Do not scan empresas to build catalog filters.");
            }
            return createThenableQuery({
              data: [empresasInsertResult],
              error: null,
              count: 1,
            });
          }),
          insert: mocks.insert.mockReturnValue({
            select: vi.fn((fields: string) => {
              expect(fields).toBe(EMPRESA_SELECT_FIELDS);
              return {
                maybeSingle: vi.fn(async () => ({
                  data: empresasInsertResult,
                  error: null,
                })),
              };
            }),
          }),
        };
      }

      if (table === "profesionales") {
        return {
          select: vi.fn(() => profesionalesQuery),
        };
      }

      if (table === "asesores") {
        return {
          select: vi.fn(() => asesoresQuery),
        };
      }

      if (table === "empresa_eventos") {
        return {
          insert: mocks.eventInsert.mockResolvedValue({ error: null }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

const createInput: EmpresaFormInput = {
  nombre_empresa: "Empresa Demo",
  nit_empresa: "900123456-1",
  direccion_empresa: "Calle 1",
  ciudad_empresa: "Bogotá",
  sede_empresa: "Principal",
  zona_empresa: "Zona Norte",
  correo_1: "contacto@example.com",
  contacto_empresa: "Responsable",
  telefono_empresa: "3001234567",
  cargo: "Gerente",
  responsable_visita: "Responsable",
  profesional_asignado_id: 1,
  asesor: "Laura Mora",
  correo_asesor: "laura@example.com",
  caja_compensacion: "Compensar",
  estado: "Activa",
  observaciones: null,
  gestion: "RECA",
  comentario: null,
};

describe("empresa performance queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseAdminClient.mockReturnValue(createAdminMock());
  });

  it("uses lean select fields for listEmpresas", async () => {
    const result = await listEmpresas({ params: listParams });

    expect(result.total).toBe(1);
    expect(mocks.select).toHaveBeenCalledWith(EMPRESA_LIST_FIELDS, {
      count: "exact",
    });
    expect(mocks.select).not.toHaveBeenCalledWith(
      EMPRESA_SELECT_FIELDS,
      expect.anything()
    );
  });

  it("builds catalog filters through RPC and filters active advisers", async () => {
    const catalogos = await getEmpresaCatalogos();

    expect(mocks.rpc).toHaveBeenCalledWith("empresa_catalogo_filtros");
    expect(catalogos.filtros.zonas).toEqual(["Zona Norte", "Zona Sur"]);
    expect(catalogos.asesores).toEqual([
      { nombre: "Laura Mora", email: "laura@example.com" },
    ]);
  });

  it("validates Zona Compensar through RPC before creating a company", async () => {
    await createEmpresa({ input: createInput, actor });

    expect(mocks.rpc).toHaveBeenCalledWith("empresa_catalogo_filtros");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ zona_empresa: "Zona Norte" })
    );
  });
});
