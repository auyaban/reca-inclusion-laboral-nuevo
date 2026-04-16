import { expect, test } from "@playwright/test";
import { seedEmpresaSelection } from "./helpers/empresa";

test("@integration seleccion syncs legacy prefixed dropdown groups", async ({ page }) => {
  await seedEmpresaSelection(page);
  await page.goto("/formularios/seleccion");

  await page
    .getByTestId("oferentes.0.aseo_nivel_apoyo")
    .selectOption("0. No requiere apoyo.");

  await expect(page.getByTestId("oferentes.0.alimentacion")).toHaveValue(
    "0. No requiere apoyo en sus actividades de la vida diaria."
  );
  await expect(page.getByTestId("oferentes.0.aseo_criar_apoyo")).toHaveValue(
    "No"
  );
  await expect(
    page.getByTestId("oferentes.0.aseo_comunicacion_apoyo")
  ).toHaveValue("No");
});

test("@integration contratacion syncs legacy prefixed dropdown pairs", async ({ page }) => {
  await seedEmpresaSelection(page);
  await page.goto("/formularios/contratacion");

  await page
    .getByTestId("vinculados.0.condiciones_salariales_nivel_apoyo")
    .selectOption("2. Nivel de apoyo medio.");

  await expect(
    page.getByTestId("vinculados.0.condiciones_salariales_observacion")
  ).toHaveValue(
    "2. Se explica de manera parcial las condiciones salariales asignadas al cargo."
  );
});
