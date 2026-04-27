import { describe, expect, it } from "vitest";
import {
  buildCondicionesVacanteManualTestValues,
  buildContratacionManualTestValues,
  buildEvaluacionManualTestValues,
  buildInduccionOperativaManualTestValues,
  buildInduccionOrganizacionalManualTestValues,
  buildPresentacionManualTestValues,
  buildSeleccionManualTestValues,
  buildSensibilizacionManualTestValues,
} from "@/lib/manualTestFill";
import { buildCondicionesVacanteCompletionPayloads } from "@/lib/finalization/condicionesVacantePayload";
import { buildContratacionCompletionPayloads } from "@/lib/finalization/contratacionPayload";
import { buildEvaluacionCompletionPayloads } from "@/lib/finalization/evaluacionPayload";
import { buildInduccionOperativaCompletionPayloads } from "@/lib/finalization/induccionOperativaPayload";
import { buildInduccionOrganizacionalCompletionPayloads } from "@/lib/finalization/induccionOrganizacionalPayload";
import { buildPresentacionCompletionPayloads } from "@/lib/finalization/presentacionPayload";
import { buildSection1Data } from "@/lib/finalization/routeHelpers";
import { buildSeleccionCompletionPayloads } from "@/lib/finalization/seleccionPayload";
import { buildSensibilizacionCompletionPayloads } from "@/lib/finalization/sensibilizacionPayload";

const FAILED_VISIT_AT = "2026-04-24T12:00:00.000Z";

function createEmpresaPayload() {
  return {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno",
    nit_empresa: "9001",
    direccion_empresa: "Calle 1",
    ciudad_empresa: "Bogota",
    sede_empresa: "Sede Norte",
    zona_empresa: "Zona Centro",
    correo_1: "empresa@example.com",
    contacto_empresa: "Ana Contacto",
    telefono_empresa: "3000000",
    cargo: "Lider SST",
    profesional_asignado: "Laura Profesional",
    correo_profesional: "laura@reca.com",
    asesor: "Pedro Asesor",
    correo_asesor: "pedro@agencia.com",
    caja_compensacion: "Compensar",
  };
}

