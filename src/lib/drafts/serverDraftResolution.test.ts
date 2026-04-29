import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  formDraftMaybeSingleMock,
  formDraftIsMock,
  formDraftEqMock,
  formDraftSelectMock,
  empresaMaybeSingleMock,
  empresaLimitMock,
  empresaIsMock,
  empresaEqMock,
  empresaSelectMock,
  fromMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  formDraftMaybeSingleMock: vi.fn(),
  formDraftIsMock: vi.fn(),
  formDraftEqMock: vi.fn(),
  formDraftSelectMock: vi.fn(),
  empresaMaybeSingleMock: vi.fn(),
  empresaLimitMock: vi.fn(),
  empresaIsMock: vi.fn(),
  empresaEqMock: vi.fn(),
  empresaSelectMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { resolveInitialDraftResolution } from "@/lib/drafts/serverDraftResolution";

describe("resolveInitialDraftResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    formDraftIsMock.mockReturnValue({
      maybeSingle: formDraftMaybeSingleMock,
    });
    formDraftEqMock.mockReturnValue({
      is: formDraftIsMock,
    });
    formDraftSelectMock.mockReturnValue({
      eq: formDraftEqMock,
    });

    empresaLimitMock.mockReturnValue({
      maybeSingle: empresaMaybeSingleMock,
    });
    empresaIsMock.mockReturnValue({
      limit: empresaLimitMock,
    });
    empresaEqMock.mockReturnValue({
      is: empresaIsMock,
    });
    empresaSelectMock.mockReturnValue({
      eq: empresaEqMock,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "form_drafts") {
        return { select: formDraftSelectMock };
      }

      if (table === "empresas") {
        return { select: empresaSelectMock };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    createClientMock.mockResolvedValue({
      from: fromMock,
    });

    empresaMaybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it("returns ready for a valid draft owned by the current user", async () => {
    formDraftMaybeSingleMock.mockResolvedValue({
      data: {
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
        data: {
          observaciones: "Draft remoto",
        },
      },
      error: null,
    });

    await expect(
      resolveInitialDraftResolution({
        draftId: "draft-1",
        expectedSlug: "presentacion",
      })
    ).resolves.toMatchObject({
      status: "ready",
      draft: {
        id: "draft-1",
        form_slug: "presentacion",
        step: 2,
        data: {
          observaciones: "Draft remoto",
        },
      },
      empresa: {
        id: "empresa-1",
        nombre_empresa: "Acme",
        nit_empresa: "900123",
      },
    });
    expect(empresaSelectMock).not.toHaveBeenCalled();
  });

  it("excludes soft-deleted empresas when rebuilding a draft from NIT", async () => {
    formDraftMaybeSingleMock.mockResolvedValue({
      data: {
        id: "draft-1",
        form_slug: "presentacion",
        empresa_nit: "900123",
        empresa_nombre: "Acme",
        step: 2,
        updated_at: "2026-04-16T10:00:00.000Z",
        created_at: "2026-04-16T10:00:00.000Z",
        last_checkpoint_at: "2026-04-16T10:00:00.000Z",
        last_checkpoint_hash: "hash-1",
        empresa_snapshot: null,
        data: {},
      },
      error: null,
    });
    empresaMaybeSingleMock.mockResolvedValue({
      data: {
        id: "empresa-1",
        nombre_empresa: "Acme",
        nit_empresa: "900123",
      },
      error: null,
    });

    await expect(
      resolveInitialDraftResolution({
        draftId: "draft-1",
        expectedSlug: "presentacion",
      })
    ).resolves.toMatchObject({
      status: "ready",
      empresa: {
        id: "empresa-1",
        nit_empresa: "900123",
      },
    });

    expect(empresaEqMock).toHaveBeenCalledWith("nit_empresa", "900123");
    expect(empresaIsMock).toHaveBeenCalledWith("deleted_at", null);
    expect(empresaLimitMock).toHaveBeenCalledWith(1);
  });

  it("returns an error when the draft does not exist", async () => {
    formDraftMaybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      resolveInitialDraftResolution({
        draftId: "draft-missing",
        expectedSlug: "presentacion",
      })
    ).resolves.toEqual({
      status: "error",
      message:
        "No se pudo abrir el borrador solicitado. Verifica que siga disponible.",
    });
  });

  it("returns an error when RLS hides the draft from another user", async () => {
    formDraftMaybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      resolveInitialDraftResolution({
        draftId: "draft-from-other-user",
        expectedSlug: "presentacion",
      })
    ).resolves.toEqual({
      status: "error",
      message:
        "No se pudo abrir el borrador solicitado. Verifica que siga disponible.",
    });
  });

  it("returns an error when the draft slug does not match the route slug", async () => {
    formDraftMaybeSingleMock.mockResolvedValue({
      data: {
        id: "draft-1",
        form_slug: "sensibilizacion",
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
        data: {},
      },
      error: null,
    });

    await expect(
      resolveInitialDraftResolution({
        draftId: "draft-1",
        expectedSlug: "presentacion",
      })
    ).resolves.toEqual({
      status: "error",
      message:
        "No se pudo abrir el borrador solicitado. Verifica que siga disponible.",
    });
  });
});
