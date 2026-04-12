import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

function createSupabaseClient(
  responses: Array<{ data: unknown; error: unknown }>
) {
  const calls: string[] = [];
  const nextResponse = async () => responses.shift() ?? { data: null, error: null };

  return {
    calls,
    client: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "user-1" } } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn((fields: string) => {
          calls.push(fields);

          const chain = {
            eq: vi.fn(() => chain),
            order: vi.fn(() => nextResponse()),
            not: vi.fn(() => nextResponse()),
            maybeSingle: vi.fn(() => nextResponse()),
            single: vi.fn(() => nextResponse()),
            limit: vi.fn(() => chain),
          };

          return chain;
        }),
      })),
    },
  };
}

describe("drafts remote schema fallbacks", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
  });

  it("falls back from checkpoint columns to legacy schema in runDraftSelect", async () => {
    const drafts = await import("@/lib/drafts");
    const calls: string[] = [];

    const result = await drafts.runDraftSelect("payload", async (fields) => {
      calls.push(fields);

      if (calls.length < 3) {
        return {
          data: null,
          error: { code: "42703" },
        };
      }

      return {
        data: { id: "draft-1" },
        error: null,
      };
    });

    expect(result).toEqual({
      data: { id: "draft-1" },
      error: null,
    });
    expect(calls).toHaveLength(3);
    expect(calls[0]).toContain("last_checkpoint_at");
    expect(calls[1]).not.toContain("last_checkpoint_at");
    expect(calls[2]).not.toContain("created_at");
    expect(drafts.getCheckpointColumnsMode()).toBe("unsupported");
    expect(drafts.getDraftSchemaMode()).toBe("legacy");
  });

  it("returns recoverable remote draft ids directly when the lightweight query works", async () => {
    const supabase = createSupabaseClient([
      {
        data: [{ id: "draft-1" }, { id: "draft-2" }],
        error: null,
      },
    ]);
    createClientMock.mockReturnValue(supabase.client);
    const drafts = await import("@/lib/drafts");

    const ids = await drafts.fetchRecoverableRemoteDraftIds("user-1");

    expect(ids).toEqual(["draft-1", "draft-2"]);
    expect(supabase.calls).toEqual(["id"]);
  });

  it("falls back to summaries when the lightweight recoverable query fails", async () => {
    const supabase = createSupabaseClient([
      {
        data: null,
        error: { message: "column last_checkpoint_at does not exist" },
      },
      {
        data: [
          {
            id: "draft-with-checkpoint",
            form_slug: "presentacion",
            empresa_nit: "9001",
            empresa_nombre: "Empresa Uno",
            step: 1,
            updated_at: "2026-04-12T18:00:00.000Z",
            created_at: "2026-04-12T17:00:00.000Z",
            last_checkpoint_at: "2026-04-12T18:00:00.000Z",
          },
          {
            id: "draft-without-checkpoint",
            form_slug: "sensibilizacion",
            empresa_nit: "9002",
            empresa_nombre: "Empresa Dos",
            step: 2,
            updated_at: "2026-04-12T17:30:00.000Z",
            created_at: "2026-04-12T17:00:00.000Z",
            last_checkpoint_at: null,
          },
        ],
        error: null,
      },
    ]);
    createClientMock.mockReturnValue(supabase.client);
    const drafts = await import("@/lib/drafts");

    const ids = await drafts.fetchRecoverableRemoteDraftIds("user-1");

    expect(ids).toEqual(["draft-with-checkpoint"]);
    expect(supabase.calls).toHaveLength(2);
    expect(supabase.calls[0]).toBe("id");
    expect(supabase.calls[1]).toContain("last_checkpoint_at");
  });
});
