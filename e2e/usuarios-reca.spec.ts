import { expect, test } from "@playwright/test";
import { seedEmpresaSelection } from "./helpers/empresa";
import {
  loadContratacionUsuariosRecaByEnter,
  loadSeleccionUsuariosRecaByEnter,
  loadSeleccionUsuariosRecaBySuggestion,
  mockUsuariosReca,
} from "./helpers/usuariosReca";

test("contratacion loads usuarios RECA data and tracks modified fields", async ({
  page,
}) => {
  await seedEmpresaSelection(page);
  await mockUsuariosReca(page);
  await page.goto("/formularios/contratacion");

  await loadContratacionUsuariosRecaByEnter(page);

  await expect(page.getByTestId("vinculados.0.snapshot-banner")).toBeVisible();
  await expect(page.getByTestId("vinculados.0.nombre_oferente")).toHaveValue(
    "Ana Perez"
  );
  await expect(
    page.getByTestId("vinculados.0.certificado_porcentaje")
  ).toHaveValue("45%");

  const phoneField = page.getByTestId("vinculados.0.telefono_oferente");
  await phoneField.fill("3000000000");
  await expect(phoneField).toHaveClass(/bg-amber-50/);

  await phoneField.fill("3001112233");
  await expect(phoneField).not.toHaveClass(/bg-amber-50/);
});

test("seleccion loads usuarios RECA data and tracks modified fields", async ({
  page,
}) => {
  await seedEmpresaSelection(page);
  await mockUsuariosReca(page);
  await page.goto("/formularios/seleccion");

  await loadSeleccionUsuariosRecaByEnter(page);

  await expect(page.getByTestId("oferentes.0.snapshot-banner")).toBeVisible();
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toHaveValue(
    "Ana Perez"
  );
  await expect(
    page.getByTestId("oferentes.0.certificado_porcentaje")
  ).toHaveValue("45%");

  const phoneField = page.getByTestId("oferentes.0.telefono_oferente");
  await phoneField.fill("3000000000");
  await expect(phoneField).toHaveClass(/bg-amber-50/);

  await phoneField.fill("3001112233");
  await expect(phoneField).not.toHaveClass(/bg-amber-50/);
});

test("seleccion loads usuarios RECA data via autocomplete suggestion click", async ({
  page,
}) => {
  await seedEmpresaSelection(page);
  await mockUsuariosReca(page);
  await page.goto("/formularios/seleccion");

  await loadSeleccionUsuariosRecaBySuggestion(page);

  await expect(page.getByTestId("oferentes.0.snapshot-banner")).toBeVisible();
  await expect(page.getByTestId("oferentes.0.nombre_oferente")).toHaveValue(
    "Ana Perez"
  );
  await expect(
    page.getByTestId("oferentes.0.certificado_porcentaje")
  ).toHaveValue("45%");

  const phoneField = page.getByTestId("oferentes.0.telefono_oferente");
  await phoneField.fill("3000000000");
  await expect(phoneField).toHaveClass(/bg-amber-50/);

  await phoneField.fill("3001112233");
  await expect(phoneField).not.toHaveClass(/bg-amber-50/);
});
