import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdminClientMock,
  fromMock,
  selectMock,
  ilikeMock,
  maybeSingleMock,
} = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const ilikeMock = vi.fn(() => ({
    maybeSingle: maybeSingleMock,
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
    maybeSingleMock,
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
    maybeSingleMock.mockResolvedValue({
      data: {
        usuario_login: "aaron_vercel",
      },
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
  });

  it("throws when the authenticated email cannot be resolved to usuario_login", async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
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
