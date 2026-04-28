import type { sheets_v4 } from "googleapis";
import { getDriveClient, getSheetsClient } from "@/lib/google/auth";
import {
  escapeDriveQueryValue,
  requireDriveFileId,
} from "@/lib/google/driveQuery";
import {
  buildSpreadsheetSheetLink,
  clearProtectedRanges,
  getRequestedSheetTitleCandidates,
  normalizeA1Range,
  type CheckboxValidationConfig,
  type FooterActaRef,
  type FormSheetMutation,
  type HiddenRows,
  type RowInsertion,
  type SheetVisibilityState,
  type TemplateBlockInsertion,
} from "@/lib/google/sheets";
import {
  copyTemplate,
  hideSheets,
  resolveRequestedSheetTitle,
} from "@/lib/google/sheets";

const GOOGLE_SHEETS_MIME = "application/vnd.google-apps.spreadsheet";
const INTERNAL_TEMPLATE_PREFIX = "__RECA_TEMPLATE__ ";
const MAX_DATED_SHEET_TITLE_ATTEMPTS = 10_000;
const MAX_BATCH_GET_RANGES_PER_REQUEST = 50;
const MAX_BATCH_GET_QUERY_LENGTH = 3_500;

interface PreparedCompanySpreadsheetResult {
  spreadsheetId: string;
  effectiveMutation: FormSheetMutation;
  effectiveSheetReplacements: Record<string, string> | null;
  effectiveSheetNames: string[];
  activeSheetName: string;
  activeSheetId?: number;
  sheetLink: string;
  reusedSpreadsheet: boolean;
}

type SpreadsheetSheetProperties = NonNullable<sheets_v4.Schema$Sheet["properties"]>;

function extractSheetNameFromA1(rangeName: string) {
  const match = /^'([^']+)'!/.exec(normalizeA1Range(rangeName));
  return match?.[1] ?? "";
}

function replaceSheetNameInA1(
  rangeName: string,
  replacements: Record<string, string>
) {
  const text = normalizeA1Range(rangeName);
  const match = /^'([^']+)'!(.+)$/.exec(text);
  if (!match) {
    return normalizeA1Range(text);
  }

  const currentSheet = match[1];
  const nextSheet = replacements[currentSheet] ?? currentSheet;
  return normalizeA1Range(`'${nextSheet}'!${match[2]}`);
}

export function rangeHasValues(rows: unknown[][] | undefined) {
  for (const row of rows ?? []) {
    for (const value of row ?? []) {
      if (value == null) {
        continue;
      }

      if (typeof value === "string") {
        const normalizedValue = value.trim().toUpperCase();
        if (!normalizedValue || normalizedValue === "FALSE") {
          continue;
        }

        return true;
      }

      if (typeof value === "boolean") {
        if (value) {
          return true;
        }
        continue;
      }

      return true;
    }
  }

  return false;
}

function countPopulatedTargetRanges(
  valuesByRange: Record<string, unknown[][]>,
  expectedRanges: string[]
) {
  return expectedRanges.reduce((count, rangeName) => {
    return count + (rangeHasValues(valuesByRange[rangeName]) ? 1 : 0);
  }, 0);
}

function getBogotaDateText(currentDate = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(currentDate);
}

