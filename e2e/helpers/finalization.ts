import type { Page, Route } from "@playwright/test";

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

type MockFinalizationSlug =
  | "presentacion"
  | "sensibilizacion"
  | "condiciones-vacante"
  | "seleccion"
  | "contratacion"
  | "induccion-organizacional"
  | "induccion-operativa";

function buildSuccessBody(slug: MockFinalizationSlug) {
  return {
    sheetLink: `https://example.com/${slug}/sheet`,
    ...(
      slug === "sensibilizacion"
        ? {}
        : { pdfLink: `https://example.com/${slug}/pdf` }
    ),
  };
}

export async function mockSuccessfulFinalization(
  page: Page,
  slug: MockFinalizationSlug,
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
    await fulfillJson(route, 200, buildSuccessBody(slug));
  });
}

export async function mockFailedFinalization(
  page: Page,
  slug: MockFinalizationSlug,
  error = "No se pudo publicar el acta de prueba."
) {
  await page.route(`**/api/formularios/${slug}`, async (route) => {
    await fulfillJson(route, 500, {
      error,
    });
  });
}

export async function mockDelayedFinalization(
  page: Page,
  slug: MockFinalizationSlug,
  delayMs: number
) {
  await page.route(`**/api/formularios/${slug}`, async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });

    await fulfillJson(route, 200, buildSuccessBody(slug));
  });
}

export async function mockFinalizationStatusResponses(
  page: Page,
  responses: Array<{ status: number; body: unknown }>
) {
  let callIndex = 0;

  await page.route("**/api/formularios/finalization-status", async (route) => {
    const nextResponse =
      responses[Math.min(callIndex, Math.max(0, responses.length - 1))] ?? {
        status: 404,
        body: { status: "not_found" },
      };

    callIndex += 1;
    await fulfillJson(route, nextResponse.status, nextResponse.body);
  });
}
