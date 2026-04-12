import type { sheets_v4 } from "googleapis";
import { getDriveClient, getSheetsClient } from "@/lib/google/auth";
import {
  buildSpreadsheetSheetLink,
  type CheckboxValidationConfig,
  type FormSheetMutation,
  type RowInsertion,
  type SheetVisibilityState,
} from "@/lib/google/sheets";
import { copyTemplate, hideSheets } from "@/lib/google/sheets";

const GOOGLE_SHEETS_MIME = "application/vnd.google-apps.spreadsheet";

interface PreparedCompanySpreadsheetResult {
  spreadsheetId: string;
  effectiveMutation: FormSheetMutation;
  effectiveSheetNames: string[];
  activeSheetName: string;
  activeSheetId?: number;
  sheetLink: string;
  reusedSpreadsheet: boolean;
}

type SpreadsheetSheetProperties = NonNullable<sheets_v4.Schema$Sheet["properties"]>;

function extractSheetNameFromA1(rangeName: string) {
  const match = /^'([^']+)'!/.exec(String(rangeName || "").trim());
  return match?.[1] ?? "";
}

function replaceSheetNameInA1(
  rangeName: string,
  replacements: Record<string, string>
) {
  const text = String(rangeName || "").trim();
  const match = /^'([^']+)'!(.+)$/.exec(text);
  if (!match) {
    return text;
  }

  const currentSheet = match[1];
  const nextSheet = replacements[currentSheet] ?? currentSheet;
  return `'${nextSheet}'!${match[2]}`;
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

        if (normalizedValue) {
          return true;
        }
        continue;
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

  let counter = 2;
  while (true) {
    const numberedSuffix = `${suffix} (${counter})`;
    const nextBase =
      safeBase
        .slice(0, Math.max(1, maxTitleLength - numberedSuffix.length))
        .trim() || "Hoja";
    const candidate = `${nextBase}${numberedSuffix}`;
    if (!existingTitles.includes(candidate)) {
      return candidate;
    }
    counter += 1;
  }
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

  const checkboxValidations: CheckboxValidationConfig[] = (
    mutation.checkboxValidations ?? []
  ).map((item) => ({
    ...item,
    sheetName: rewriteSheetName(item.sheetName),
  }));

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
    rowInsertions,
    checkboxValidations,
    autoResizeExcludedRows,
  };
}

function collectTargetSheetRanges(mutation: FormSheetMutation) {
  const rangesBySheet = new Map<string, Set<string>>();

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
  const safeName = fileName.replace(/'/g, "\\'");
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

  return response.data.files?.[0] ?? null;
}

async function listSheets(spreadsheetId: string) {
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

  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });

  const valuesByRange: Record<string, unknown[][]> = {};
  for (const valueRange of response.data.valueRanges ?? []) {
    const rangeName = String(valueRange.range ?? "").trim();
    if (!rangeName) {
      continue;
    }

    valuesByRange[rangeName] = (valueRange.values as unknown[][] | undefined) ?? [];
  }

  return valuesByRange;
}

async function copySheetToSpreadsheet(
  sourceSpreadsheetId: string,
  sourceSheetName: string,
  destinationSpreadsheetId: string,
  newSheetName?: string
) {
  const sheets = getSheetsClient();
  const sourceSheets = await listSheets(sourceSpreadsheetId);
  const sourceSheet = sourceSheets.find((sheet) => sheet.title === sourceSheetName);

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

export async function prepareCompanySpreadsheet({
  masterTemplateId,
  companyFolderId,
  spreadsheetName,
  activeSheetName,
  mutation,
}: {
  masterTemplateId: string;
  companyFolderId: string;
  spreadsheetName: string;
  activeSheetName: string;
  mutation: FormSheetMutation;
}): Promise<PreparedCompanySpreadsheetResult> {
  const existingSpreadsheet = await findSpreadsheetInFolder(
    companyFolderId,
    spreadsheetName
  );
  const reusedSpreadsheet = Boolean(existingSpreadsheet?.id);
  const spreadsheetId =
    existingSpreadsheet?.id ??
    (
      await copyTemplate(masterTemplateId, spreadsheetName, companyFolderId)
    ).fileId;

  const rangesBySheet = collectTargetSheetRanges(mutation);
  const replacements: Record<string, string> = {};
  let sheets = await listSheets(spreadsheetId);
  const existingTitles = sheets.map((sheet) => sheet.title);

  for (const [sheetName, ranges] of rangesBySheet.entries()) {
    const existingSheet = sheets.find((sheet) => sheet.title === sheetName);

    if (!existingSheet) {
      const copiedSheet = await copySheetToSpreadsheet(
        masterTemplateId,
        sheetName,
        spreadsheetId,
        sheetName
      );
      sheets = await listSheets(spreadsheetId);
      if (copiedSheet.title !== sheetName) {
        replacements[sheetName] = copiedSheet.title;
      }
      continue;
    }

    if (!reusedSpreadsheet) {
      continue;
    }

    const populatedRanges = countPopulatedTargetRanges(
      await batchReadSheetValues(spreadsheetId, Array.from(ranges)),
      Array.from(ranges)
    );

    if (populatedRanges <= 0) {
      continue;
    }

    const newSheetName = buildDatedSheetTitle(sheetName, existingTitles);
    const copiedSheet = await copySheetToSpreadsheet(
      masterTemplateId,
      sheetName,
      spreadsheetId,
      newSheetName
    );
    replacements[sheetName] = copiedSheet.title;
    existingTitles.push(copiedSheet.title);
    sheets = await listSheets(spreadsheetId);
  }

  const effectiveMutation =
    Object.keys(replacements).length > 0
      ? rewriteFormSheetMutation(mutation, replacements)
      : mutation;
  const effectiveSheetNames = Array.from(
    new Set([
      ...Array.from(rangesBySheet.keys()).map(
        (sheetName) => replacements[sheetName] ?? sheetName
      ),
      ...(mutation.rowInsertions ?? []).map(
        (item) => replacements[item.sheetName] ?? item.sheetName
      ),
      ...(mutation.checkboxValidations ?? []).map(
        (item) => replacements[item.sheetName] ?? item.sheetName
      ),
    ].filter(Boolean))
  );
  const resolvedActiveSheetName = replacements[activeSheetName] ?? activeSheetName;
  const visibleSheets = await hideSheets(spreadsheetId, effectiveSheetNames);
  const activeSheetId = visibleSheets.get(resolvedActiveSheetName);

  return {
    spreadsheetId,
    effectiveMutation,
    effectiveSheetNames,
    activeSheetName: resolvedActiveSheetName,
    activeSheetId,
    sheetLink: buildSpreadsheetSheetLink(spreadsheetId, activeSheetId),
    reusedSpreadsheet,
  };
}
