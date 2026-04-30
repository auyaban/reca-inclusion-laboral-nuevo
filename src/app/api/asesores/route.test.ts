import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  adminFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.authGetUser,
    },
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mocks.adminFrom,
  })),
}));

import { GET } from "@/app/api/asesores/route";

function createQueryMock(result: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  const chain = () => query;
  for (const method of ["select", "is", "order"]) {
    query[method] = vi.fn(chain);
  }
  query.then = vi.fn((resolve) => Promise.resolve(resolve(result)));
  return query;
}

describe("/api/asesores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-1" } },
      error: null,
    });
  });

  it("returns only active asesor names", async () => {
    const query = createQueryMock({
      data: [{ nombre: "Carlos Ruiz" }],
      error: null,
    });
    mocks.adminFrom.mockReturnValue(query);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    await expect(response.json()).resolves.toEqual([{ nombre: "Carlos Ruiz" }]);
  });
});
