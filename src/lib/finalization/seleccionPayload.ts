import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
  normalizePayloadAsistentes,
  type PayloadOutput,
} from "@/lib/finalization/payloads";
import {
  normalizeOdsDiscapacidadUsuario,
  normalizeOdsGeneroUsuario,
} from "@/lib/ods/personCatalogNormalization";
import type { SeleccionValues } from "@/lib/validations/seleccion";

export const SELECCION_FORM_ID = "seleccion_incluyente";
export const SELECCION_FORM_NAME = "Seleccion Incluyente";

export interface SeleccionSection1Data {
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

type BuildSeleccionCompletionPayloadsOptions = {
  actaRef: string;
  section1Data: SeleccionSection1Data;
  formData: SeleccionValues;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
};

function getUniqueCargo(rows: SeleccionValues["oferentes"]) {
  const cargos = new Set(
    rows
      .map((row) => row.cargo_oferente.trim())
      .filter((cargo) => cargo.length > 0)
  );

  return cargos.size === 1 ? Array.from(cargos)[0] ?? "" : "";
}

function buildSection2Snapshot(formData: SeleccionValues) {
  return formData.oferentes.map((row) => ({
    ...row,
    desarrollo_actividad: formData.desarrollo_actividad,
  }));
}

function buildParticipantes(formData: SeleccionValues) {
  return formData.oferentes
    .filter((row) => row.nombre_oferente.trim())
    .map((row) => {
      const discapacidadDetalle = row.discapacidad.trim();
      const discapacidadUsuario =
        normalizeOdsDiscapacidadUsuario(discapacidadDetalle);
      const generoUsuario = normalizeOdsGeneroUsuario(row.genero);

      return {
        nombre_usuario: row.nombre_oferente.trim(),
        cedula_usuario: row.cedula.trim(),
        ...(discapacidadUsuario
          ? { discapacidad_usuario: discapacidadUsuario }
          : {}),
        ...(discapacidadDetalle
          ? { discapacidad_detalle: discapacidadDetalle }
          : {}),
        ...(generoUsuario ? { genero_usuario: generoUsuario } : {}),
        cargo_servicio: row.cargo_oferente.trim(),
      };
    });
}

function getPrimerNombreApellido(nombreCompleto: string) {
  const words = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return nombreCompleto.trim();
  }

  return `${words[0]} ${words[words.length - 1]}`;
}

export function buildSeleccionCompletionPayloads({
  actaRef,
  section1Data,
  formData,
  asistentes,
  output,
  generatedAt,
  payloadSource,
}: BuildSeleccionCompletionPayloadsOptions) {
  const normalizedAsistentes = normalizePayloadAsistentes(asistentes);
  const participantes = buildParticipantes(formData);
  const tipoActa =
    formData.oferentes.length <= 1 ? "seleccion_individual" : "seleccion_grupal";
  const extraName =
    formData.oferentes.length <= 1
      ? getPrimerNombreApellido(formData.oferentes[0]?.nombre_oferente ?? "")
      : String(formData.oferentes.length);
  const cacheSnapshot = {
    failed_visit_applied_at: formData.failed_visit_applied_at,
    section_1: section1Data,
    section_2: buildSection2Snapshot(formData),
    section_5: {
      ajustes_recomendaciones: formData.ajustes_recomendaciones,
      nota: formData.nota,
    },
    section_6: normalizedAsistentes,
  };

  return buildCompletionPayloads({
    formId: SELECCION_FORM_ID,
    formName: SELECCION_FORM_NAME,
    cacheSnapshot,
    attachment: {
      document_kind: "inclusive_selection",
      document_label: "Seleccion Incluyente",
      is_ods_candidate: true,
    },
    parsedRaw: buildBaseParsedRaw({
      section1Data,
      asistentes: normalizedAsistentes,
      participantes,
      cargoObjetivo: getUniqueCargo(formData.oferentes),
      extraFields: {
        failed_visit_applied_at: formData.failed_visit_applied_at,
        tipo_acta: tipoActa,
        extra_name: extraName,
        total_oferentes: String(formData.oferentes.length),
        sheet_link: output.sheetLink,
        ...(output.pdfLink ? { pdf_link: output.pdfLink } : {}),
      },
    }),
    output,
    generatedAt,
    payloadSource,
    actaRef,
  });
}