export function buildDatedSheetTitle(
  baseTitle: string,
  existingTitles: string[],
  currentDate = new Date()
) {
  const safeBase = String(baseTitle || "").trim() || "Hoja";
  const dateText = getBogotaDateText(currentDate);
  const suffix = dateText ? ` - ${dateText}` : "";
  const maxTitleLength = 100;
  const baseWithoutOverflow =
    safeBase.slice(0, Math.max(1, maxTitleLength - suffix.length)).trim() || "Hoja";

  const firstCandidate = `${baseWithoutOverflow}${suffix}`;
  if (!existingTitles.includes(firstCandidate)) {
    return firstCandidate;
  }

  for (let counter = 2; counter <= MAX_DATED_SHEET_TITLE_ATTEMPTS; counter += 1) {
    const numberedSuffix = `${suffix} (${counter})`;
    const nextBase =
      safeBase
        .slice(0, Math.max(1, maxTitleLength - numberedSuffix.length))
        .trim() || "Hoja";
    const candidate = `${nextBase}${numberedSuffix}`;
    if (!existingTitles.includes(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `No se pudo generar un nombre unico para la hoja "${safeBase}" tras ${MAX_DATED_SHEET_TITLE_ATTEMPTS} intentos.`
  );
}

export function buildInternalTemplateSheetTitle(baseTitle: string) {
  const safeBase = String(baseTitle || "").trim() || "Hoja";
  const maxTitleLength = 100;
  const suffixLength = INTERNAL_TEMPLATE_PREFIX.length;
  const normalizedBase =
    safeBase.slice(0, Math.max(1, maxTitleLength - suffixLength)).trim() || "Hoja";

  return `${INTERNAL_TEMPLATE_PREFIX}${normalizedBase}`;
}

export function rewriteFormSheetMutation(
  mutation: FormSheetMutation,
  replacements: Record<string, string>
): FormSheetMutation {
  const rewriteSheetName = (sheetName: string) => replacements[sheetName] ?? sheetName;

  const rowInsertions: RowInsertion[] = (mutation.rowInsertions ?? []).map((item) => ({
    ...item,
    sheetName: rewriteSheetName(item.sheetName),
  }));

  const hiddenRows: HiddenRows[] = (mutation.hiddenRows ?? []).map((item) => ({
    ...item,
    sheetName: rewriteSheetName(item.sheetName),
  }));

  const templateBlockInsertions: TemplateBlockInsertion[] = (
    mutation.templateBlockInsertions ?? []
  ).map((item) => ({
    ...item,
    sheetName: rewriteSheetName(item.sheetName),
  }));

  const checkboxValidations: CheckboxValidationConfig[] = (
    mutation.checkboxValidations ?? []
  ).map((item) => ({
    ...item,
    sheetName: rewriteSheetName(item.sheetName),
  }));

  const footerActaRefs: FooterActaRef[] = (mutation.footerActaRefs ?? []).map(
    (item) => ({
      ...item,
      sheetName: rewriteSheetName(item.sheetName),
    })
  );

  const autoResizeExcludedRows = Object.fromEntries(
    Object.entries(mutation.autoResizeExcludedRows ?? {}).map(([sheetName, rows]) => [
      rewriteSheetName(sheetName),
      rows,
    ])
  );

  return {
    writes: mutation.writes.map((write) => ({
      ...write,
      range: replaceSheetNameInA1(write.range, replacements),
    })),
    templateBlockInsertions,
    rowInsertions,
    ...(mutation.hiddenRows ? { hiddenRows } : {}),
    checkboxValidations,
    footerActaRefs,
    autoResizeExcludedRows,
  };
}

function collectMutationSheetNames(mutation: FormSheetMutation) {
  const sheetNames = new Set<string>();

  for (const write of mutation.writes) {
    const sheetName = extractSheetNameFromA1(write.range);
    if (sheetName) {
      sheetNames.add(sheetName);
    }
  }

  for (const insertion of mutation.templateBlockInsertions ?? []) {
    if (insertion.sheetName) {
      sheetNames.add(insertion.sheetName);
    }
  }

  for (const insertion of mutation.rowInsertions ?? []) {
    if (insertion.sheetName) {
      sheetNames.add(insertion.sheetName);
    }
  }

  for (const group of mutation.hiddenRows ?? []) {
    if (group.sheetName) {
      sheetNames.add(group.sheetName);
    }
  }

  for (const validation of mutation.checkboxValidations ?? []) {
    if (validation.sheetName) {
      sheetNames.add(validation.sheetName);
    }
  }

  for (const footerActaRef of mutation.footerActaRefs ?? []) {
    if (footerActaRef.sheetName) {
      sheetNames.add(footerActaRef.sheetName);
    }
  }

  return sheetNames;
}

function collectTargetSheetRanges(mutation: FormSheetMutation) {
  const rangesBySheet = new Map<string, Set<string>>();

  for (const sheetName of collectMutationSheetNames(mutation)) {
    rangesBySheet.set(sheetName, new Set<string>());
  }

  for (const write of mutation.writes) {
    const sheetName = extractSheetNameFromA1(write.range);
    if (!sheetName) {
      continue;
    }

    const ranges = rangesBySheet.get(sheetName) ?? new Set<string>();
    ranges.add(write.range);
    rangesBySheet.set(sheetName, ranges);
  }

  for (const validation of mutation.checkboxValidations ?? []) {
    const ranges = rangesBySheet.get(validation.sheetName) ?? new Set<string>();
    for (const cell of validation.cells) {
      ranges.add(`'${validation.sheetName}'!${cell}`);
    }
    rangesBySheet.set(validation.sheetName, ranges);
  }

  return rangesBySheet;
}

async function findSpreadsheetInFolder(parentFolderId: string, fileName: string) {
  const drive = getDriveClient();
  const safeName = escapeDriveQueryValue(fileName);
  const query = [
    `mimeType='${GOOGLE_SHEETS_MIME}'`,
    `name='${safeName}'`,
    `'${parentFolderId}' in parents`,
    "trashed=false",
  ].join(" and ");

  const response = await drive.files.list({
    q: query,
    fields: "files(id,name,webViewLink)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 1,
  });

  const file = response.data.files?.[0] ?? null;
  if (!file) {
    return null;
  }

  return {
    ...file,
    id: requireDriveFileId(file.id, `buscar spreadsheet "${fileName}"`),
  };
}

export async function listSheets(spreadsheetId: string) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const hasSheetProperties = (
    props: sheets_v4.Schema$Sheet["properties"] | null | undefined
  ): props is SpreadsheetSheetProperties =>
    Boolean(props?.sheetId != null && props?.title);

  return (meta.data.sheets ?? [])
    .map((sheet) => sheet.properties)
    .filter(hasSheetProperties)
    .map(
      (props): SheetVisibilityState => ({
        sheetId: props.sheetId!,
        title: String(props.title ?? "").trim(),
        hidden: Boolean(props.hidden),
      })
    );
}

async function batchReadSheetValues(spreadsheetId: string, ranges: string[]) {
  if (ranges.length === 0) {
    return {} as Record<string, unknown[][]>;
  }

  const normalizedRanges = ranges.map((range) => normalizeA1Range(range));
  const rangeChunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentQueryLength = 0;

  for (const range of normalizedRanges) {
    const encodedRangeLength =
      "ranges=".length + encodeURIComponent(range).length + 1;
    const exceedsChunkSize =
      currentChunk.length >= MAX_BATCH_GET_RANGES_PER_REQUEST;
    const exceedsQueryLength =
      currentChunk.length > 0 &&
      currentQueryLength + encodedRangeLength > MAX_BATCH_GET_QUERY_LENGTH;

    if (exceedsChunkSize || exceedsQueryLength) {
      rangeChunks.push(currentChunk);
      currentChunk = [];
      currentQueryLength = 0;
    }

    currentChunk.push(range);
    currentQueryLength += encodedRangeLength;
  }

  if (currentChunk.length > 0) {
    rangeChunks.push(currentChunk);
  }

  const sheets = getSheetsClient();
  const valuesByRange: Record<string, unknown[][]> = {};

  for (const chunk of rangeChunks) {
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: chunk,
    });

    for (const valueRange of response.data.valueRanges ?? []) {
      const rangeName = String(valueRange.range ?? "").trim();
      if (!rangeName) {
        continue;
      }

      valuesByRange[rangeName] =
        (valueRange.values as unknown[][] | undefined) ?? [];
    }
  }

  return valuesByRange;
}

