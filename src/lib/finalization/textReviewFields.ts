import {
  EVALUACION_QUESTION_DESCRIPTORS,
  EVALUACION_SECTION_6_FIELDS,
  EVALUACION_SECTION_7_FIELDS,
} from "@/lib/evaluacionSections";
import type {
  TextReviewPathPart,
  TextReviewTarget,
} from "@/lib/finalization/textReviewTypes";
import { isRecord } from "@/lib/finalization/valueUtils";

export const TEXT_REVIEW_FORM_SLUGS = [
  "presentacion",
  "sensibilizacion",
  "seleccion",
  "contratacion",
  "condiciones_vacante",
  "evaluacion",
] as const;

export type TextReviewFormSlug = (typeof TEXT_REVIEW_FORM_SLUGS)[number];

const CONDICIONES_VACANTE_REVIEWABLE_FIELDS = [
  "nombre_vacante",
  "modalidad_trabajo",
  "lugar_trabajo",
  "firma_contrato",
  "aplicacion_pruebas",
  "beneficios_adicionales",
  "cargo_flexible_genero",
  "beneficios_mujeres",
  "requiere_certificado_observaciones",
  "especificaciones_formacion",
  "conocimientos_basicos",
  "hora_ingreso",
  "hora_salida",
  "dias_laborables",
  "dias_flexibles",
  "observaciones",
  "funciones_tareas",
  "herramientas_equipos",
  "observaciones_cognitivas",
  "observaciones_motricidad_fina",
  "observaciones_motricidad_gruesa",
  "observaciones_transversales",
  "observaciones_peligros",
  "observaciones_recomendaciones",
] as const satisfies readonly string[];

const EVALUACION_REVIEWABLE_FIELDS = [
  ...EVALUACION_QUESTION_DESCRIPTORS.flatMap((question) =>
    question.fields
      .filter(
        (field) =>
          field.key === "observaciones" ||
          field.key === "detalle" ||
          (question.kind === "texto" && field.key === "respuesta")
      )
      .map(
        (field) =>
          [question.sectionId, question.id, field.key] as TextReviewPathPart[]
      )
  ),
  ...EVALUACION_SECTION_6_FIELDS.map(
    (field) => [field.id] as TextReviewPathPart[]
  ),
  ...EVALUACION_SECTION_7_FIELDS.map(
    (field) => [field.id] as TextReviewPathPart[]
  ),
] as const;

const REVIEW_FIELDS_BY_FORM: Record<TextReviewFormSlug, TextReviewPathPart[][]> =
  {
    presentacion: [["acuerdos_observaciones"]],
    sensibilizacion: [["observaciones"]],
    seleccion: [["desarrollo_actividad"], ["ajustes_recomendaciones"], ["nota"]],
    contratacion: [["desarrollo_actividad"], ["ajustes_recomendaciones"]],
    condiciones_vacante: CONDICIONES_VACANTE_REVIEWABLE_FIELDS.map((fieldId) => [
      fieldId,
    ]),
    evaluacion: [...EVALUACION_REVIEWABLE_FIELDS],
  };

export function sanitizeTextReviewText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isMeaningfulReviewText(value: unknown) {
  const text = sanitizeTextReviewText(value);
  if (!text) {
    return false;
  }

  return Array.from(text).some((char) => /\p{L}/u.test(char));
}

function getValueAtPath(
  node: unknown,
  path: readonly TextReviewPathPart[]
): unknown {
  let current = node;

  for (const part of path) {
    if (typeof part === "number") {
      if (!Array.isArray(current) || part < 0 || part >= current.length) {
        return undefined;
      }
      current = current[part];
      continue;
    }

    if (!isRecord(current) || !(part in current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

function setValueAtPath(
  node: unknown,
  path: readonly TextReviewPathPart[],
  value: string
) {
  if (!path.length || !isRecord(node)) {
    return;
  }

  let current: unknown = node;

  for (const part of path.slice(0, -1)) {
    if (typeof part === "number") {
      if (!Array.isArray(current) || part < 0 || part >= current.length) {
        return;
      }
      current = current[part];
      continue;
    }

    if (!isRecord(current) || !(part in current)) {
      return;
    }

    current = current[part];
  }

  const last = path[path.length - 1];
  if (typeof last === "number") {
    if (Array.isArray(current) && last >= 0 && last < current.length) {
      current[last] = value;
    }
    return;
  }

  if (isRecord(current)) {
    current[last] = value;
  }
}

export function extractTextReviewTargetsForForm(
  formSlug: TextReviewFormSlug,
  value: unknown,
  maxTextChars: number
) {
  if (!isRecord(value)) {
    return [] as TextReviewTarget[];
  }

  const targets: TextReviewTarget[] = [];
  const seenPaths = new Set<string>();

  for (const path of REVIEW_FIELDS_BY_FORM[formSlug]) {
    const rawValue = getValueAtPath(value, path);
    const text = sanitizeTextReviewText(rawValue);
    if (!isMeaningfulReviewText(text) || text.length > maxTextChars) {
      continue;
    }

    const pathKey = path.join(".");
    if (seenPaths.has(pathKey)) {
      continue;
    }

    seenPaths.add(pathKey);
    targets.push({ path: [...path], text });
  }

  return targets;
}

export function applyReviewedTargets<TValue>(
  value: TValue,
  reviewedTargets: readonly TextReviewTarget[]
) {
  const copy = structuredClone(value);
  for (const target of reviewedTargets) {
    setValueAtPath(copy, target.path, sanitizeTextReviewText(target.text));
  }
  return copy;
}
