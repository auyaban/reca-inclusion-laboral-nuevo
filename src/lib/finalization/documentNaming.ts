import { normalizePersonName } from "@/lib/asistentes";
import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";
import { sanitizeFileName } from "@/lib/google/fileNames";
import { normalizePresentacionTipoVisita } from "@/lib/presentacion";
import { coerceTrimmedText, isRecord } from "@/lib/finalization/valueUtils";

function normalizeDateForDocumentName(value: unknown) {
  const raw = coerceTrimmedText(value);
  const parsed = raw ? new Date(`${raw}T00:00:00`) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const monthRaw = parts.find((part) => part.type === "month")?.value ?? "Jan";
  const month = `${monthRaw.slice(0, 1).toUpperCase()}${monthRaw.slice(1).toLowerCase()}`;
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";

  return `${day}_${month}_${year}`;
}

function getArrayCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getFirstNameAndSurname(value: unknown) {
  const normalized = normalizePersonName(coerceTrimmedText(value));
  const [firstName = "", , ...rest] = normalized.split(" ").filter(Boolean);
  const surname = rest.length > 0 ? rest[rest.length - 1] : normalized.split(" ").filter(Boolean)[1] ?? "";
  return [firstName, surname].filter(Boolean).join(" ").trim();
}

function getRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function buildPresentacionBaseName(formData: unknown) {
  const formRecord = getRecord(formData);
  const tipoVisita = normalizePresentacionTipoVisita(formRecord.tipo_visita);
  return tipoVisita === "Reactivación"
    ? "REACTIVACION DE LA RUTA DE INCLUSION LABORAL"
    : "PRESENTACION DEL PROGRAMA DE INCLUSION LABORAL";
}

function buildSeleccionBaseName(formData: unknown) {
  const formRecord = getRecord(formData);
  const oferentes = Array.isArray(formRecord.oferentes) ? formRecord.oferentes : [];
  if (oferentes.length <= 1) {
    const personLabel = getFirstNameAndSurname(
      getRecord(oferentes[0]).nombre_oferente
    );
    return [
      "PROCESO DE SELECCION INCLUYENTE INDIVIDUAL",
      personLabel || null,
    ]
      .filter(Boolean)
      .join("-");
  }

  return `PROCESO DE SELECCION INCLUYENTE GRUPAL-(${oferentes.length})`;
}

function buildContratacionBaseName(formData: unknown) {
  const formRecord = getRecord(formData);
  const vinculados = Array.isArray(formRecord.vinculados) ? formRecord.vinculados : [];
  if (vinculados.length <= 1) {
    const personLabel = getFirstNameAndSurname(
      getRecord(vinculados[0]).nombre_oferente
    );
    return [
      "PROCESO DE CONTRATACION INCLUYENTE INDIVIDUAL",
      personLabel || null,
    ]
      .filter(Boolean)
      .join("-");
  }

  return `PROCESO DE CONTRATACION INCLUYENTE GRUPAL-(${vinculados.length})`;
}

function buildInduccionOperativaBaseName(formData: unknown) {
  const formRecord = getRecord(formData);
  return [
    "PROCESO DE INDUCCION OPERATIVA",
    getFirstNameAndSurname(getRecord(formRecord.vinculado).nombre_oferente) || null,
  ]
    .filter(Boolean)
    .join("-");
}

function buildInduccionOrganizacionalBaseName(formData: unknown) {
  const formRecord = getRecord(formData);
  return [
    "PROCESO DE INDUCCION ORGANIZACIONAL",
    getFirstNameAndSurname(getRecord(formRecord.vinculado).nombre_oferente) || null,
  ]
    .filter(Boolean)
    .join("-");
}

export function getPrewarmDraftDisplayLabel(formSlug: FinalizationFormSlug) {
  switch (formSlug) {
    case "presentacion":
      return "Presentacion";
    case "sensibilizacion":
      return "Sensibilizacion";
    case "seleccion":
      return "Seleccion";
    case "contratacion":
      return "Contratacion";
    case "condiciones-vacante":
      return "Condiciones Vacante";
    case "evaluacion":
      return "Evaluacion";
    case "induccion-organizacional":
      return "Induccion Organizacional";
    case "induccion-operativa":
      return "Induccion Operativa";
  }
}

export function buildDraftSpreadsheetProvisionalName(options: {
  formSlug: FinalizationFormSlug;
  draftId?: string | null;
  localDraftSessionId: string;
}) {
  const shortId = coerceTrimmedText(options.draftId).slice(0, 8)
    || coerceTrimmedText(options.localDraftSessionId).slice(0, 8)
    || "draft";

  return sanitizeFileName(
    `BORRADOR - ${getPrewarmDraftDisplayLabel(options.formSlug)} - ${shortId}`
  );
}

export function buildFinalDocumentBaseName(options: {
  formSlug: FinalizationFormSlug;
  formData: unknown;
}) {
  const dateLabel = normalizeDateForDocumentName(getRecord(options.formData).fecha_visita);
  let baseName: string;

  switch (options.formSlug) {
    case "presentacion":
      baseName = buildPresentacionBaseName(options.formData);
      break;
    case "sensibilizacion":
      baseName = "SENSIBILIZACION EN INCLUSION LABORAL";
      break;
    case "seleccion":
      baseName = buildSeleccionBaseName(options.formData);
      break;
    case "contratacion":
      baseName = buildContratacionBaseName(options.formData);
      break;
    case "condiciones-vacante":
      baseName = [
        "REVISION DE LAS CONDICIONES DE LA VACANTE",
        coerceTrimmedText(getRecord(options.formData).nombre_vacante) || null,
      ]
        .filter(Boolean)
        .join("-");
      break;
    case "evaluacion":
      baseName = "EVALUACION DE ACCESIBILIDAD";
      break;
    case "induccion-operativa":
      baseName = buildInduccionOperativaBaseName(options.formData);
      break;
    case "induccion-organizacional":
      baseName = buildInduccionOrganizacionalBaseName(options.formData);
      break;
  }

  return sanitizeFileName(`${baseName}-${dateLabel}`);
}

export function getCurrentVariantCountsForNaming(formSlug: FinalizationFormSlug, formData: unknown) {
  const record = getRecord(formData);

  switch (formSlug) {
    case "seleccion":
      return { repeatedCount: getArrayCount(record.oferentes) };
    case "contratacion":
      return { repeatedCount: getArrayCount(record.vinculados) };
    default:
      return { repeatedCount: 1 };
  }
}
