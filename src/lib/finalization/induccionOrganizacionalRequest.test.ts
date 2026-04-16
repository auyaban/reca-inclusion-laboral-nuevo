import { describe, expect, it } from "vitest";
import { buildRequestHash } from "@/lib/finalization/idempotency";
import { buildInduccionOrganizacionalRequestHash } from "@/lib/finalization/induccionOrganizacionalRequest";

describe("induccionOrganizacionalRequest", () => {
  it("uses the shared request hash helper for stable payload hashing", () => {
    const payload = {
      section_4: [
        {
          medio: "Video",
          recomendacion: "Recomendacion",
        },
      ],
      vinculado: {
        cargo_oferente: "Analista",
        cedula: "123456",
        nombre_oferente: "Ana Perez",
        numero: "1",
        telefono_oferente: "3001234567",
      },
    };

    const variant = {
      vinculado: {
        telefono_oferente: "3001234567",
        numero: "1",
        nombre_oferente: "Ana Perez",
        cedula: "123456",
        cargo_oferente: "Analista",
      },
      section_4: [
        {
          recomendacion: "Recomendacion",
          medio: "Video",
        },
      ],
    };

    expect(buildInduccionOrganizacionalRequestHash(payload as never)).toBe(
      buildRequestHash(payload)
    );
    expect(buildInduccionOrganizacionalRequestHash(payload as never)).toBe(
      buildInduccionOrganizacionalRequestHash(variant as never)
    );
  });
});