export async function copySheetToSpreadsheet(
  sourceSpreadsheetId: string,
  sourceSheetName: string,
  destinationSpreadsheetId: string,
  newSheetName?: string
) {
  const sheets = getSheetsClient();
  const sourceSheets = await listSheets(sourceSpreadsheetId);
  const resolvedSourceSheetTitle = resolveRequestedSheetTitle(
    sourceSheetName,
    sourceSheets.map((sheet) => sheet.title)
  );
  const sourceSheet = sourceSheets.find(
    (sheet) => sheet.title === resolvedSourceSheetTitle
  );

  if (!sourceSheet) {
    throw new Error(
      `No existe la hoja "${sourceSheetName}" en el archivo maestro.`
    );
  }

  const copied = await sheets.spreadsheets.sheets.copyTo({
    spreadsheetId: sourceSpreadsheetId,
    sheetId: sourceSheet.sheetId,
    requestBody: {
      destinationSpreadsheetId,
    },
  });

  const copiedSheetId = copied.data.sheetId;
  const copiedTitle = String(copied.data.title ?? "").trim();
  const targetTitle = String(newSheetName ?? copiedTitle ?? sourceSheetName).trim();

  if (copiedSheetId != null && targetTitle && targetTitle !== copiedTitle) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: destinationSpreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: copiedSheetId,
                title: targetTitle,
              },
              fields: "title",
            },
          },
        ],
      },
    });
  }

  return {
    sheetId: copiedSheetId ?? undefined,
    title: targetTitle || copiedTitle || sourceSheetName,
  };
}

