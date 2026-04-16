import { expect, type Page, type Route } from "@playwright/test";

const SEARCH_RESULT = {
  cedula_usuario: "1000061994",
  nombre_usuario: "Ana Perez",
};

const DETAIL_RECORD = {
  cedula_usuario: "1000061994",
  nombre_usuario: "Ana Perez",
  genero_usuario: "Femenino",
  discapacidad_usuario: "Auditiva",
  discapacidad_detalle: "Discapacidad auditiva",
  certificado_discapacidad: "Si",
  certificado_porcentaje: "45",
  telefono_oferente: "3001112233",
  fecha_nacimiento: "1990-01-01",
  cargo_oferente: "Analista",
  contacto_emergencia: "Mario Perez",
  parentesco: "Hermano",
  telefono_emergencia: "3010000000",
  correo_oferente: "ana@correo.com",
  lgtbiq: "No aplica",
  grupo_etnico: "No",
  grupo_etnico_cual: "No aplica",
  lugar_firma_contrato: "Bogota",
  fecha_firma_contrato: "2026-04-15",
  tipo_contrato: "Contrato de trabajo a termino fijo",
  fecha_fin: "2027-04-15",
  resultado_certificado: "Aprobado",
  pendiente_otros_oferentes: "No",
  cuenta_pension: "Si",
  tipo_pension: "Pension Invalidez",
  empresa_nit: "900123456",
  empresa_nombre: "ACME SAS",
};

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function loadByEnter(page: Page, dataTestIdBase: string, cedula: string) {
  const lookupInput = page.getByTestId(`${dataTestIdBase}.lookup-input`);
  await lookupInput.fill(cedula);
  await lookupInput.press("Enter");
}

async function loadBySuggestionClick(
  page: Page,
  dataTestIdBase: string,
  query: string,
  cedula: string
) {
  const lookupInput = page.getByTestId(`${dataTestIdBase}.lookup-input`);
  const suggestion = page.getByTestId(
    `${dataTestIdBase}.lookup-suggestion-${cedula}`
  );
  const loadButton = page.getByTestId(`${dataTestIdBase}.lookup-load-button`);

  await lookupInput.fill(query);
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(lookupInput).toHaveValue(cedula);
  await expect(loadButton).toBeEnabled();
  await loadButton.click();
}

export async function mockUsuariosReca(page: Page) {
  await page.route("**/api/usuarios-reca?query=*", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("query") ?? "";

    if (query.length < 3) {
      await fulfillJson(route, []);
      return;
    }

    if ("1000061994".startsWith(query)) {
      await fulfillJson(route, [SEARCH_RESULT]);
      return;
    }

    await fulfillJson(route, []);
  });

  await page.route("**/api/usuarios-reca/1000061994", async (route) => {
    await fulfillJson(route, DETAIL_RECORD);
  });
}

export async function loadContratacionUsuariosRecaByEnter(page: Page) {
  await loadByEnter(page, "vinculados.0", "1000061994");
}

export async function loadContratacionUsuariosRecaBySuggestion(page: Page) {
  await loadBySuggestionClick(page, "vinculados.0", "100", "1000061994");
}

export async function loadSeleccionUsuariosRecaByEnter(page: Page) {
  await loadByEnter(page, "oferentes.0", "1000061994");
}

export async function loadSeleccionUsuariosRecaBySuggestion(page: Page) {
  await loadBySuggestionClick(page, "oferentes.0", "100", "1000061994");
}
