import { describe, expect, it } from "vitest";
import {
  getDefaultInduccionOrganizacionalValues,
  getInduccionOrganizacionalRecommendationForMedium,
  normalizeInduccionOrganizacionalValues,
  type InduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";
import {
  buildValidInduccionOrganizacionalValues,
  INDUCCION_ORGANIZACIONAL_TEST_EMPRESA,
} from "@/lib/testing/induccionOrganizacionalFixtures";

describe("induccionOrganizacional domain helpers", () => {
  it("creates a singleton vinculado and shared defaults", () => {
    const defaults = getDefaultInduccionOrganizacionalValues(
      INDUCCION_ORGANIZACIONAL_TEST_EMPRESA
    );

    expect(defaults.vinculado.numero).toBe("1");
    expect(defaults.section_4).toHaveLength(3);
    expect(defaults.asistentes).toHaveLength(2);
  });

  it("normalizes a legacy shape into the shared organizational contract", () => {
    const normalized = normalizeInduccionOrganizacionalValues(
      {
        fecha_visita: "2026-04-15",
        modalidad: "Mixto",
        nit_empresa: " 900123456 ",
        vinculado: {
          numero: "99",
          nombre_oferente: " Ana Perez ",
          cedula: " 123456 ",
          telefono_oferente: " 3000000000 ",
          cargo_oferente: " Analista ",
        },
        section_3: {},
        section_4: [
          { medio: "Video", recomendacion: "wrong" },
          { medio: "No aplica", recomendacion: "No aplica" },
          { medio: "", recomendacion: "" },
        ],
        section_5: { observaciones: "  Nota  " },
        asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      },
      INDUCCION_ORGANIZACIONAL_TEST_EMPRESA
    );

    expect(normalized.modalidad).toBe("Mixta");
    expect(normalized.vinculado.numero).toBe("1");
    expect(normalized.vinculado.nombre_oferente).toBe("Ana Perez");
    expect(normalized.section_4[0]?.recomendacion).toBe(
      getInduccionOrganizacionalRecommendationForMedium("Video")
    );
    expect(normalized.section_4[1]?.recomendacion).toBe("No aplica");
    expect(normalized.section_5.observaciones).toBe("Nota");
  });

  it("keeps the section_3 defaults while merging nested overrides in fixtures", () => {
    const defaults = getDefaultInduccionOrganizacionalValues(
      INDUCCION_ORGANIZACIONAL_TEST_EMPRESA
    );
    const values = buildValidInduccionOrganizacionalValues({
      section_3: {
        historia_empresa: {
          visto: "No",
          responsable: "Equipo QA",
          medio_socializacion: "Video",
          descripcion: "Override parcial",
        },
      } as Partial<InduccionOrganizacionalValues["section_3"]> as InduccionOrganizacionalValues["section_3"],
    });

    expect(values.section_3.historia_empresa).toEqual({
      visto: "No",
      responsable: "Equipo QA",
      medio_socializacion: "Video",
      descripcion: "Override parcial",
    });
    expect(Object.keys(values.section_3)).toHaveLength(
      Object.keys(defaults.section_3).length
    );
  });
});
