import type { FinalizationProfiler } from "@/lib/finalization/profiler";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import { withGoogleRetry } from "@/lib/finalization/googleRetry";
import type { Empresa } from "@/lib/store/empresaStore";
import type { EmpresaPayload } from "@/lib/validations/finalization";

export interface FinalizationSection1Data {
  fecha_visita: string;
  modalidad: string;
  nombre_empresa: string;
  ciudad_empresa: string;
  direccion_empresa: string;
  nit_empresa: string;
  correo_1: string;
  telefono_empresa: string;
  contacto_empresa: string;
  cargo: string;
  caja_compensacion: string;
  sede_empresa: string;
  asesor: string;
  profesional_asignado: string;
  correo_profesional: string;
  correo_asesor: string;
}

type FinalizationCompanySource = {
  nombre_empresa: string;
  ciudad_empresa?: string | null;
  direccion_empresa?: string | null;
  correo_1?: string | null;
  telefono_empresa?: string | null;
  contacto_empresa?: string | null;
  cargo?: string | null;
  caja_compensacion?: string | null;
  sede_empresa?: string | null;
  asesor?: string | null;
  profesional_asignado?: string | null;
  correo_profesional?: string | null;
  correo_asesor?: string | null;
};

type FinalizationFormSection1Data = {
  fecha_visita: string;
  modalidad: string;
  nit_empresa: string;
};

export function buildSection1Data(
  empresa: FinalizationCompanySource,
  formData: FinalizationFormSection1Data
): FinalizationSection1Data {
  return {
    fecha_visita: formData.fecha_visita,
    modalidad: formData.modalidad,
    nombre_empresa: empresa.nombre_empresa,
    ciudad_empresa: empresa.ciudad_empresa ?? "",
    direccion_empresa: empresa.direccion_empresa ?? "",
    nit_empresa: formData.nit_empresa,
    correo_1: empresa.correo_1 ?? "",
    telefono_empresa: empresa.telefono_empresa ?? "",
    contacto_empresa: empresa.contacto_empresa ?? "",
    cargo: empresa.cargo ?? "",
    caja_compensacion: empresa.caja_compensacion ?? "",
    sede_empresa: getEmpresaSedeCompensarValue(empresa),
    asesor: empresa.asesor ?? "",
    profesional_asignado: empresa.profesional_asignado ?? "",
    correo_profesional: empresa.correo_profesional ?? "",
    correo_asesor: empresa.correo_asesor ?? "",
  };
}

export function toEmpresaRecord(empresa: EmpresaPayload): Empresa {
  return {
    id: empresa.id,
    nombre_empresa: empresa.nombre_empresa,
    nit_empresa: empresa.nit_empresa ?? null,
    direccion_empresa: empresa.direccion_empresa ?? null,
    ciudad_empresa: empresa.ciudad_empresa ?? null,
    sede_empresa: empresa.sede_empresa ?? null,
    zona_empresa: empresa.zona_empresa ?? null,
    correo_1: empresa.correo_1 ?? null,
    contacto_empresa: empresa.contacto_empresa ?? null,
    telefono_empresa: empresa.telefono_empresa ?? null,
    cargo: empresa.cargo ?? null,
    profesional_asignado: empresa.profesional_asignado ?? null,
    correo_profesional: empresa.correo_profesional ?? null,
    asesor: empresa.asesor ?? null,
    correo_asesor: empresa.correo_asesor ?? null,
    caja_compensacion: empresa.caja_compensacion ?? null,
  };
}

export function createGoogleStepRunner(options: {
  markStage: (stage: string) => Promise<void>;
  profiler: Pick<FinalizationProfiler, "mark">;
}) {
  async function runGoogleStep<T>(
    stage: string,
    operation: () => Promise<T>,
    successLabel = stage
  ) {
    await options.markStage(stage);
    const result = await withGoogleRetry(operation, {
      onRetry(retryCount) {
        options.profiler.mark(`google.retry:${stage}:${retryCount}`);
      },
    });
    options.profiler.mark(successLabel);
    return result;
  }

  async function runGoogleStepWithoutRetry<T>(
    stage: string,
    operation: () => Promise<T>,
    successLabel = stage
  ) {
    await options.markStage(stage);
    const result = await operation();
    options.profiler.mark(successLabel);
    return result;
  }

  return {
    runGoogleStep,
    runGoogleStepWithoutRetry,
  };
}
