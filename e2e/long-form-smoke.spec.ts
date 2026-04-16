import { expect, test } from "@playwright/test";
import { seedEmpresaSelection } from "./helpers/empresa";

test("seleccion shows the light gate before empresa or draft", async ({ page }) => {
  await page.goto("/formularios/seleccion");
  await expect(page.getByTestId("long-form-company-gate")).toBeVisible();
});

test("contratacion shows the light gate before empresa or draft", async ({ page }) => {
  await page.goto("/formularios/contratacion");
  await expect(page.getByTestId("long-form-company-gate")).toBeVisible();
});

test("seleccion supports add, collapse and reset-last behaviors", async ({
  page,
}) => {
  await seedEmpresaSelection(page);
  await page.goto("/formularios/seleccion");

  await expect(page.getByTestId("oferentes-add-button")).toBeVisible();
  await expect(page.getByTestId("oferentes.0.card")).toBeVisible();

  await page.getByTestId("oferentes-add-button").click();
  await expect(page.getByTestId("oferentes.1.card")).toBeVisible();

  await page.getByTestId("oferentes.1.remove-button").click();
  await expect(page.getByTestId("oferentes.1.card")).toHaveCount(0);

  await page.getByTestId("oferentes.0.nombre_oferente").fill("Ana Perez");
  await page.getByTestId("oferentes.0.collapse-button").click();
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toBeHidden();

  await page.getByTestId("oferentes.0.collapse-button").click();
  await page.getByTestId("oferentes.0.remove-button").click();
  await expect(page.getByTestId("oferentes.0.card")).toBeVisible();
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toHaveValue("");
});

test("contratacion supports add, collapse and reset-last behaviors", async ({
  page,
}) => {
  await seedEmpresaSelection(page);
  await page.goto("/formularios/contratacion");

  await expect(page.getByTestId("vinculados-add-button")).toBeVisible();
  await expect(page.getByTestId("vinculados.0.card")).toBeVisible();

  await page.getByTestId("vinculados-add-button").click();
  await expect(page.getByTestId("vinculados.1.card")).toBeVisible();

  await page.getByTestId("vinculados.1.remove-button").click();
  await expect(page.getByTestId("vinculados.1.card")).toHaveCount(0);

  await page.getByTestId("vinculados.0.nombre_oferente").fill("Ana Perez");
  await page.getByTestId("vinculados.0.collapse-button").click();
  await expect(page.getByTestId("vinculados.0.nombre_oferente")).toBeHidden();

  await page.getByTestId("vinculados.0.collapse-button").click();
  await page.getByTestId("vinculados.0.remove-button").click();
  await expect(page.getByTestId("vinculados.0.card")).toBeVisible();
  await expect(page.getByTestId("vinculados.0.nombre_oferente")).toHaveValue("");
});

test("manual test fill button hydrates a minimum seleccion payload", async ({
  page,
}) => {
  await seedEmpresaSelection(page);
  await page.goto("/formularios/seleccion");

  await page.getByTestId("manual-test-fill-button").click();
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toHaveValue(
    "Oferente Test 1"
  );
});
