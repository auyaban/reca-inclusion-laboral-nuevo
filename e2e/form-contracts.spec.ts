import { expect, test } from "@playwright/test";
import { openSeededForm } from "./helpers/forms";

const FORM_SLUGS = [
  "presentacion",
  "sensibilizacion",
  "condiciones-vacante",
  "seleccion",
  "contratacion",
] as const;

for (const slug of FORM_SLUGS) {
  test(`@smoke ${slug} opens with a seeded company and renders the editor`, async ({
    page,
  }) => {
    await openSeededForm(page, slug);

    await expect(page.getByTestId("long-form-finalize-button")).toBeVisible();
  });
}
