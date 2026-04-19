import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { useDraftsHubMock } = vi.hoisted(() => ({
  useDraftsHubMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@/hooks/useDraftsHub", () => ({
  useDraftsHub: useDraftsHubMock,
}));

vi.mock("@/lib/actaTabs", () => ({
  openActaTab: vi.fn(),
  registerHubTabListener: vi.fn(() => () => {}),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signOut: vi.fn(),
    },
  })),
}));

import HubMenu, { FORMS } from "@/components/layout/HubMenu";

describe("HubMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useDraftsHubMock.mockReturnValue({
      hubDrafts: [],
      draftsCount: 0,
      loading: false,
      deleteHubDraft: vi.fn(),
    });
  });

  it("keeps evaluacion enabled alongside the migrated forms", () => {
    const evaluacion = FORMS.find((form) => form.id === "evaluacion");
    const condicionesVacante = FORMS.find(
      (form) => form.id === "condiciones-vacante"
    );
    const seleccion = FORMS.find((form) => form.id === "seleccion");
    const contratacion = FORMS.find((form) => form.id === "contratacion");
    const induccionOrganizacional = FORMS.find(
      (form) => form.id === "induccion-organizacional"
    );
    const induccionOperativa = FORMS.find(
      (form) => form.id === "induccion-operativa"
    );

    expect(evaluacion?.available).toBe(true);
    expect(condicionesVacante?.available).toBe(true);
    expect(seleccion?.available).toBe(true);
    expect(contratacion?.available).toBe(true);
    expect(induccionOrganizacional?.available).toBe(true);
    expect(induccionOperativa?.available).toBe(true);
  });

  it("renders the shell with seeded user and remote drafts", () => {
    const initialRemoteDrafts = [
      {
        id: "draft-1",
        form_slug: "presentacion",
        step: 2,
        empresa_nit: "900123",
        empresa_nombre: "Acme",
        empresa_snapshot: null,
        updated_at: "2026-04-16T10:00:00.000Z",
        created_at: "2026-04-16T10:00:00.000Z",
        last_checkpoint_at: "2026-04-16T10:00:00.000Z",
        last_checkpoint_hash: "hash-1",
      },
    ];

    useDraftsHubMock.mockReturnValue({
      hubDrafts: initialRemoteDrafts,
      draftsCount: 1,
      loading: true,
      deleteHubDraft: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <HubMenu
        initialPanelOpen={false}
        initialUserName="aaron_vercel"
        initialRemoteDrafts={initialRemoteDrafts}
      />
    );

    expect(html).toContain("aaron_vercel");
    expect(html).toContain("Borradores (1)");
    expect(html).not.toContain("Borradores guardados");
    expect(useDraftsHubMock).toHaveBeenCalledWith({
      initialRemoteDrafts,
      initialRemoteReady: true,
    });
  });

  it("renders the drafts drawer from the seeded query-param state", () => {
    const html = renderToStaticMarkup(
      <HubMenu
        initialPanelOpen
        initialUserName="Profesional"
        initialRemoteDrafts={[]}
      />
    );

    expect(html).toContain("Borradores guardados");
    expect(html).toContain("No tienes borradores guardados.");
  });
});
