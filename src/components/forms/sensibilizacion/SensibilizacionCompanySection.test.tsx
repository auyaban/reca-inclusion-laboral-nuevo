import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SensibilizacionCompanySection } from "@/components/forms/sensibilizacion/SensibilizacionCompanySection";

describe("SensibilizacionCompanySection", () => {
  it("renders the full section-1 summary after selecting a company", () => {
    const html = renderToStaticMarkup(
      <SensibilizacionCompanySection
        empresa={{
          id: "empresa-1",
          nombre_empresa: "Empresa Uno",
          nit_empresa: "800100200-3",
          direccion_empresa: "Calle 1 # 2-3",
          ciudad_empresa: "Bogota",
          sede_empresa: "Sede Norte",
          zona_empresa: null,
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
        fechaVisita="2026-04-14"
        modalidad="Presencial"
        nitEmpresa="900123456-7"
        onSelectEmpresa={() => {}}
      />
    );

    expect(html).toContain("Fecha de la visita");
    expect(html).toContain("2026-04-14");
    expect(html).toContain("Modalidad");
    expect(html).toContain("Presencial");
    expect(html).toContain("Nombre de la empresa");
    expect(html).toContain("Empresa Uno");
    expect(html).toContain("Ciudad / Municipio");
    expect(html).toContain("Bogota");
    expect(html).toContain("Direccion de la empresa");
    expect(html).toContain("Numero de NIT");
    expect(html).toContain("900123456-7");
    expect(html).toContain("Correo electronico");
    expect(html).toContain("Telefonos");
    expect(html).toContain("Persona que atiende la visita");
    expect(html).toContain("Cargo");
    expect(html).toContain("Asesor");
    expect(html).toContain("Sede Compensar");
  });
});
