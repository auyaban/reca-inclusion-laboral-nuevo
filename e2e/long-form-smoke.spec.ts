import { expect, test, type Locator } from "@playwright/test";
import { openSeededForm } from "./helpers/forms";

async function clickStableControl(locator: Locator) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.click({ force: attempt > 0 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await locator.page().waitForTimeout(150);
    }
  }
}

async function fillStableField(locator: Locator, value: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.fill(value);
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await locator.page().waitForTimeout(150);
    }
  }
}

async function expectStableValue(locator: Locator, value: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await expect(locator).toHaveValue(value);
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await locator.page().waitForTimeout(150);
    }
  }
}

test("@smoke seleccion shows the light gate before empresa or draft", async ({ page }) => {
  await page.goto("/formularios/seleccion");
  await expect(page.getByTestId("long-form-company-gate")).toBeVisible();
});

test("@smoke contratacion shows the light gate before empresa or draft", async ({ page }) => {
  await page.goto("/formularios/contratacion");
  await expect(page.getByTestId("long-form-company-gate")).toBeVisible();
});

test("@smoke seleccion supports add, collapse and reset-last behaviors", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");

  await expect(page.getByTestId("oferentes-add-button")).toBeVisible();
  await expect(page.getByTestId("oferentes.0.card")).toBeVisible();

  await clickStableControl(page.getByTestId("oferentes-add-button"));
  await expect(page.getByTestId("oferentes.1.card")).toBeVisible();

  await clickStableControl(page.getByTestId("oferentes.1.remove-button"));
  await expect(page.getByTestId("oferentes.1.card")).toHaveCount(0);

  await clickStableControl(page.getByTestId("manual-test-fill-button"));
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toHaveValue(
    "Oferente Test 1"
  );
  await clickStableControl(page.getByTestId("oferentes.0.collapse-button"));
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toBeHidden();

  await clickStableControl(page.getByTestId("oferentes.0.collapse-button"));
  await clickStableControl(page.getByTestId("oferentes.0.remove-button"));
  await expect(page.getByTestId("oferentes.0.card")).toBeVisible();
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toHaveValue("");
});

test("@smoke contratacion supports add, collapse and reset-last behaviors", async ({
  page,
}) => {
  await openSeededForm(page, "contratacion");

  await expect(page.getByTestId("vinculados-add-button")).toBeVisible();
  await expect(page.getByTestId("vinculados.0.card")).toBeVisible();

  await clickStableControl(page.getByTestId("vinculados-add-button"));
  await expect(page.getByTestId("vinculados.1.card")).toBeVisible();

  await clickStableControl(page.getByTestId("vinculados.1.remove-button"));
  await expect(page.getByTestId("vinculados.1.card")).toHaveCount(0);

  await fillStableField(page.getByTestId("vinculados.0.nombre_oferente"), "Ana Perez");
  await expectStableValue(page.getByTestId("vinculados.0.nombre_oferente"), "Ana Perez");
  await clickStableControl(page.getByTestId("vinculados.0.collapse-button"));
  await expect(page.getByTestId("vinculados.0.nombre_oferente")).toBeHidden();

  await clickStableControl(page.getByTestId("vinculados.0.collapse-button"));
  await clickStableControl(page.getByTestId("vinculados.0.remove-button"));
  await expect(page.getByTestId("vinculados.0.card")).toBeVisible();
  await expect(page.getByTestId("vinculados.0.nombre_oferente")).toHaveValue("");
});

test("@smoke manual test fill button hydrates a minimum seleccion payload", async ({
  page,
}) => {
  await openSeededForm(page, "seleccion");

  await clickStableControl(page.getByTestId("manual-test-fill-button"));
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toHaveValue(
    "Oferente Test 1"
  );
});
