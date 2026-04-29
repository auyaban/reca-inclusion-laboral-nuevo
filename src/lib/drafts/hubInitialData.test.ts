import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
  formDraftOrderMock,
  formDraftIsMock,
  formDraftEqMock,
  formDraftSelectMock,
  fromMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  formDraftOrderMock: vi.fn(),
  formDraftIsMock: vi.fn(),
  formDraftEqMock: vi.fn(),
  formDraftSelectMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import {
  getHubAdminData,
  getHubDraftsData,
  getHubShellData,
} from "@/lib/drafts/hubInitialData";

describe("hubInitialData split helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    formDraftIsMock.mockReturnValue({
      order: formDraftOrderMock,
    });
    formDraftEqMock.mockReturnValue({
      is: formDraftIsMock,
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

  it("returns shell data for an authenticated user without querying drafts", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-shell",
          email: "profesional@example.com",
          app_metadata: {},
        },
      },
      error: null,
    });

    await expect(
      getHubShellData({
        panel: "drafts",
      })
    ).resolves.toEqual({
      initialPanelOpen: true,
      initialUserName: "profesional",
      initialCanManageDraftCleanup: false,
      initialUserId: "user-shell",
      initialUser: {
        id: "user-shell",
        email: "profesional@example.com",
        app_metadata: {},
      },
    });
    expect(formDraftSelectMock).not.toHaveBeenCalled();
  });

  it("returns an empty shell when there is no server user", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    await expect(
      getHubShellData({
        panel: undefined,
      })
    ).resolves.toEqual({
      initialPanelOpen: false,
      initialUserName: "Profesional",
      initialCanManageDraftCleanup: false,
      initialUserId: null,
      initialUser: null,
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
      getHubShellData({
        panel: ["drafts"],
      })
    ).resolves.toEqual({
      initialPanelOpen: true,
      initialUserName: "Profesional",
      initialCanManageDraftCleanup: false,
      initialUserId: null,
      initialUser: null,
    });
  });

  it("returns remote draft summaries for the current user", async () => {
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

    await expect(getHubDraftsData("user-drafts")).resolves.toMatchObject({
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

  it("returns draft cleanup admin capability for the shell user", async () => {
    await expect(
      getHubAdminData({
        id: "user-admin",
        email: "aaron@example.com",
        app_metadata: {
          usuario_login: "aaron_vercel",
        },
        user_metadata: {},
      })
    ).resolves.toEqual({
      initialCanManageDraftCleanup: true,
    });
  });
});
