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
import {
  contratacionFinalizeRequestSchema,
  condicionesVacanteFinalizeRequestSchema,
  evaluacionFinalizeRequestSchema,
  presentacionFinalizeRequestSchema,
  seleccionFinalizeRequestSchema,
  sensibilizacionFinalizeRequestSchema,
} from "@/lib/validations/finalization";
import { getDefaultCondicionesVacanteValues, normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import { getDefaultContratacionValues, normalizeContratacionValues } from "@/lib/contratacion";
import { createEmptyEvaluacionValues, normalizeEvaluacionValues } from "@/lib/evaluacion";
import { hydrateEvaluacionDraft } from "@/lib/evaluacionHydration";
import { getDefaultInduccionOperativaValues, normalizeInduccionOperativaValues } from "@/lib/induccionOperativa";
import { getDefaultInduccionOrganizacionalValues, normalizeInduccionOrganizacionalValues } from "@/lib/induccionOrganizacional";
import { getDefaultPresentacionValues, normalizePresentacionValues } from "@/lib/presentacion";
import { getDefaultSeleccionValues, normalizeSeleccionValues } from "@/lib/seleccion";
import { getDefaultSensibilizacionValues, normalizeSensibilizacionValues } from "@/lib/sensibilizacion";
import { induccionOperativaFinalizeRequestSchema } from "@/lib/validations/induccionOperativa";
import { induccionOrganizacionalFinalizeRequestSchema } from "@/lib/validations/induccionOrganizacional";
import { contratacionSchema } from "@/lib/validations/contratacion";
import { condicionesVacanteSchema } from "@/lib/validations/condicionesVacante";
import { evaluacionSchema } from "@/lib/validations/evaluacion";
import { induccionOperativaSchema } from "@/lib/validations/induccionOperativa";
import { induccionOrganizacionalSchema } from "@/lib/validations/induccionOrganizacional";
import { FAILED_VISIT_AUDIT_FIELD } from "@/lib/failedVisitContract";
import { presentacionSchema } from "@/lib/validations/presentacion";
import { seleccionSchema } from "@/lib/validations/seleccion";
import { sensibilizacionSchema } from "@/lib/validations/sensibilizacion";

const FAILED_VISIT_AT = "2026-04-24T12:00:00.000Z";

function createEmpresa() {
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

function createEmpresaPayload() {
  return { ...createEmpresa() };
}

const FINALIZATION_IDENTITY = {
  draft_id: "draft-1",
  local_draft_session_id: "local-session-1",
};

type FailedVisitFormCase = {
  slug: string;
  buildDefaults: () => { failed_visit_applied_at: string | null };
  normalize: (values: Record<string, unknown>) => {
    failed_visit_applied_at: string | null;
  };
  buildValid: () => Record<string, unknown>;
  schema: {
    safeParse: (value: unknown) => {
      success: boolean;
      error?: { issues: Array<{ path: Array<string | number> }> };
    };
  };
  finalizeSchema: {
    safeParse: (value: unknown) => { success: boolean; data?: unknown };
  };
  buildFinalizeBody: (values: Record<string, unknown>) => unknown;
  readFinalizeAudit: (value: unknown) => string | null;
};

const empresa = createEmpresa();
const empresaPayload = createEmpresaPayload();

const FORM_CASES: FailedVisitFormCase[] = [
  {
    slug: "presentacion",
    buildDefaults: () => getDefaultPresentacionValues(empresa),
    normalize: (values) => normalizePresentacionValues(values, empresa),
    buildValid: () => buildPresentacionManualTestValues(empresa),
    schema: presentacionSchema,
    finalizeSchema: presentacionFinalizeRequestSchema,
    buildFinalizeBody: (values) => ({
      ...values,
      empresa: empresaPayload,
      finalization_identity: FINALIZATION_IDENTITY,
    }),
    readFinalizeAudit: (value) =>
      (value as { failed_visit_applied_at: string | null })
        .failed_visit_applied_at,
  },
  {
    slug: "sensibilizacion",
    buildDefaults: () => getDefaultSensibilizacionValues(empresa),
    normalize: (values) => normalizeSensibilizacionValues(values, empresa),
    buildValid: () => buildSensibilizacionManualTestValues(empresa),
    schema: sensibilizacionSchema,
    finalizeSchema: sensibilizacionFinalizeRequestSchema,
    buildFinalizeBody: (values) => ({
      ...values,
      empresa: empresaPayload,
      finalization_identity: FINALIZATION_IDENTITY,
    }),
    readFinalizeAudit: (value) =>
      (value as { failed_visit_applied_at: string | null })
        .failed_visit_applied_at,
  },
  {
    slug: "seleccion",
    buildDefaults: () => getDefaultSeleccionValues(empresa),
    normalize: (values) => normalizeSeleccionValues(values, empresa),
    buildValid: () => buildSeleccionManualTestValues(empresa),
    schema: seleccionSchema,
    finalizeSchema: seleccionFinalizeRequestSchema,
    buildFinalizeBody: (values) => ({
      empresa: empresaPayload,
      formData: values,
      finalization_identity: FINALIZATION_IDENTITY,
    }),
    readFinalizeAudit: (value) =>
      (
        value as { formData: { failed_visit_applied_at: string | null } }
      ).formData.failed_visit_applied_at,
  },
  {
    slug: "contratacion",
    buildDefaults: () => getDefaultContratacionValues(empresa),
    normalize: (values) => normalizeContratacionValues(values, empresa),
    buildValid: () => buildContratacionManualTestValues(empresa),
    schema: contratacionSchema,
    finalizeSchema: contratacionFinalizeRequestSchema,
    buildFinalizeBody: (values) => ({
      empresa: empresaPayload,
      formData: values,
      finalization_identity: FINALIZATION_IDENTITY,
    }),
    readFinalizeAudit: (value) =>
      (
        value as { formData: { failed_visit_applied_at: string | null } }
      ).formData.failed_visit_applied_at,
  },
  {
    slug: "condiciones-vacante",
    buildDefaults: () => getDefaultCondicionesVacanteValues(empresa),
    normalize: (values) => normalizeCondicionesVacanteValues(values, empresa),
    buildValid: () => buildCondicionesVacanteManualTestValues(empresa),
    schema: condicionesVacanteSchema,
    finalizeSchema: condicionesVacanteFinalizeRequestSchema,
    buildFinalizeBody: (values) => ({
      empresa: empresaPayload,
      formData: values,
      finalization_identity: FINALIZATION_IDENTITY,
    }),
    readFinalizeAudit: (value) =>
      (
        value as { formData: { failed_visit_applied_at: string | null } }
      ).formData.failed_visit_applied_at,
  },
  {
    slug: "evaluacion",
    buildDefaults: () => createEmptyEvaluacionValues(empresa),
    normalize: (values) => normalizeEvaluacionValues(values, empresa),
    buildValid: () => buildEvaluacionManualTestValues(empresa),
    schema: evaluacionSchema,
    finalizeSchema: evaluacionFinalizeRequestSchema,
    buildFinalizeBody: (values) => ({
      empresa: empresaPayload,
      formData: values,
      finalization_identity: FINALIZATION_IDENTITY,
    }),
    readFinalizeAudit: (value) =>
      (
        value as { formData: { failed_visit_applied_at: string | null } }
      ).formData.failed_visit_applied_at,
  },
  {
    slug: "induccion-operativa",
    buildDefaults: () => getDefaultInduccionOperativaValues(empresa),
    normalize: (values) => normalizeInduccionOperativaValues(values, empresa),
    buildValid: () => buildInduccionOperativaManualTestValues(empresa),
    schema: induccionOperativaSchema,
    finalizeSchema: induccionOperativaFinalizeRequestSchema,
    buildFinalizeBody: (values) => ({
      empresa: empresaPayload,
      formData: values,
      finalization_identity: FINALIZATION_IDENTITY,
    }),
    readFinalizeAudit: (value) =>
      (
        value as { formData: { failed_visit_applied_at: string | null } }
      ).formData.failed_visit_applied_at,
  },
  {
    slug: "induccion-organizacional",
    buildDefaults: () => getDefaultInduccionOrganizacionalValues(empresa),
    normalize: (values) =>
      normalizeInduccionOrganizacionalValues(values, empresa),
    buildValid: () => buildInduccionOrganizacionalManualTestValues(empresa),
    schema: induccionOrganizacionalSchema,
    finalizeSchema: induccionOrganizacionalFinalizeRequestSchema,
    buildFinalizeBody: (values) => ({
      empresa: empresaPayload,
      formData: values,
      finalization_identity: FINALIZATION_IDENTITY,
    }),
    readFinalizeAudit: (value) =>
      (
        value as { formData: { failed_visit_applied_at: string | null } }
      ).formData.failed_visit_applied_at,
  },
];

describe("failed visit audit field across long forms", () => {
  FORM_CASES.forEach((formCase) => {
    it(`${formCase.slug} initializes defaults with a null audit field`, () => {
      expect(formCase.buildDefaults().failed_visit_applied_at).toBeNull();
    });

    it(`${formCase.slug} preserves the audit field during normalization and tolerates legacy drafts`, () => {
      expect(
        formCase.normalize({
          [FAILED_VISIT_AUDIT_FIELD]: FAILED_VISIT_AT,
        }).failed_visit_applied_at
      ).toBe(FAILED_VISIT_AT);
      expect(formCase.normalize({}).failed_visit_applied_at).toBeNull();
    });

    it(`${formCase.slug} schema accepts null and ISO values and rejects invalid strings`, () => {
      const withNull = {
        ...formCase.buildValid(),
        [FAILED_VISIT_AUDIT_FIELD]: null,
      };
      const withIso = {
        ...formCase.buildValid(),
        [FAILED_VISIT_AUDIT_FIELD]: FAILED_VISIT_AT,
      };
      const withInvalid = {
        ...formCase.buildValid(),
        [FAILED_VISIT_AUDIT_FIELD]: "no-es-una-fecha",
      };

      expect(formCase.schema.safeParse(withNull).success).toBe(true);
      expect(formCase.schema.safeParse(withIso).success).toBe(true);

      const invalidResult = formCase.schema.safeParse(withInvalid);
      expect(invalidResult.success).toBe(false);
      expect(
        invalidResult.error?.issues.some(
          (issue) => issue.path.join(".") === FAILED_VISIT_AUDIT_FIELD
        )
      ).toBe(true);
    });

    it(`${formCase.slug} finalization request schemas preserve the audit field`, () => {
      const body = formCase.buildFinalizeBody({
        ...formCase.buildValid(),
        [FAILED_VISIT_AUDIT_FIELD]: FAILED_VISIT_AT,
      });
      const result = formCase.finalizeSchema.safeParse(body);

      expect(result.success).toBe(true);
      expect(formCase.readFinalizeAudit(result.data)).toBe(FAILED_VISIT_AT);
    });
  });

  it("evaluacion custom hydration preserves the audit field from persisted drafts", () => {
    const values = hydrateEvaluacionDraft(
      {
        fecha_visita: "2026-04-16",
        modalidad: "Presencial",
        nit_empresa: "9001",
        failed_visit_applied_at: FAILED_VISIT_AT,
      },
      empresa
    );

    expect(values.failed_visit_applied_at).toBe(FAILED_VISIT_AT);
  });
});
