import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createServerClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createAdminClient,
}));

type ProfessionalRow = {
  id: number;
  nombre_profesional: string | null;
  usuario_login: string | null;
  correo_profesional: string | null;
  auth_user_id: string | null;
  auth_password_temp?: boolean | null;
};

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "auth-user-1",
    email: "admin@reca.test",
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  };
}

function installServerUser(user: unknown, error: unknown = null) {
  mocks.createServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error,
      }),
    },
  });
}

function installAdminLookup(options: {
  byAuthId?: ProfessionalRow | null;
  byEmail?: ProfessionalRow | null;
  roles?: string[];
}) {
  const profesionalesByAuthIdChain = {
    select: vi.fn(() => profesionalesByAuthIdChain),
    eq: vi.fn(() => profesionalesByAuthIdChain),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.byAuthId ?? null,
      error: null,
    }),
  };
  const profesionalesByEmailChain = {
    select: vi.fn(() => profesionalesByEmailChain),
    ilike: vi.fn(() => profesionalesByEmailChain),
    order: vi.fn(() => profesionalesByEmailChain),
    limit: vi.fn(() => profesionalesByEmailChain),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.byEmail ?? null,
      error: null,
    }),
  };
  const rolesChain = {
    select: vi.fn(() => rolesChain),
    eq: vi.fn().mockResolvedValue({
      data: (options.roles ?? []).map((role) => ({ role })),
      error: null,
    }),
  };
  const admin = {
    from: vi.fn((table: string) => {
      if (table === "profesional_roles") {
        return rolesChain;
      }

      if (profesionalesByAuthIdChain.eq.mock.calls.length === 0) {
        return profesionalesByAuthIdChain;
      }

      return profesionalesByEmailChain;
    }),
  };

  mocks.createAdminClient.mockReturnValue(admin);

  return {
    admin,
    profesionalesByAuthIdChain,
    profesionalesByEmailChain,
    rolesChain,
  };
}

async function loadModule() {
  vi.resetModules();
  return import("@/lib/auth/roles");
}

const professional: ProfessionalRow = {
  id: 7,
  nombre_profesional: "Sara Zambrano",
  usuario_login: "sarazambrano",
  correo_profesional: "sara@reca.test",
  auth_user_id: "auth-user-1",
};

describe("current user app roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("resolves roles from profesionales by auth_user_id", async () => {
    installServerUser(createUser());
    const { profesionalesByAuthIdChain, rolesChain } = installAdminLookup({
      byAuthId: professional,
      roles: ["inclusion_empresas_admin"],
    });

    const { getCurrentUserContext } = await loadModule();
    const result = await getCurrentUserContext();

    expect(result).toMatchObject({
      ok: true,
      profile: {
        id: 7,
        displayName: "Sara Zambrano",
        usuarioLogin: "sarazambrano",
        email: "sara@reca.test",
      },
      roles: ["inclusion_empresas_admin"],
    });
    expect(profesionalesByAuthIdChain.eq).toHaveBeenCalledWith(
      "auth_user_id",
      "auth-user-1"
    );
    expect(rolesChain.eq).toHaveBeenCalledWith("profesional_id", 7);
  });

  it("falls back to profesionales by authenticated email", async () => {
    installServerUser(createUser({ email: "sara@reca.test" }));
    const { profesionalesByEmailChain } = installAdminLookup({
      byAuthId: null,
      byEmail: professional,
      roles: [],
    });

    const { getCurrentUserContext } = await loadModule();
    const result = await getCurrentUserContext();

    expect(result).toMatchObject({
      ok: true,
      profile: {
        id: 7,
        email: "sara@reca.test",
      },
      roles: [],
    });
    expect(profesionalesByEmailChain.ilike).toHaveBeenCalledWith(
      "correo_profesional",
      "sara@reca.test"
    );
  });

  it("filters unknown role strings from the database", async () => {
    installServerUser(createUser());
    installAdminLookup({
      byAuthId: professional,
      roles: ["inclusion_empresas_admin", "legacy_admin"],
    });

    const { getCurrentUserContext } = await loadModule();
    const result = await getCurrentUserContext();

    expect(result).toMatchObject({
      ok: true,
      roles: ["inclusion_empresas_admin"],
    });
  });

  it("returns 401 context when there is no authenticated user", async () => {
    installServerUser(null);

    const { getCurrentUserContext } = await loadModule();
    await expect(getCurrentUserContext()).resolves.toEqual({
      ok: false,
      status: 401,
      error: "No autenticado.",
    });
  });

  it("returns 404 context when the authenticated user has no professional row", async () => {
    installServerUser(createUser({ email: "missing@reca.test" }));
    installAdminLookup({
      byAuthId: null,
      byEmail: null,
      roles: [],
    });

    const { getCurrentUserContext } = await loadModule();
    await expect(getCurrentUserContext()).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Profesional no encontrado.",
    });
  });

  it("authorizes requests when the current user has one of the required app roles", async () => {
    installServerUser(createUser());
    installAdminLookup({
      byAuthId: professional,
      roles: ["inclusion_empresas_admin"],
    });

    const { requireAppRole } = await loadModule();
    const authorization = await requireAppRole(["inclusion_empresas_admin"]);

    expect(authorization.ok).toBe(true);
    if (authorization.ok) {
      expect(authorization.context.profile.id).toBe(7);
      expect(authorization.context.roles).toEqual(["inclusion_empresas_admin"]);
    }
  });

  it("builds a 403 response when a required app role is missing", async () => {
    installServerUser(createUser());
    installAdminLookup({
      byAuthId: professional,
      roles: [],
    });

    const { requireAppRole } = await loadModule();
    const authorization = await requireAppRole(["inclusion_empresas_admin"]);

    expect(authorization.ok).toBe(false);
    if (!authorization.ok) {
      expect(authorization.response.status).toBe(403);
      await expect(authorization.response.json()).resolves.toEqual({
        error: "No autorizado.",
      });
    }
  });

  it("blocks app-role protected APIs while the password is temporary", async () => {
    installServerUser(createUser());
    installAdminLookup({
      byAuthId: { ...professional, auth_password_temp: true },
      roles: ["inclusion_empresas_admin"],
    });

    const { requireAppRole } = await loadModule();
    const authorization = await requireAppRole(["inclusion_empresas_admin"]);

    expect(authorization.ok).toBe(false);
    if (!authorization.ok) {
      expect(authorization.response.status).toBe(403);
      await expect(authorization.response.json()).resolves.toEqual({
        error: "Cambia tu contraseña temporal antes de continuar.",
      });
    }
  });
});
