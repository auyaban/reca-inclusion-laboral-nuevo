import type { Page, Route } from "@playwright/test";

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockSuccessfulFinalization(
  page: Page,
  slug: "seleccion" | "contratacion",
  options?: {
    delayMs?: number;
  }
) {
  await page.route(`**/api/formularios/${slug}`, async (route) => {
    if (options?.delayMs) {
      await new Promise((resolve) => {
        setTimeout(resolve, options.delayMs);
      });
    }
    await fulfillJson(route, 200, {
      sheetLink: `https://example.com/${slug}/sheet`,
      pdfLink: `https://example.com/${slug}/pdf`,
    });
  });
}

export async function mockFailedFinalization(
  page: Page,
  slug: "seleccion" | "contratacion",
  error = "No se pudo publicar el acta de prueba."
) {
  await page.route(`**/api/formularios/${slug}`, async (route) => {
    await fulfillJson(route, 500, {
      error,
    });
  });
}
