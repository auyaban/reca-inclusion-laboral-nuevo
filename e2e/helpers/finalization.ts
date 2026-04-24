import type { Page, Route } from "@playwright/test";

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

type LongFormRenderMetrics = {
  loadingStateAdds: number;
  rootAdds: number;
  rootRemovals: number;
};

type MockFinalizationSlug =
  | "presentacion"
  | "sensibilizacion"
  | "condiciones-vacante"
  | "seleccion"
  | "contratacion"
  | "interprete-lsc"
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

export async function installLongFormRenderObserver(page: Page) {
  await page.addInitScript(() => {
    const metrics = {
      loadingStateAdds: 0,
      rootAdds: 0,
      rootRemovals: 0,
    };

    const countMatches = (node: Node, selector: string) => {
      if (!(node instanceof Element)) {
        return 0;
      }

      let matches = node.matches(selector) ? 1 : 0;
      matches += node.querySelectorAll(selector).length;
      return matches;
    };

    const observe = () => {
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          record.addedNodes.forEach((node) => {
            metrics.loadingStateAdds += countMatches(
              node,
              '[data-testid="long-form-loading-state"]'
            );
            metrics.rootAdds += countMatches(
              node,
              '[data-testid="long-form-root"]'
            );
          });

          record.removedNodes.forEach((node) => {
            metrics.rootRemovals += countMatches(
              node,
              '[data-testid="long-form-root"]'
            );
          });
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      metrics.loadingStateAdds += document.querySelectorAll(
        '[data-testid="long-form-loading-state"]'
      ).length;
      metrics.rootAdds += document.querySelectorAll(
        '[data-testid="long-form-root"]'
      ).length;
    };

    (
      window as Window & {
        __RECA_LONG_FORM_RENDER_METRICS__?: LongFormRenderMetrics;
      }
    ).__RECA_LONG_FORM_RENDER_METRICS__ = metrics;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observe, { once: true });
    } else {
      observe();
    }
  });
}

export async function resetLongFormRenderMetrics(page: Page) {
  await page.evaluate(() => {
    const metrics = (
      window as Window & {
        __RECA_LONG_FORM_RENDER_METRICS__?: LongFormRenderMetrics;
      }
    ).__RECA_LONG_FORM_RENDER_METRICS__;

    if (!metrics) {
      return;
    }

    metrics.loadingStateAdds = 0;
    metrics.rootAdds = 0;
    metrics.rootRemovals = 0;
  });
}

export async function readLongFormRenderMetrics(
  page: Page
): Promise<LongFormRenderMetrics> {
  return page.evaluate(() => {
    return (
      (
        window as Window & {
          __RECA_LONG_FORM_RENDER_METRICS__?: LongFormRenderMetrics;
        }
      ).__RECA_LONG_FORM_RENDER_METRICS__ ?? {
        loadingStateAdds: 0,
        rootAdds: 0,
        rootRemovals: 0,
      }
    );
  });
}
