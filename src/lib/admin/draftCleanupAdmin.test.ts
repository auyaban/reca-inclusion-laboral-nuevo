import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createAdminClient,
}));

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "aaron@example.com",
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  };
}

function installServerUser(user: unknown, error: unknown = null) {
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error,
      }),
    },
  });
}

function installAdminLookup(rows: unknown[]) {
  const chain = {
    select: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  const admin = {
    from: vi.fn(() => chain),
  };
  mocks.createAdminClient.mockReturnValue(admin);
  return { admin, chain };
}

async function loadModule() {
  vi.resetModules();
  return import("@/lib/admin/draftCleanupAdmin");
}

describe("draft cleanup admin authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("allows aaron_vercel from app metadata", async () => {
    installServerUser(
      createUser({
        app_metadata: { usuario_login: "aaron_vercel" },
      })
    );

    const { authorizeDraftCleanupAdmin } = await loadModule();
    const authorization = await authorizeDraftCleanupAdmin();

    expect(authorization).toMatchObject({
      ok: true,
      usuarioLogin: "aaron_vercel",
    });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("allows aaron_vercel resolved from profesionales by email", async () => {
    installServerUser(createUser({ app_metadata: {} }));
    const { chain } = installAdminLookup([{ usuario_login: "aaron_vercel" }]);

    const { authorizeDraftCleanupAdmin } = await loadModule();
    const authorization = await authorizeDraftCleanupAdmin();

    expect(authorization).toMatchObject({
      ok: true,
      usuarioLogin: "aaron_vercel",
    });
    expect(chain.ilike).toHaveBeenCalledWith(
      "correo_profesional",
      "aaron@example.com"
    );
  });

  it("rejects authenticated users with a different usuario_login", async () => {
    installServerUser(
      createUser({
        app_metadata: { usuario_login: "otra_persona" },
      })
    );

    const { authorizeDraftCleanupAdmin } = await loadModule();
    await expect(authorizeDraftCleanupAdmin()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "No autorizado.",
    });
  });

  it("rejects users without a resolvable usuario_login", async () => {
    installServerUser(createUser({ email: "missing@example.com", app_metadata: {} }));
    installAdminLookup([]);

    const { authorizeDraftCleanupAdmin } = await loadModule();
    await expect(authorizeDraftCleanupAdmin()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "No autorizado.",
    });
  });

  it("does not trust user_metadata for authorization", async () => {
    installServerUser(
      createUser({
        app_metadata: {},
        user_metadata: { usuario_login: "aaron_vercel" },
      })
    );
    installAdminLookup([]);

    const { authorizeDraftCleanupAdmin } = await loadModule();
    await expect(authorizeDraftCleanupAdmin()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "No autorizado.",
    });
  });

  it("rejects unauthenticated requests", async () => {
    installServerUser(null);

    const { authorizeDraftCleanupAdmin } = await loadModule();
    await expect(authorizeDraftCleanupAdmin()).resolves.toEqual({
      ok: false,
      status: 401,
      error: "No autenticado.",
    });
  });
});

