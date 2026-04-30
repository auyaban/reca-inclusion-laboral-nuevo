import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  EmpresaLifecycleError,
  agregarEmpresaNota,
  cambiarEstadoEmpresaOperativo,
  reclamarEmpresa,
  soltarEmpresa,
} from "@/lib/empresas/lifecycle-server";

const actor = {
  userId: "auth-user-1",
  profesionalId: 7,
  nombre: "Laura Perez",
};

function createAdminMock() {
  return {
    rpc: mocks.rpc,
  };
}

describe("empresa lifecycle server helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseAdminClient.mockReturnValue(createAdminMock());
  });

  it("calls empresa_reclamar with minimal RPC arguments", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        ok: true,
        code: "claimed",
        message: "Empresa reclamada.",
        data: {
          empresaId: "empresa-1",
          profesionalAsignadoId: 7,
          profesionalAsignado: "Laura Perez",
          estado: "Activa",
          updatedAt: "2026-04-29T12:00:00.000Z",
          events: [{ tipo: "reclamada" }],
        },
      },
      error: null,
    });

    const result = await reclamarEmpresa({
      empresaId: "empresa-1",
      actor,
      comentario: "Apoyo por carga operativa",
    });

    expect(mocks.rpc).toHaveBeenCalledWith("empresa_reclamar", {
      p_empresa_id: "empresa-1",
      p_actor_user_id: "auth-user-1",
      p_actor_profesional_id: 7,
      p_comentario: "Apoyo por carga operativa",
    });
    expect(result).toEqual({
      ok: true,
      code: "claimed",
      message: "Empresa reclamada.",
      data: {
        empresaId: "empresa-1",
        profesionalAsignadoId: 7,
        profesionalAsignado: "Laura Perez",
        estado: "Activa",
        updatedAt: "2026-04-29T12:00:00.000Z",
        events: [{ tipo: "reclamada" }],
      },
    });
  });

  it("maps RPC business errors to EmpresaLifecycleError", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        ok: false,
        code: "comment_required",
        message: "Agrega un comentario para continuar.",
        data: null,
      },
      error: null,
    });

    await expect(
      soltarEmpresa({
        empresaId: "empresa-1",
        actor,
        comentario: "",
      })
    ).rejects.toMatchObject({
      name: "EmpresaLifecycleError",
      status: 400,
      code: "comment_required",
      message: "Agrega un comentario para continuar.",
    });
  });

  it("passes canonical estado and note payloads to the dedicated RPCs", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        ok: true,
        code: "ok",
        message: "Acción completada.",
        data: { empresaId: "empresa-1", events: [] },
      },
      error: null,
    });

    await cambiarEstadoEmpresaOperativo({
      empresaId: "empresa-1",
      actor,
      estado: "Pausada",
      comentario: "Seguimiento aplazado por agenda.",
    });
    await agregarEmpresaNota({
      empresaId: "empresa-1",
      actor,
      contenido: "Cliente solicita reagendar visita.",
    });

    expect(mocks.rpc).toHaveBeenNthCalledWith(
      1,
      "empresa_cambiar_estado_operativo",
      {
        p_empresa_id: "empresa-1",
        p_actor_user_id: "auth-user-1",
        p_actor_profesional_id: 7,
        p_estado: "Pausada",
        p_comentario: "Seguimiento aplazado por agenda.",
      }
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "empresa_agregar_nota", {
      p_empresa_id: "empresa-1",
      p_actor_user_id: "auth-user-1",
      p_actor_profesional_id: 7,
      p_contenido: "Cliente solicita reagendar visita.",
    });
  });

  it("maps unexpected RPC transport errors to a server error", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "connection failed" },
    });

    await expect(
      reclamarEmpresa({
        empresaId: "empresa-1",
        actor,
        comentario: null,
      })
    ).rejects.toBeInstanceOf(EmpresaLifecycleError);
    await expect(
      reclamarEmpresa({
        empresaId: "empresa-1",
        actor,
        comentario: null,
      })
    ).rejects.toMatchObject({
      status: 500,
      code: "rpc_error",
      message: "No se pudo completar la acción.",
    });
  });
});
