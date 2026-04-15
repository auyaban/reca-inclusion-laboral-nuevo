import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PresentacionEmpresaSection } from "@/components/forms/presentacion/PresentacionEmpresaSection";

describe("PresentacionEmpresaSection", () => {
  it("prefers zona compensar over sede empresa in the company summary", () => {
    const html = renderToStaticMarkup(
      <PresentacionEmpresaSection
        empresa={{
          id: "empresa-1",
          nombre_empresa: "Empresa Uno",
          nit_empresa: "800100200-3",
          direccion_empresa: "Calle 1 # 2-3",
          ciudad_empresa: "Bogota",
          sede_empresa: "Sede Norte",
          zona_empresa: "Zona Centro",
          correo_1: "contacto@empresa.com",
          contacto_empresa: "Ana Perez",
          telefono_empresa: "6010000000",
          cargo: "Coordinadora",
          profesional_asignado: "Laura RECA",
          correo_profesional: "laura@reca.com",
          asesor: "Carlos Compensar",
          correo_asesor: "carlos@compensar.com",
          caja_compensacion: "Compensar",
        }}
        onSelectEmpresa={() => {}}
      />
    );

    expect(html).toContain("Sede Compensar");
    expect(html).toContain("Zona Centro");
    expect(html).not.toContain("Sede Norte");
  });
});
