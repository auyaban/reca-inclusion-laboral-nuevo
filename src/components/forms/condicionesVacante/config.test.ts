import { describe, expect, it } from "vitest";
import { CONDICIONES_RECOMMENDATIONS_TEMPLATE } from "@/components/forms/condicionesVacante/config";

describe("condicionesVacante config", () => {
  it("keeps the updated vacancy recommendations template copy", () => {
    expect(CONDICIONES_RECOMMENDATIONS_TEMPLATE.text).toContain(
      "retroalimentación de los candidatos entrevistados a la Agencia Compensar"
    );
    expect(CONDICIONES_RECOMMENDATIONS_TEMPLATE.text).toContain(
      "no se remitirá el certificado de discapacidad"
    );
    expect(CONDICIONES_RECOMMENDATIONS_TEMPLATE.text).toContain(
      "El cargo es compatible con personas con discapacidad hipoacusia, auditiva, intelectual y baja visión."
    );
  });
});
