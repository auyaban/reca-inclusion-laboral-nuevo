import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdminClientMock,
  fromMock,
  selectMock,
  ilikeMock,
  orderMock,
  limitMock,
} = vi.hoisted(() => {
  const limitMock = vi.fn();
  const orderMock = vi.fn(() => ({
    limit: limitMock,
  }));
  const ilikeMock = vi.fn(() => ({
    order: orderMock,
  }));
  const selectMock = vi.fn(() => ({
    ilike: ilikeMock,
  }));
  const fromMock = vi.fn(() => ({
    select: selectMock,
  }));

  return {
    createAdminClientMock: vi.fn(() => ({
      from: fromMock,
    })),
    fromMock,
    selectMock,
    ilikeMock,
    orderMock,
    limitMock,
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: createAdminClientMock,
}));

import { getFinalizationUserIdentity } from "@/lib/finalization/finalizationUser";

describe("getFinalizationUserIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  it("prefers usuario_login from app metadata when available", async () => {
    const identity = await getFinalizationUserIdentity({
      id: "user-1",
      email: "aaron@example.com",
      app_metadata: {
        usuario_login: "aaron_vercel",
      },
    });

    expect(identity).toEqual({
      usuarioLogin: "aaron_vercel",
      nombreUsuario: "aaron",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("falls back to the profesionales lookup by authenticated email", async () => {
    limitMock.mockResolvedValue({
      data: [{ usuario_login: "aaron_vercel" }],
      error: null,
    });

    const identity = await getFinalizationUserIdentity({
      id: "user-1",
      email: "aaron@example.com",
      app_metadata: {},
    });

    expect(identity).toEqual({
      usuarioLogin: "aaron_vercel",
      nombreUsuario: "aaron",
    });
    expect(createAdminClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key"
    );
    expect(fromMock).toHaveBeenCalledWith("profesionales");
    expect(selectMock).toHaveBeenCalledWith("usuario_login");
    expect(ilikeMock).toHaveBeenCalledWith(
      "correo_profesional",
      "aaron@example.com"
    );
    expect(orderMock).toHaveBeenCalledWith("usuario_login", {
      ascending: true,
    });
    expect(limitMock).toHaveBeenCalledWith(2);
  });

  it("warns and resolves deterministically when the authenticated email is duplicated", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    limitMock.mockResolvedValue({
      data: [
        { usuario_login: "aaron_vercel" },
        { usuario_login: "z_legacy" },
      ],
      error: null,
    });

    try {
      const identity = await getFinalizationUserIdentity({
        id: "user-1",
        email: "aaron@example.com",
        app_metadata: {},
      });

      expect(identity).toEqual({
        usuarioLogin: "aaron_vercel",
        nombreUsuario: "aaron",
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "[finalization.user_identity] duplicate_profesional_email",
        {
          email: "aaron@example.com",
          usuarioLogins: ["aaron_vercel", "z_legacy"],
        }
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("throws when the authenticated email cannot be resolved to usuario_login", async () => {
    limitMock.mockResolvedValue({
      data: [],
      error: null,
    });

    await expect(
      getFinalizationUserIdentity({
        id: "user-1",
        email: "aaron@example.com",
        app_metadata: {},
      })
    ).rejects.toThrow(
      "No se encontro usuario_login para el correo autenticado: aaron@example.com"
    );
  });
});
