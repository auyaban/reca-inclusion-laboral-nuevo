import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmpresaUpdateInput } from "@/lib/empresas/schemas";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { updateEmpresa } from "@/lib/empresas/server";

const actor = {
  userId: "auth-user-1",
  profesionalId: 7,
  nombre: "Sara Zambrano",
};

const baseEmpresaRow = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: null,
  direccion_empresa: null,
  ciudad_empresa: null,
  sede_empresa: null,
  zona_empresa: null,
  correo_1: null,
  contacto_empresa: null,
  telefono_empresa: null,
  cargo: null,
  responsable_visita: null,
  profesional_asignado_id: null,
  profesional_asignado: null,
  correo_profesional: null,
  asesor: null,
  correo_asesor: null,
  caja_compensacion: null,
  estado: "Cerrada",
  observaciones: null,
  comentarios_empresas: null,
  gestion: "RECA",
  created_at: null,
  updated_at: null,
  deleted_at: null,
};

function createUpdateChain(data: unknown) {
  return {
    eq: vi.fn(() => ({
      is: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data, error: null })),
        })),
      })),
    })),
  };
}

function createSelectChain(data: unknown) {
  return {
    eq: vi.fn(() => ({
      is: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data, error: null })),
      })),
    })),
  };
}

function createAdminMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === "empresas") {
        return {
          select: vi.fn(() => createSelectChain(baseEmpresaRow)),
          update: mocks.update.mockReturnValue(
            createUpdateChain({ ...baseEmpresaRow, estado: "Activa" })
          ),
        };
      }

      if (table === "empresa_eventos") {
        return {
          insert: mocks.insert.mockResolvedValue({ error: null }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

const staleInput: EmpresaUpdateInput = {
  nombre_empresa: "ACME SAS",
  nit_empresa: null,
  direccion_empresa: null,
  ciudad_empresa: null,
  sede_empresa: null,
  zona_empresa: null,
  correo_1: null,
  contacto_empresa: null,
  telefono_empresa: null,
  cargo: null,
  responsable_visita: null,
  profesional_asignado_id: null,
  asesor: null,
  correo_asesor: null,
  caja_compensacion: null,
  estado: "Activa",
  observaciones: null,
  gestion: "RECA",
  comentario: null,
  previous_estado: "Activa",
};

describe("updateEmpresa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseAdminClient.mockReturnValue(createAdminMock());
  });

  it("requires a comment when the persisted estado changes even if the client snapshot is stale", async () => {
    await expect(
      updateEmpresa({
        id: "empresa-1",
        input: staleInput,
        actor,
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "El comentario es obligatorio cuando cambia el estado.",
    });

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
