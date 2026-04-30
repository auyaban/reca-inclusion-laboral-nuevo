import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  restoreCatalogoRecord: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/catalogos/server", () => ({
  restoreCatalogoRecord: mocks.restoreCatalogoRecord,
}));

import { POST } from "@/app/api/empresas/interpretes/[id]/restore/route";

const adminAuth = {
  ok: true,
  context: {
    user: { id: "auth-user-1" },
    profile: { id: 1, displayName: "Aaron Vercel" },
    roles: ["inclusion_empresas_admin"],
  },
};

const routeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("/api/empresas/interpretes/[id]/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("restores interpretes by id for admins", async () => {
    mocks.restoreCatalogoRecord.mockResolvedValue({
      id: "inter-1",
      nombre: "Laura Pérez",
      deleted_at: null,
    });

    const response = await POST(
      new Request("http://localhost/api/empresas/interpretes/inter-1/restore", {
        method: "POST",
      }),
      routeContext("inter-1")
    );

    expect(response.status).toBe(200);
    expect(mocks.restoreCatalogoRecord).toHaveBeenCalledWith({
      kind: "interpretes",
      id: "inter-1",
    });
  });
});