export async function copySheetsToSpreadsheet(options: {
  sourceSpreadsheetId: string;
  destinationSpreadsheetId: string;
  sheetNames: string[];
  onStep?: (label: string) => void;
}) {
  const sheets = getSheetsClient();
  const sourceSheets = await listSheets(options.sourceSpreadsheetId);
  options.onStep?.("copy_bundle.source_metadata");
  const sourceTitles = sourceSheets.map((sheet) => sheet.title);
  const copiedSheets: SheetVisibilityState[] = [];

  for (const requestedSheetName of options.sheetNames) {
    const resolvedSourceSheetTitle = resolveRequestedSheetTitle(
      requestedSheetName,
      sourceTitles
    );
    const sourceSheet = sourceSheets.find(
      (sheet) => sheet.title === resolvedSourceSheetTitle
    );

    if (!sourceSheet) {
      throw new Error(
        `No existe la hoja "${requestedSheetName}" en el archivo maestro.`
      );
    }

    const copied = await sheets.spreadsheets.sheets.copyTo({
      spreadsheetId: options.sourceSpreadsheetId,
      sheetId: sourceSheet.sheetId,
      requestBody: {
        destinationSpreadsheetId: options.destinationSpreadsheetId,
      },
    });

    const copiedSheetId = copied.data.sheetId;
    const copiedTitle = String(copied.data.title ?? "").trim();
    const targetTitle = String(requestedSheetName || copiedTitle).trim();

    if (copiedSheetId != null && targetTitle && targetTitle !== copiedTitle) {
      // Keep this rename immediate: later copied sheets may contain formulas
      // that reference support sheets by title, so deferring support-sheet
      // renames can reintroduce cached #REF! values.
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: options.destinationSpreadsheetId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: copiedSheetId,
                  title: targetTitle,
                },
                fields: "title",
              },
            },
          ],
        },
      });
    }

    copiedSheets.push({
      sheetId: copiedSheetId ?? sourceSheet.sheetId,
      title: targetTitle || copiedTitle || requestedSheetName,
      hidden: false,
    });
  }

  options.onStep?.("copy_bundle.copy_to");
  return copiedSheets;
}

export function findMatchingSheet(
  sheets: SheetVisibilityState[],
  requestedSheetName: string
) {
  const resolvedTitle = resolveRequestedSheetTitle(
    requestedSheetName,
    sheets.map((sheet) => sheet.title)
  );

  if (!resolvedTitle) {
    return null;
  }

  return sheets.find((sheet) => sheet.title === resolvedTitle) ?? null;
}

