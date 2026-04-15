import { describe, expect, it } from "vitest";
import type { HubDraft } from "@/lib/drafts";
import { buildDraftPreview, buildHubDraftDisplays } from "@/lib/draftLabels";

describe("draftLabels", () => {
  it("builds a vacancy preview from the draft snapshot", () => {
    expect(
      buildDraftPreview("condiciones-vacante", {
        nombre_vacante: "Auxiliar de bodega",
        numero_vacantes: "3",
        fecha_visita: "2026-04-14",
      })
    ).toEqual({
      title: "Auxiliar de bodega",
      quantityLabel: "3 vacantes",
      visitDate: "2026-04-14T00:00:00.000Z",
    });
  });

  it("adds a similarity badge when two drafts share form, company and title", () => {
    const displays = buildHubDraftDisplays([
      {
        id: "draft-1",
        form_slug: "condiciones-vacante",
        empresa_nit: "9001",
        empresa_nombre: "Empresa Uno",
        empresa_snapshot: null,
        step: 4,
        draftId: "draft-1",
        sessionId: "session-1",
        localUpdatedAt: "2026-04-14T10:00:00.000Z",
        remoteUpdatedAt: null,
        effectiveUpdatedAt: "2026-04-14T10:00:00.000Z",
        syncStatus: "local_only",
        preview: {
          title: "Auxiliar de bodega",
          quantityLabel: "2 vacantes",
        },
      },
      {
        id: "draft-2",
        form_slug: "condiciones-vacante",
        empresa_nit: "9001",
        empresa_nombre: "Empresa Uno",
        empresa_snapshot: null,
        step: 4,
        draftId: "draft-2",
        sessionId: "session-2",
        localUpdatedAt: "2026-04-14T09:30:00.000Z",
        remoteUpdatedAt: null,
        effectiveUpdatedAt: "2026-04-14T09:30:00.000Z",
        syncStatus: "local_only",
        preview: {
          title: "Auxiliar de bodega",
          quantityLabel: "1 vacante",
        },
      },
      {
        id: "draft-3",
        form_slug: "condiciones-vacante",
        empresa_nit: "9001",
        empresa_nombre: "Empresa Uno",
        empresa_snapshot: null,
        step: 4,
        draftId: "draft-3",
        sessionId: "session-3",
        localUpdatedAt: "2026-04-14T08:00:00.000Z",
        remoteUpdatedAt: null,
        effectiveUpdatedAt: "2026-04-14T08:00:00.000Z",
        syncStatus: "local_only",
        preview: {
          title: "Operario de producción",
        },
      },
    ] satisfies HubDraft[]);

    expect(displays.map((display) => display.primaryLabel)).toEqual([
      "Auxiliar de bodega",
      "Auxiliar de bodega",
      "Operario de producción",
    ]);
    expect(displays[0]?.similarityBadge).toBe("Similar 1/2");
    expect(displays[1]?.similarityBadge).toBe("Similar 2/2");
    expect(displays[2]?.similarityBadge).toBeNull();
  });
});