describe("failed visit audit field in finalization payload builders", () => {
  it("preserves the audit field in presentacion payloads", () => {
    const empresa = createEmpresaPayload();
    const formData = {
      ...buildPresentacionManualTestValues(empresa),
      failed_visit_applied_at: FAILED_VISIT_AT,
    };
    const section1Data = {
      ...buildSection1Data(empresa, formData),
      tipo_visita: formData.tipo_visita,
    };

    const result = buildPresentacionCompletionPayloads({
      tipoVisita: formData.tipo_visita,
      actaRef: "ACTA-1",
      section1Data,
      failedVisitAppliedAt: formData.failed_visit_applied_at,
      motivacionSeleccionada: formData.motivacion,
      acuerdosObservaciones: formData.acuerdos_observaciones,
      asistentes: formData.asistentes,
      output: {
        sheetLink: "https://sheet.test/presentacion",
        pdfLink: "https://pdf.test/presentacion",
      },
      generatedAt: "2026-04-24T12:00:00.000Z",
      payloadSource: "test",
    });

    expect(result.payloadRaw.cache_snapshot.failed_visit_applied_at).toBe(
      FAILED_VISIT_AT
    );
    expect(result.payloadNormalized.parsed_raw.failed_visit_applied_at).toBe(
      FAILED_VISIT_AT
    );
  });

  it("preserves the audit field in sensibilizacion payloads", () => {
    const empresa = createEmpresaPayload();
    const formData = {
      ...buildSensibilizacionManualTestValues(empresa),
      failed_visit_applied_at: FAILED_VISIT_AT,
    };

    const result = buildSensibilizacionCompletionPayloads({
      actaRef: "ACTA-2",
      section1Data: buildSection1Data(empresa, formData),
      failedVisitAppliedAt: formData.failed_visit_applied_at,
      observaciones: formData.observaciones,
      asistentes: formData.asistentes,
      output: {
        sheetLink: "https://sheet.test/sensibilizacion",
      },
      generatedAt: "2026-04-24T12:00:00.000Z",
      payloadSource: "test",
    });

    expect(result.payloadRaw.cache_snapshot.failed_visit_applied_at).toBe(
      FAILED_VISIT_AT
    );
    expect(result.payloadNormalized.parsed_raw.failed_visit_applied_at).toBe(
      FAILED_VISIT_AT
    );
  });

  it("preserves the audit field in nested long-form payloads", () => {
    const empresa = createEmpresaPayload();
    const payloadCases = [
      (() => {
        const formData = {
          ...buildSeleccionManualTestValues(empresa),
          failed_visit_applied_at: FAILED_VISIT_AT,
        };
        return buildSeleccionCompletionPayloads({
          actaRef: "ACTA-3",
          section1Data: buildSection1Data(empresa, formData),
          formData,
          asistentes: formData.asistentes,
          output: {
            sheetLink: "https://sheet.test/seleccion",
            pdfLink: "https://pdf.test/seleccion",
          },
          generatedAt: "2026-04-24T12:00:00.000Z",
          payloadSource: "test",
        });
      })(),
      (() => {
        const formData = {
          ...buildContratacionManualTestValues(empresa),
          failed_visit_applied_at: FAILED_VISIT_AT,
        };
        return buildContratacionCompletionPayloads({
          actaRef: "ACTA-4",
          section1Data: buildSection1Data(empresa, formData),
          formData,
          asistentes: formData.asistentes,
          output: {
            sheetLink: "https://sheet.test/contratacion",
            pdfLink: "https://pdf.test/contratacion",
          },
          generatedAt: "2026-04-24T12:00:00.000Z",
          payloadSource: "test",
        });
      })(),
      (() => {
        const formData = {
          ...buildCondicionesVacanteManualTestValues(empresa),
          failed_visit_applied_at: FAILED_VISIT_AT,
        };
        return buildCondicionesVacanteCompletionPayloads({
          actaRef: "ACTA-5",
          section1Data: buildSection1Data(empresa, formData),
          formData,
          asistentes: formData.asistentes,
          output: {
            sheetLink: "https://sheet.test/condiciones",
            pdfLink: "https://pdf.test/condiciones",
          },
          generatedAt: "2026-04-24T12:00:00.000Z",
          payloadSource: "test",
        });
      })(),
      (() => {
        const formData = {
          ...buildEvaluacionManualTestValues(empresa),
          failed_visit_applied_at: FAILED_VISIT_AT,
        };
        return buildEvaluacionCompletionPayloads({
          actaRef: "ACTA-6",
          section1Data: buildSection1Data(empresa, formData),
          formData,
          asistentes: formData.asistentes,
          output: {
            sheetLink: "https://sheet.test/evaluacion",
          },
          generatedAt: "2026-04-24T12:00:00.000Z",
          payloadSource: "test",
        });
      })(),
      (() => {
        const formData = {
          ...buildInduccionOperativaManualTestValues(empresa),
          failed_visit_applied_at: FAILED_VISIT_AT,
        };
        return buildInduccionOperativaCompletionPayloads({
          actaRef: "ACTA-7",
          section1Data: buildSection1Data(empresa, formData),
          formData,
          asistentes: formData.asistentes,
          output: {
            sheetLink: "https://sheet.test/induccion-operativa",
            pdfLink: "https://pdf.test/induccion-operativa",
          },
          generatedAt: "2026-04-24T12:00:00.000Z",
          payloadSource: "test",
        });
      })(),
      (() => {
        const formData = {
          ...buildInduccionOrganizacionalManualTestValues(empresa),
          failed_visit_applied_at: FAILED_VISIT_AT,
        };
        return buildInduccionOrganizacionalCompletionPayloads({
          actaRef: "ACTA-8",
          section1Data: buildSection1Data(empresa, formData),
          formData,
          asistentes: formData.asistentes,
          output: {
            sheetLink: "https://sheet.test/induccion-organizacional",
          },
          generatedAt: "2026-04-24T12:00:00.000Z",
          payloadSource: "test",
        });
      })(),
    ];

    payloadCases.forEach((result) => {
      expect(result.payloadRaw.cache_snapshot.failed_visit_applied_at).toBe(
        FAILED_VISIT_AT
      );
      expect(result.payloadNormalized.parsed_raw.failed_visit_applied_at).toBe(
        FAILED_VISIT_AT
      );
    });
  });
});