function findInternalTemplateSheet(
  sheets: SheetVisibilityState[],
  requestedSheetName: string
) {
  const candidateTitles = getRequestedSheetTitleCandidates(
    requestedSheetName
  ).map((title) => buildInternalTemplateSheetTitle(title));

  return (
    sheets.find((sheet) => candidateTitles.includes(sheet.title)) ?? null
  );
}

async function duplicateSheetInSpreadsheet(
  spreadsheetId: string,
  sourceSheetId: number,
  newSheetName: string
) {
  const sheets = getSheetsClient();
  const duplicated = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          duplicateSheet: {
            sourceSheetId,
            newSheetName,
          },
        },
      ],
    },
  });

  const duplicatedSheet =
    duplicated.data.replies?.[0]?.duplicateSheet?.properties ?? undefined;

  return {
    sheetId: duplicatedSheet?.sheetId ?? undefined,
    title: String(duplicatedSheet?.title ?? newSheetName).trim() || newSheetName,
  };
}

async function ensureInternalTemplateSheet(
  spreadsheetId: string,
  sourceSheet: SheetVisibilityState,
  existingTitles: Set<string>,
  onStep?: (label: string) => void
) {
  const templateTitle = buildInternalTemplateSheetTitle(sourceSheet.title);
  if (existingTitles.has(templateTitle)) {
    return {
      title: templateTitle,
      created: false,
    };
  }

  const duplicatedSheet = await duplicateSheetInSpreadsheet(
    spreadsheetId,
    sourceSheet.sheetId,
    templateTitle
  );
  existingTitles.add(duplicatedSheet.title);
  onStep?.(`spreadsheet.seed_internal_template:${sourceSheet.title}`);

  return {
    title: duplicatedSheet.title,
    created: true,
  };
}

