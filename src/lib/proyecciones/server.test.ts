import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  cancelProyeccion,
  createProyeccion,
  listProyeccionServicios,
  listProyecciones,
  updateProyeccion,
} from "@/lib/proyecciones/server";

const actor = {
  userId: "auth-user-1",
  profesionalId: 7,
  nombre: "Sara Zambrano",
};

function createRpcAdminMock(response: { data?: unknown; error?: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue({
      data: response.data ?? null,
      error: response.error ?? null,
    }),
  };
}

describe("proyecciones server RPC wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a projection through the transactional RPC", async () => {
    const admin = createRpcAdminMock({
      data: {
        ok: true,
        code: "created",
        message: "Proyeccion creada.",
        data: {
          id: "projection-1",
          interpreterProjectionId: "projection-2",
        },
      },
    });
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await createProyeccion({
      actor,
      payload: {
        empresaId: "11111111-1111-4111-8111-111111111111",
        serviceKey: "inclusive_selection",
        inicioAt: "2026-05-04T14:00:00.000Z",
        duracionMinutos: 90,
        modalidad: "presencial",
        cantidadPersonas: 4,
        notes: null,
        requiresInterpreter: true,
        interpreterCount: 2,
        interpreterProjectedHours: 3,
        interpreterExceptionReason: null,
        numeroSeguimiento: null,
        tamanoEmpresaBucket: null,
      },
    });

    expect(result.code).toBe("created");
    expect(admin.rpc).toHaveBeenCalledWith(
      "proyeccion_crear",
      expect.objectContaining({
        p_actor_user_id: "auth-user-1",
        p_actor_profesional_id: 7,
        p_service_key: "inclusive_selection",
        p_requires_interpreter: true,
        p_interpreter_count: 2,
      })
    );
  });

  it("updates a projection through the transactional RPC", async () => {
    const admin = createRpcAdminMock({
      data: { ok: true, code: "updated", message: "Proyeccion actualizada.", data: {} },
    });
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    await updateProyeccion({
      id: "projection-1",
      actor,
      payload: {
        serviceKey: "follow_up",
        inicioAt: null,
        duracionMinutos: 45,
        modalidad: null,
        cantidadPersonas: null,
        numeroSeguimiento: 3,
        tamanoEmpresaBucket: null,
        notes: "ajuste",
        requiresInterpreter: false,
        interpreterCount: null,
        interpreterProjectedHours: null,
        interpreterExceptionReason: null,
      },
    });

    expect(admin.rpc).toHaveBeenCalledWith(
      "proyeccion_actualizar",
      expect.objectContaining({
        p_projection_id: "projection-1",
        p_service_key: "follow_up",
        p_numero_seguimiento: 3,
      })
    );
  });

  it("cancels a projection and its linked interpreter line through RPC", async () => {
    const admin = createRpcAdminMock({
      data: { ok: true, code: "cancelled", message: "Proyeccion cancelada.", data: {} },
    });
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    await cancelProyeccion({
      id: "projection-1",
      actor,
      comentario: "Cambio de agenda",
    });

    expect(admin.rpc).toHaveBeenCalledWith(
      "proyeccion_cancelar",
      expect.objectContaining({
        p_projection_id: "projection-1",
        p_cancel_reason: "Cambio de agenda",
      })
    );
  });

  it("maps business errors returned by RPC", async () => {
    const admin = createRpcAdminMock({
      data: {
        ok: false,
        code: "interpreter_exception_required",
        message: "Explica por que este servicio requiere interprete.",
      },
    });
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    await expect(
      createProyeccion({
        actor,
        payload: {
          empresaId: "11111111-1111-4111-8111-111111111111",
          serviceKey: "program_presentation",
          inicioAt: "2026-05-04T14:00:00.000Z",
          duracionMinutos: 90,
          modalidad: "presencial",
          cantidadPersonas: null,
          numeroSeguimiento: null,
          tamanoEmpresaBucket: null,
          notes: null,
          requiresInterpreter: true,
          interpreterCount: 1,
          interpreterProjectedHours: 2,
          interpreterExceptionReason: null,
        },
      })
    ).rejects.toMatchObject({
      status: 400,
      code: "interpreter_exception_required",
    });
  });
});

describe("proyecciones list queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists services as a light catalog", async () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            service_key: "program_presentation",
            nombre: "Presentacion del programa",
            proyectable: true,
            sugerir_interprete: false,
            modalidad_permitidas: ["presencial", "virtual"],
            requiere_cantidad_personas: false,
            requiere_numero_seguimiento: false,
            requiere_tamano_empresa: false,
          },
        ],
        error: null,
      }),
    };
    const admin = { from: vi.fn(() => ({ select: vi.fn(() => query) })) };
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await listProyeccionServicios();

    expect(result.items).toEqual([
      expect.objectContaining({
        serviceKey: "program_presentation",
        nombre: "Presentacion del programa",
      }),
    ]);
    expect(admin.from).toHaveBeenCalledWith("proyeccion_servicios");
  });

  it("lists projections with minimal related empresa and servicio data", async () => {
    const query = {
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "projection-1",
            empresa_id: "empresa-1",
            profesional_id: 7,
            service_key: "program_presentation",
            estado: "programada",
            inicio_at: "2026-05-04T14:00:00.000Z",
            fin_at: "2026-05-04T15:30:00.000Z",
            duracion_minutos: 90,
            modalidad: "presencial",
            parent_projection_id: null,
            cantidad_personas: null,
            numero_seguimiento: null,
            tamano_empresa_bucket: null,
            notes: null,
            requires_interpreter: false,
            interpreter_count: null,
            interpreter_projected_hours: null,
            interpreter_exception_reason: null,
            created_at: "2026-05-01T00:00:00.000Z",
            updated_at: "2026-05-01T00:00:00.000Z",
            empresas: {
              id: "empresa-1",
              nombre_empresa: "Empresa Uno",
              nit_empresa: "900123456",
            },
            profesionales: {
              id: 7,
              nombre_profesional: "Sara Zambrano",
            },
            proyeccion_servicios: {
              service_key: "program_presentation",
              nombre: "Presentacion del programa",
            },
          },
        ],
        error: null,
      }),
    };
    const admin = { from: vi.fn(() => ({ select: vi.fn(() => query) })) };
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const result = await listProyecciones({
      from: "2026-05-04T00:00:00.000Z",
      to: "2026-05-11T00:00:00.000Z",
      includeInterpreter: false,
      estado: "programada",
      empresaId: "",
      profesionalId: null,
      serviceKey: "",
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "projection-1",
        empresa: { id: "empresa-1", nombreEmpresa: "Empresa Uno", nitEmpresa: "900123456" },
        servicio: {
          serviceKey: "program_presentation",
          nombre: "Presentacion del programa",
        },
      })
    );
    expect(query.neq).toHaveBeenCalledWith("service_key", "interpreter_service");
  });
});
