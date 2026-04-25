import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
  normalizePayloadAsistentes,
  type PayloadOutput,
} from "@/lib/finalization/payloads";
import {
  INDUCCION_ORGANIZACIONAL_FORM_ID,
  INDUCCION_ORGANIZACIONAL_FORM_NAME,
  getInduccionOrganizacionalRecommendationForMedium,
  type InduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";

export const INDUCCION_ORGANIZACIONAL_ATTACHMENT_KIND =
  "organizational_induction";
export { INDUCCION_ORGANIZACIONAL_FORM_NAME };

export function buildInduccionOrganizacionalSection3Snapshot(
  formData: InduccionOrganizacionalValues
) {
  return formData.section_3;
}

export function buildInduccionOrganizacionalSection4Snapshot(
  formData: InduccionOrganizacionalValues
) {
  return formData.section_4.map((row) => ({
    medio: row.medio,
    recomendacion:
      row.medio === "No aplica"
        ? "No aplica"
        : getInduccionOrganizacionalRecommendationForMedium(row.medio),
  }));
}

export function buildInduccionOrganizacionalParticipants(
  formData: InduccionOrganizacionalValues
) {
  const linked = formData.vinculado;
  return linked.nombre_oferente.trim()
    ? [
        {
          nombre_usuario: linked.nombre_oferente.trim(),
          cedula_usuario: linked.cedula.trim(),
          cargo_servicio: linked.cargo_oferente.trim(),
        },
      ]
    : [];
}

export function buildInduccionOrganizacionalCompletionPayloads({
  actaRef,
  section1Data,
  formData,
  asistentes,
  output,
  generatedAt,
  payloadSource,
}: {
  actaRef: string;
  section1Data: {
    fecha_visita: string;
    modalidad: string;
    nit_empresa: string;
    nombre_empresa: string;
    ciudad_empresa: string;
    direccion_empresa: string;
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
  };
  formData: InduccionOrganizacionalValues;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
}) {
  const normalizedAsistentes = normalizePayloadAsistentes(asistentes);
  const participants = buildInduccionOrganizacionalParticipants(formData);

  return buildCompletionPayloads({
    formId: INDUCCION_ORGANIZACIONAL_FORM_ID,
    formName: INDUCCION_ORGANIZACIONAL_FORM_NAME,
    cacheSnapshot: {
      failed_visit_applied_at: formData.failed_visit_applied_at,
      section_1: section1Data,
      section_2: formData.vinculado,
      section_3: buildInduccionOrganizacionalSection3Snapshot(formData),
      section_4: buildInduccionOrganizacionalSection4Snapshot(formData),
      section_5: formData.section_5,
      section_6: normalizedAsistentes,
    },
    attachment: {
      document_kind: INDUCCION_ORGANIZACIONAL_ATTACHMENT_KIND,
      document_label: "Induccion organizacional",
      is_ods_candidate: true,
    },
    parsedRaw: buildBaseParsedRaw({
      section1Data,
      asistentes: normalizedAsistentes,
      participantes: participants,
      cargoObjetivo: formData.vinculado.cargo_oferente.trim(),
      extraFields: {
        failed_visit_applied_at: formData.failed_visit_applied_at,
        tipo_acta: INDUCCION_ORGANIZACIONAL_ATTACHMENT_KIND,
        vinculado_nombre: formData.vinculado.nombre_oferente.trim(),
        vinculado_cedula: formData.vinculado.cedula.trim(),
        observaciones: formData.section_5.observaciones.trim(),
      },
    }),
    output,
    generatedAt,
    payloadSource,
    actaRef,
  });
}
