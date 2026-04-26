import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InduccionCompanySection } from "@/components/forms/inducciones/InduccionCompanySection";

const register = (name: string) => ({
  name,
  onChange: () => {},
  onBlur: () => {},
  ref: () => {},
});

describe("InduccionCompanySection", () => {
  it("renders the search panel when no company is selected", () => {
    const html = renderToStaticMarkup(
      <InduccionCompanySection
        empresa={null}
        onSelectEmpresa={() => {}}
      />
    );

    expect(html).toContain("Buscar empresa");
    expect(html).toContain("Escribe el nombre de la empresa a visitar");
  });

  it("renders the full induccion snapshot after selecting a company", () => {
    const html = renderToStaticMarkup(
      <InduccionCompanySection
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
        fechaVisita="2026-04-16"
        modalidad="Presencial"
        nitEmpresa="900123456-7"
        register={register}
        errors={{}}
        onSelectEmpresa={() => {}}
      />
    );

    expect(html).toContain("Fecha de la visita");
    expect(html).toContain("2026-04-16");
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
    expect(html).toContain("Empresa afiliada a Caja de Compensacion");
    expect(html).toContain("Compensar");
    expect(html).toContain("Sede Compensar");
    expect(html).toContain("Zona Centro");
    expect(html).not.toContain("Sede Norte");
    expect(html).toContain("Asesor");
    expect(html).toContain("Carlos Compensar");
    expect(html).toContain("Profesional asignado RECA");
    expect(html).toContain("Laura RECA");
  });
});
