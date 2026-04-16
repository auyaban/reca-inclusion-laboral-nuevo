import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
  formDraftOrderMock,
  formDraftEqMock,
  formDraftSelectMock,
  fromMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  formDraftOrderMock: vi.fn(),
  formDraftEqMock: vi.fn(),
  formDraftSelectMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { getHubInitialData } from "@/lib/drafts/hubInitialData";

describe("getHubInitialData", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    formDraftEqMock.mockReturnValue({
      order: formDraftOrderMock,
    });
    formDraftSelectMock.mockReturnValue({
      eq: formDraftEqMock,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "form_drafts") {
        return { select: formDraftSelectMock };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
      from: fromMock,
    });
  });

  it("returns panel state, user name and remote draft summaries for an authenticated user", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "aaron@example.com",
          app_metadata: {
            usuario_login: "aaron_vercel",
          },
        },
      },
      error: null,
    });
    formDraftOrderMock.mockResolvedValue({
      data: [
        {
          id: "draft-1",
          form_slug: "presentacion",
          empresa_nit: "900123",
          empresa_nombre: "Acme",
          step: 2,
          updated_at: "2026-04-16T10:00:00.000Z",
          created_at: "2026-04-16T10:00:00.000Z",
          last_checkpoint_at: "2026-04-16T10:00:00.000Z",
          last_checkpoint_hash: "hash-1",
          empresa_snapshot: {
            id: "empresa-1",
            nombre_empresa: "Acme",
            nit_empresa: "900123",
          },
        },
      ],
      error: null,
    });

    await expect(
      getHubInitialData({
        panel: "drafts",
      })
    ).resolves.toMatchObject({
      initialPanelOpen: true,
      initialUserName: "aaron_vercel",
      initialRemoteDrafts: [
        {
          id: "draft-1",
          form_slug: "presentacion",
          step: 2,
          empresa_nit: "900123",
          empresa_nombre: "Acme",
          empresa_snapshot: {
            id: "empresa-1",
            nombre_empresa: "Acme",
            nit_empresa: "900123",
          },
          updated_at: "2026-04-16T10:00:00.000Z",
          created_at: "2026-04-16T10:00:00.000Z",
          last_checkpoint_at: "2026-04-16T10:00:00.000Z",
          last_checkpoint_hash: "hash-1",
        },
      ],
    });
  });

  it("falls back to an empty authenticated shell when there is no server user", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    await expect(
      getHubInitialData({
        panel: undefined,
      })
    ).resolves.toEqual({
      initialPanelOpen: false,
      initialUserName: "Profesional",
      initialRemoteDrafts: [],
    });
    expect(formDraftSelectMock).not.toHaveBeenCalled();
  });

  it("does not break when auth returns no usable session, like the E2E bypass path", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
      error: new Error("Auth session missing"),
    });

    await expect(
      getHubInitialData({
        panel: ["drafts"],
      })
    ).resolves.toEqual({
      initialPanelOpen: true,
      initialUserName: "Profesional",
      initialRemoteDrafts: [],
    });
  });
});
