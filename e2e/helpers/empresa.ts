import type { Page } from "@playwright/test";

export const TEST_EMPRESA = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: null,
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@reca.com",
  caja_compensacion: "Compensar",
} as const;

export async function seedEmpresaSelection(page: Page) {
  await page.addInitScript((empresa) => {
    window.sessionStorage.setItem(
      "reca-empresa-seleccionada",
      JSON.stringify({
        state: { empresa },
        version: 0,
      })
    );
  }, TEST_EMPRESA);
}
