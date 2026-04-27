// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getHubDraftsDataMock } = vi.hoisted(() => ({
  getHubDraftsDataMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/actaTabs", () => ({
  registerHubTabListener: vi.fn(() => () => {}),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signOut: vi.fn(),
    },
  })),
}));

vi.mock("@/lib/drafts/hubInitialData", () => ({
  getHubDraftsData: getHubDraftsDataMock,
}));

import HubMenu, {
  FORMS,
  HubFormDraftBadge,
} from "@/components/layout/HubMenu";

describe("HubMenu", () => {
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
    const interpreteLsc = FORMS.find((form) => form.id === "interprete-lsc");

    expect(evaluacion?.available).toBe(true);
    expect(condicionesVacante?.available).toBe(true);
    expect(seleccion?.available).toBe(true);
    expect(contratacion?.available).toBe(true);
    expect(induccionOrganizacional?.available).toBe(true);
    expect(induccionOperativa?.available).toBe(true);
    expect(interpreteLsc?.available).toBe(true);
  });

  it("renders the server shell without requiring draft data", () => {
    getHubDraftsDataMock.mockImplementation(() => new Promise(() => {}));

    const html = renderToStaticMarkup(
      <HubMenu
        initialPanelOpen={false}
        initialUserName="aaron_vercel"
        initialUserId="user-1"
        adminEntry={null}
        draftsControls={<button type="button">Borradores (...)</button>}
      />
    );

    expect(html).toContain("aaron_vercel");
    expect(html).toContain("Borradores (...)");
    expect(html).toContain("Intérprete LSC");
    expect(html).toContain("hub-form-card-presentacion");
    expect(html).not.toContain("Borradores guardados");
  });

  it("renders the draft cleanup admin slot when provided", () => {
    const html = renderToStaticMarkup(
      <HubMenu
        initialPanelOpen={false}
        initialUserName="aaron_vercel"
        initialUserId="user-1"
        adminEntry={
          <a href="/hub/admin/borradores" data-testid="hub-admin-draft-cleanup-link">
            Admin
          </a>
        }
        draftsControls={<button type="button">Borradores (...)</button>}
      />
    );

    expect(html).toContain("Admin");
    expect(html).toContain("hub-admin-draft-cleanup-link");
  });

  it("omits the draft cleanup admin entry when the admin slot is empty", () => {
    const html = renderToStaticMarkup(
      <HubMenu
        initialPanelOpen={false}
        initialUserName="profesional"
        initialUserId="user-2"
        adminEntry={null}
        draftsControls={<button type="button">Borradores (...)</button>}
      />
    );

    expect(html).not.toContain("hub-admin-draft-cleanup-link");
  });

  it("keeps static badges as the streaming fallback for the form grid", () => {
    getHubDraftsDataMock.mockImplementation(() => new Promise(() => {}));

    const html = renderToStaticMarkup(
      <HubMenu
        initialPanelOpen={false}
        initialUserName="Profesional"
        initialUserId="user-1"
        adminEntry={null}
        draftsControls={<button type="button">Borradores (...)</button>}
      />
    );

    expect(html).toContain("Nuevo");
    expect(html).toContain("Seguimientos");
  });

  it("renders draft count badges after draft data resolves", async () => {
    getHubDraftsDataMock.mockResolvedValue({
      initialRemoteDrafts: [
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
      ],
    });

    const badge = await HubFormDraftBadge({
      formId: "presentacion",
      userId: "user-1",
    });
    const html = renderToStaticMarkup(<>{badge}</>);

    expect(html).toContain("1 borrador");
  });
});
