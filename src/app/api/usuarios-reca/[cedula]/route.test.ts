import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";

const {
  createClientMock,
  getUserMock,
  getUsuarioRecaByCedulaMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  getUsuarioRecaByCedulaMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/usuariosRecaServer", () => ({
  getUsuarioRecaByCedula: getUsuarioRecaByCedulaMock,
}));

import { GET } from "@/app/api/usuarios-reca/[cedula]/route";

describe("GET /api/usuarios-reca/[cedula]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
    });
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when the user is not authenticated", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ cedula: "123" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado",
    });
    expect(getUsuarioRecaByCedulaMock).not.toHaveBeenCalled();
  });

  it("allows detail lookup through the server-side E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    getUsuarioRecaByCedulaMock.mockResolvedValue({
      cedula_usuario: "123",
      nombre_usuario: "Ana Perez",
      genero_usuario: null,
      discapacidad_usuario: null,
      discapacidad_detalle: null,
      certificado_discapacidad: null,
      certificado_porcentaje: "45",
      telefono_oferente: null,
      fecha_nacimiento: null,
      cargo_oferente: null,
      contacto_emergencia: null,
      parentesco: null,
      telefono_emergencia: null,
      correo_oferente: null,
      lgtbiq: null,
      grupo_etnico: null,
      grupo_etnico_cual: null,
      lugar_firma_contrato: null,
      fecha_firma_contrato: null,
      tipo_contrato: null,
      fecha_fin: null,
      resultado_certificado: null,
      pendiente_otros_oferentes: null,
      cuenta_pension: null,
      tipo_pension: null,
      empresa_nit: null,
      empresa_nombre: null,
    });

    const response = await GET(
      new Request("http://localhost", {
        headers: {
          cookie: `${E2E_AUTH_BYPASS_COOKIE}=1`,
        },
      }),
      {
        params: Promise.resolve({ cedula: "123" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        cedula_usuario: "123",
        nombre_usuario: "Ana Perez",
      })
    );
  });

  it("returns 404 when the cedula does not exist in usuarios RECA", async () => {
    getUsuarioRecaByCedulaMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ cedula: "123" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "No se encontraron datos en usuarios RECA.",
    });
    expect(getUsuarioRecaByCedulaMock).toHaveBeenCalledWith("123");
  });

  it("returns the normalized snapshot when the cedula exists", async () => {
    getUsuarioRecaByCedulaMock.mockResolvedValue({
      cedula_usuario: "123",
      nombre_usuario: "Ana Perez",
      genero_usuario: null,
      discapacidad_usuario: "Auditiva",
      discapacidad_detalle: "Discapacidad auditiva",
      certificado_discapacidad: null,
      certificado_porcentaje: "45",
      telefono_oferente: "3001234567",
      fecha_nacimiento: "1990-01-01",
      cargo_oferente: "Analista",
      contacto_emergencia: "Mario Perez",
      parentesco: "Hermano",
      telefono_emergencia: "3010000000",
      correo_oferente: "ana@correo.com",
      lgtbiq: null,
      grupo_etnico: "No",
      grupo_etnico_cual: "No aplica",
      lugar_firma_contrato: null,
      fecha_firma_contrato: null,
      tipo_contrato: null,
      fecha_fin: null,
      resultado_certificado: null,
      pendiente_otros_oferentes: null,
      cuenta_pension: null,
      tipo_pension: null,
      empresa_nit: null,
      empresa_nombre: null,
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ cedula: "123" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        cedula_usuario: "123",
        nombre_usuario: "Ana Perez",
        discapacidad_detalle: "Discapacidad auditiva",
      })
    );
  });
});
