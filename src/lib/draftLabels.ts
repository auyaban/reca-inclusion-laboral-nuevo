import { getFormLabel } from "@/lib/forms";
import { isRecord, type DraftPreview, type HubDraft } from "@/lib/drafts/shared";

export type HubDraftDisplay = {
  id: string;
  primaryLabel: string;
  companyLabel: string;
  formLabel: string;
  showFormLabelBadge: boolean;
  quantityLabel: string | null;
  visitDateLabel: string | null;
  similarityBadge: string | null;
};

const DEFAULT_VACANCY_TITLE = "Vacante sin nombre";

function readTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  const text = readTrimmedString(value);
  if (!text) {
    return null;
  }

  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeDateInput(value: unknown) {
  const text = readTrimmedString(value);
  if (!text) {
    return null;
  }

  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function formatVisitDateLabel(value?: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return `Visita ${new Date(timestamp).toLocaleDateString("es-CO", {
    dateStyle: "short",
  })}`;
}

function formatVacancyCountLabel(value: unknown) {
  const count = readPositiveInteger(value);
  if (!count) {
    return null;
  }

  return count === 1 ? "1 vacante" : `${count} vacantes`;
}

function compactPreview(preview: DraftPreview) {
  if (!preview.title && !preview.visitDate && !preview.quantityLabel) {
    return null;
  }

  return preview;
}

export function buildDraftPreview(slug: string, data: unknown): DraftPreview | null {
  const source = isRecord(data) ? data : {};
  const commonVisitDate = normalizeDateInput(source.fecha_visita);

  if (slug === "condiciones-vacante") {
    return compactPreview({
      title: readTrimmedString(source.nombre_vacante) ?? DEFAULT_VACANCY_TITLE,
      visitDate: commonVisitDate ?? undefined,
      quantityLabel: formatVacancyCountLabel(source.numero_vacantes) ?? undefined,
    });
  }

  if (slug === "presentacion") {
    return compactPreview({
      title: readTrimmedString(source.tipo_visita) ?? undefined,
      visitDate: commonVisitDate ?? undefined,
    });
  }

  if (slug === "sensibilizacion") {
    return compactPreview({
      visitDate: commonVisitDate ?? undefined,
    });
  }

  if (slug === "interprete-lsc") {
    return compactPreview({
      visitDate: commonVisitDate ?? undefined,
    });
  }

  return compactPreview({
    title:
      readTrimmedString(source.nombre_vacante) ??
      readTrimmedString(source.cargo_objetivo) ??
      readTrimmedString(source.tipo_visita) ??
      undefined,
    visitDate: commonVisitDate ?? undefined,
    quantityLabel: formatVacancyCountLabel(source.numero_vacantes) ?? undefined,
  });
}

function normalizeComparisonText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es-CO")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function buildSimilarityKey(draft: HubDraft, primaryLabel: string) {
  const companyIdentity = draft.empresa_nit || draft.empresa_nombre || "";
  if (!companyIdentity.trim()) {
    return null;
  }

  return [
    draft.form_slug,
    normalizeComparisonText(companyIdentity),
    normalizeComparisonText(primaryLabel),
  ].join("|");
}

function buildBaseDisplay(draft: HubDraft): HubDraftDisplay {
  const formLabel = getFormLabel(draft.form_slug);
  const primaryLabel = draft.preview?.title?.trim() || formLabel;
  const companyLabel = draft.empresa_nombre?.trim() || "Empresa sin nombre";
  const showFormLabelBadge =
    normalizeComparisonText(primaryLabel) !== normalizeComparisonText(formLabel);

  return {
    id: draft.id,
    primaryLabel,
    companyLabel,
    formLabel,
    showFormLabelBadge,
    quantityLabel: draft.preview?.quantityLabel ?? null,
    visitDateLabel: formatVisitDateLabel(draft.preview?.visitDate ?? null),
    similarityBadge: null,
  };
}

export function buildHubDraftDisplays(drafts: HubDraft[]) {
  const displays = drafts.map((draft) => buildBaseDisplay(draft));
  const similarityGroups = new Map<string, number[]>();

  displays.forEach((display, index) => {
    const key = buildSimilarityKey(drafts[index]!, display.primaryLabel);
    if (!key) {
      return;
    }

    const indexes = similarityGroups.get(key) ?? [];
    indexes.push(index);
    similarityGroups.set(key, indexes);
  });

  for (const indexes of similarityGroups.values()) {
    if (indexes.length < 2) {
      continue;
    }

    indexes.forEach((displayIndex, position) => {
      displays[displayIndex] = {
        ...displays[displayIndex]!,
        similarityBadge: `Similar ${position + 1}/${indexes.length}`,
      };
    });
  }

  return displays;
}
