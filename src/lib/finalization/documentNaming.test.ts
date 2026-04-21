import { describe, expect, it } from "vitest";
import { buildFinalDocumentBaseName } from "@/lib/finalization/documentNaming";

describe("documentNaming", () => {
  it("keeps the current first-name plus last-surname behavior for compound names", () => {
    expect(
      buildFinalDocumentBaseName({
        formSlug: "seleccion",
        formData: {
          fecha_visita: "2026-04-20",
          oferentes: [{ nombre_oferente: "Juan Carlos De La Torre" }],
        },
      })
    ).toBe(
      "PROCESO DE SELECCION INCLUYENTE INDIVIDUAL-Juan Torre-20_Apr_2026"
    );
  });

  it("builds different base names for presentacion and reactivacion", () => {
    expect(
      buildFinalDocumentBaseName({
        formSlug: "presentacion",
        formData: {
          fecha_visita: "2026-04-20",
          tipo_visita: "Presentación",
        },
      })
    ).toBe("PRESENTACION DEL PROGRAMA DE INCLUSION LABORAL-20_Apr_2026");

    expect(
      buildFinalDocumentBaseName({
        formSlug: "presentacion",
        formData: {
          fecha_visita: "2026-04-20",
          tipo_visita: "Reactivación",
        },
      })
    ).toBe("REACTIVACION DE LA RUTA DE INCLUSION LABORAL-20_Apr_2026");
  });

  it("preserves the current individual and group naming invariants", () => {
    expect(
      buildFinalDocumentBaseName({
        formSlug: "contratacion",
        formData: {
          fecha_visita: "2026-04-20",
          vinculados: [{ nombre_oferente: "Ana Perez" }],
        },
      })
    ).toBe("PROCESO DE CONTRATACION INCLUYENTE INDIVIDUAL-Ana Perez-20_Apr_2026");

    expect(
      buildFinalDocumentBaseName({
        formSlug: "contratacion",
        formData: {
          fecha_visita: "2026-04-20",
          vinculados: [
            { nombre_oferente: "Ana Perez" },
            { nombre_oferente: "Luis Diaz" },
          ],
        },
      })
    ).toBe("PROCESO DE CONTRATACION INCLUYENTE GRUPAL-(2)-20_Apr_2026");
  });
});
