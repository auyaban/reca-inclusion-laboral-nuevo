import {
  getDefaultAsistentesForMode,
  normalizeRestoredAsistentesForMode,
} from "@/lib/asistentes";
import {
  getDefaultFailedVisitAuditFields,
  normalizeFailedVisitAuditValue,
} from "@/lib/failedVisitContract";
import { normalizeModalidad } from "@/lib/modalidad";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  type SensibilizacionValues,
} from "@/lib/validations/sensibilizacion";

function normalizeSensibilizacionAsistentes(
  asistentes: unknown,
  empresa?: Empresa | null
) {
  return normalizeRestoredAsistentesForMode(asistentes, {
    mode: "reca_plus_generic_attendees",
    profesionalAsignado: empresa?.profesional_asignado,
  });
}

export function getDefaultSensibilizacionValues(
  empresa?: Empresa | null
): SensibilizacionValues {
  return {
    ...getDefaultFailedVisitAuditFields(),
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    observaciones: "",
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function normalizeSensibilizacionValues(
  values: Partial<SensibilizacionValues> | Record<string, unknown>,
  empresa?: Empresa | null
): SensibilizacionValues {
  const defaults = getDefaultSensibilizacionValues(empresa);
  const source = values as Partial<SensibilizacionValues>;

  const modalidad = normalizeModalidad(source.modalidad, defaults.modalidad);

  return {
    failed_visit_applied_at: normalizeFailedVisitAuditValue(
      source.failed_visit_applied_at
    ),
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita
        : defaults.fecha_visita,
    modalidad,
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa
        : defaults.nit_empresa,
    observaciones:
      typeof source.observaciones === "string"
        ? source.observaciones
        : defaults.observaciones,
    asistentes: normalizeSensibilizacionAsistentes(source.asistentes, empresa),
  };
}