export async function prepareCompanySpreadsheet({
  masterTemplateId,
  companyFolderId,
  spreadsheetName,
  activeSheetName,
  mutation,
  extraVisibleSheetNames = [],
  onStep,
}: {
  masterTemplateId: string;
  companyFolderId: string;
  spreadsheetName: string;
  activeSheetName: string;
  mutation: FormSheetMutation;
  extraVisibleSheetNames?: string[];
  onStep?: (label: string) => void;
}): Promise<PreparedCompanySpreadsheetResult> {
  const existingSpreadsheet = await findSpreadsheetInFolder(
    companyFolderId,
    spreadsheetName
  );
  onStep?.("spreadsheet.find_in_folder");
  const reusedSpreadsheet = Boolean(existingSpreadsheet?.id);
  const spreadsheetId =
    existingSpreadsheet?.id ??
    (
      await copyTemplate(masterTemplateId, spreadsheetName, companyFolderId)
    ).fileId;
  if (!reusedSpreadsheet) {
    onStep?.("spreadsheet.copy_master");
  }

  const rangesBySheet = collectTargetSheetRanges(mutation);
  const requestedSheetNames = Array.from(
    new Set([
      ...Array.from(rangesBySheet.keys()),
      ...extraVisibleSheetNames
        .map((sheetName) => String(sheetName ?? "").trim())
        .filter(Boolean),
    ])
  );

  requestedSheetNames.forEach((sheetName) => {
    if (!rangesBySheet.has(sheetName)) {
      rangesBySheet.set(sheetName, new Set<string>());
    }
  });
  const replacements: Record<string, string> = {};
  let sheets = await listSheets(spreadsheetId);
  onStep?.("spreadsheet.list_sheets_initial");
  const existingTitles = new Set(sheets.map((sheet) => sheet.title));

  for (const [sheetName, ranges] of rangesBySheet.entries()) {
    const existingSheet = findMatchingSheet(sheets, sheetName);
    const internalTemplateSheet = findInternalTemplateSheet(sheets, sheetName);

    if (!existingSheet) {
      const copiedSheet = await copySheetToSpreadsheet(
        masterTemplateId,
        sheetName,
        spreadsheetId,
        sheetName
      );
      existingTitles.add(copiedSheet.title);
      sheets = [
        ...sheets,
        {
          sheetId: copiedSheet.sheetId ?? -1,
          title: copiedSheet.title,
          hidden: false,
        },
      ];
      const seededTemplateSource = sheets.find(
        (sheet) => sheet.title === copiedSheet.title
      );
      if (seededTemplateSource) {
        await ensureInternalTemplateSheet(
          spreadsheetId,
          seededTemplateSource,
          existingTitles,
          onStep
        );
      }
      if (copiedSheet.title !== sheetName) {
        replacements[sheetName] = copiedSheet.title;
      }
      continue;
    }

    if (existingSheet.title !== sheetName) {
      replacements[sheetName] = existingSheet.title;
    }

    if (!reusedSpreadsheet) {
      await ensureInternalTemplateSheet(
        spreadsheetId,
        existingSheet,
        existingTitles,
        onStep
      );
      continue;
    }

    const populatedRanges = countPopulatedTargetRanges(
      await batchReadSheetValues(
        spreadsheetId,
        Array.from(ranges, (range) => normalizeA1Range(range))
      ),
      Array.from(ranges, (range) => normalizeA1Range(range))
    );
    onStep?.(`spreadsheet.check_usage:${sheetName}`);

    if (populatedRanges <= 0) {
      await ensureInternalTemplateSheet(
        spreadsheetId,
        existingSheet,
        existingTitles,
        onStep
      );
      continue;
    }

    const newSheetName = buildDatedSheetTitle(
      sheetName,
      Array.from(existingTitles)
    );
    const copiedSheet = internalTemplateSheet
      ? await duplicateSheetInSpreadsheet(
          spreadsheetId,
          internalTemplateSheet.sheetId,
          newSheetName
        )
      : await copySheetToSpreadsheet(
          masterTemplateId,
          sheetName,
          spreadsheetId,
          newSheetName
        );
    replacements[sheetName] = copiedSheet.title;
    existingTitles.add(copiedSheet.title);
    sheets = [
      ...sheets,
      {
        sheetId: copiedSheet.sheetId ?? -1,
        title: copiedSheet.title,
        hidden: false,
      },
    ];
    if (!internalTemplateSheet) {
      const seededTemplateSource = sheets.find(
        (sheet) => sheet.title === copiedSheet.title
      );
      if (seededTemplateSource) {
        await ensureInternalTemplateSheet(
          spreadsheetId,
          seededTemplateSource,
          existingTitles,
          onStep
        );
      }
    }
    onStep?.(
      internalTemplateSheet
        ? `spreadsheet.duplicate_internal_template:${sheetName}`
        : `spreadsheet.duplicate_sheet:${sheetName}`
    );
  }

  const effectiveMutation =
    Object.keys(replacements).length > 0
      ? rewriteFormSheetMutation(mutation, replacements)
      : mutation;
  const effectiveSheetNames = Array.from(
    new Set(
      requestedSheetNames.map((sheetName) => {
        const rewrittenSheetName = replacements[sheetName];
        if (rewrittenSheetName) {
          return rewrittenSheetName;
        }

        const matchingSheet = findMatchingSheet(sheets, sheetName);
        return matchingSheet?.title ?? sheetName;
      })
    )
  );
  const resolvedActiveSheetName = replacements[activeSheetName] ?? activeSheetName;
  await clearProtectedRanges(spreadsheetId);
  onStep?.("spreadsheet.clear_protections");
  const visibleSheets = await hideSheets(spreadsheetId, effectiveSheetNames);
  onStep?.("spreadsheet.hide_unused_sheets");
  const activeSheetId = visibleSheets.get(resolvedActiveSheetName);

  return {
    spreadsheetId,
    effectiveMutation,
    effectiveSheetReplacements:
      Object.keys(replacements).length > 0 ? replacements : null,
    effectiveSheetNames,
    activeSheetName: resolvedActiveSheetName,
    activeSheetId,
    sheetLink: buildSpreadsheetSheetLink(spreadsheetId, activeSheetId),
    reusedSpreadsheet,
  };
}
