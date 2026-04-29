// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getHubDraftsDataMock } = vi.hoisted(() => ({
  getHubDraftsDataMock: vi.fn(),
}));

vi.mock("@/lib/drafts/hubInitialData", () => ({
  getHubDraftsData: getHubDraftsDataMock,
}));

import HubFormatsHome, {
  FORMS,
  HubFormDraftBadge,
} from "@/components/layout/HubFormatsHome";

describe("HubFormatsHome", () => {
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

  it("renders the formats home without requiring draft data", () => {
    getHubDraftsDataMock.mockImplementation(() => new Promise(() => {}));

    const html = renderToStaticMarkup(<HubFormatsHome initialUserId="user-1" />);

    expect(html).toContain("Intérprete LSC");
    expect(html).toContain("hub-form-card-presentacion");
    expect(html).not.toContain("Borradores guardados");
  });

  it("keeps static badges as the streaming fallback for the form grid", () => {
    getHubDraftsDataMock.mockImplementation(() => new Promise(() => {}));

    const html = renderToStaticMarkup(<HubFormatsHome initialUserId="user-1" />);

    expect(html).toContain("Nuevo");
    expect(html).toContain("Seguimientos");
  });

  it("marks enabled form cards for delegated product analytics", () => {
    getHubDraftsDataMock.mockImplementation(() => new Promise(() => {}));

    const html = renderToStaticMarkup(<HubFormatsHome initialUserId="user-1" />);

    expect(html).toContain('data-analytics-event="hub_form_opened"');
    expect(html).toContain('data-form-id="presentacion"');
    expect(html).toContain('data-form-id="interprete-lsc"');
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
