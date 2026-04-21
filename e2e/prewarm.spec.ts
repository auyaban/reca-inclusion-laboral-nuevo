import { expect, test } from "@playwright/test";
import { openSeededForm, waitForDraftAutosave } from "./helpers/forms";

test("@integration evaluacion keeps the editor usable when prewarm is throttled", async ({
  page,
}) => {
  const warnings: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "warning") {
      warnings.push(message.text());
    }
  });

  await page.route("**/api/formularios/prewarm-google", async (route) => {
    await route.fulfill({
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "3",
      },
      body: JSON.stringify({
        success: false,
        status: "throttled",
        error: "Demasiados intentos de preparar Google. Intenta de nuevo en unos segundos.",
        retryAfterSeconds: 3,
      }),
    });
  });

  await openSeededForm(page, "evaluacion", {
    sessionId: "prewarm-throttled",
    waitForPersistedIdentity: false,
  });

  await page.getByTestId("manual-test-fill-button").click();
  await waitForDraftAutosave(page);

  await expect(page.getByTestId("long-form-root")).toBeVisible();
  await expect(page.getByTestId("long-form-title")).toContainText(/Evaluaci.n/i);
  expect(
    warnings.filter((warning) => warning.includes("[google_prewarm] failed"))
  ).toHaveLength(0);
});

test("@integration evaluacion keeps both tabs usable when prewarm returns busy", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: ".playwright/.auth/user.json",
  });
  const warnings: string[] = [];
  let requestCount = 0;

  context.on("page", (page) => {
    page.on("console", (message) => {
      if (message.type() === "warning") {
        warnings.push(message.text());
      }
    });
  });

  await context.addInitScript(() => {
    window.sessionStorage.setItem(
      "reca-empresa-seleccionada",
      JSON.stringify({
        state: {
          empresa: {
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
          },
        },
        version: 0,
      })
    );
  });

  await context.route("**/api/formularios/prewarm-google", async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: "ready",
          prewarm: {
            folderId: "folder-1",
            spreadsheetId: "sheet-1",
            bundleKey: "evaluacion",
            structureSignature: '{"asistentesCount":0}',
            activeSheetName: "2. EVALUACION DE ACCESIBILIDAD",
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 409,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "2",
      },
      body: JSON.stringify({
        success: false,
        status: "busy",
        error: "Ya hay otra preparacion de Google en curso para este borrador.",
        retryAfterSeconds: 2,
      }),
    });
  });

  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto("/formularios/evaluacion?session=prewarm-busy");
  await pageB.goto("/formularios/evaluacion?session=prewarm-busy");

  await expect(pageA.getByTestId("long-form-root")).toBeVisible();
  await expect(pageB.getByTestId("long-form-root")).toBeVisible();

  await pageA.getByTestId("manual-test-fill-button").click();
  await pageB.getByTestId("manual-test-fill-button").click();

  await expect(pageA.getByTestId("long-form-title")).toContainText(/Evaluaci.n/i);
  await expect(pageB.getByTestId("long-form-title")).toContainText(/Evaluaci.n/i);
  expect(
    warnings.filter((warning) => warning.includes("[google_prewarm] failed"))
  ).toHaveLength(0);

  await context.close();
});
