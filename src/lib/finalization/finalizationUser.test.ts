import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdminClientMock,
  fromMock,
  selectMock,
  ilikeMock,
  orderMock,
  emailLimitMock,
  eqMock,
  authIdLimitMock,
} = vi.hoisted(() => {
  const emailLimitMock = vi.fn();
  const orderMock = vi.fn(() => ({
    limit: emailLimitMock,
  }));
  const ilikeMock = vi.fn(() => ({
    order: orderMock,
  }));
  const authIdLimitMock = vi.fn();
  const eqMock = vi.fn(() => ({
    limit: authIdLimitMock,
  }));
  const selectMock = vi.fn(() => ({
    eq: eqMock,
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
    emailLimitMock,
    eqMock,
    authIdLimitMock,
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
    // Default: auth_user_id lookup returns no match, so tests fall through to email.
    authIdLimitMock.mockResolvedValue({ data: [], error: null });
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

  it("resolves usuario_login by auth_user_id before falling back to email", async () => {
    authIdLimitMock.mockResolvedValue({
      data: [{ usuario_login: "adriana_canonical" }],
      error: null,
    });

    const identity = await getFinalizationUserIdentity({
      id: "auth-uuid-123",
      email: "adriana.viveros@recacolombia.org",
      app_metadata: {},
    });

    expect(identity).toEqual({
      usuarioLogin: "adriana_canonical",
      nombreUsuario: "adriana.viveros",
    });
    expect(fromMock).toHaveBeenCalledWith("profesionales");
    expect(selectMock).toHaveBeenCalledWith("usuario_login");
    expect(eqMock).toHaveBeenCalledWith("auth_user_id", "auth-uuid-123");
    expect(authIdLimitMock).toHaveBeenCalledWith(1);
    // Email fallback must NOT have been queried since auth_user_id matched.
    expect(ilikeMock).not.toHaveBeenCalled();
  });

  it("falls back to the profesionales lookup by authenticated email when auth_user_id has no match", async () => {
    emailLimitMock.mockResolvedValue({
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
    expect(eqMock).toHaveBeenCalledWith("auth_user_id", "user-1");
    expect(ilikeMock).toHaveBeenCalledWith(
      "correo_profesional",
      "aaron@example.com"
    );
    expect(orderMock).toHaveBeenCalledWith("usuario_login", {
      ascending: true,
    });
    expect(emailLimitMock).toHaveBeenCalledWith(2);
  });

  it("warns and resolves deterministically when the authenticated email is duplicated", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    emailLimitMock.mockResolvedValue({
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

  it("propagates auth_user_id lookup errors instead of silently falling through", async () => {
    const supabaseError = new Error("rls_denied");
    authIdLimitMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(
      getFinalizationUserIdentity({
        id: "user-1",
        email: "aaron@example.com",
        app_metadata: {},
      })
    ).rejects.toThrow("rls_denied");
    expect(ilikeMock).not.toHaveBeenCalled();
  });

  it("throws when neither auth_user_id nor authenticated email resolve to usuario_login", async () => {
    emailLimitMock.mockResolvedValue({
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
