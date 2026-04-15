import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { loadLocalEnvFiles } from "./load-local-env.mjs";

loadLocalEnvFiles();

const DEFAULT_SPREADSHEET_ID = "1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU";
const DEFAULT_CREDENTIALS_PATH = path.resolve(
  process.cwd(),
  "local-secrets",
  "google-master-mapping-service-account.json"
);
const DEFAULT_RANGES = ["A1:Z40", "A41:Z80"];

function resolveCredentialsPath() {
  const envPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim();
  if (envPath) {
    return path.resolve(process.cwd(), envPath);
  }

  return DEFAULT_CREDENTIALS_PATH;
}

function parseArgs(argv) {
  const options = {
    credentialsPath: resolveCredentialsPath(),
    spreadsheetId: process.env.GOOGLE_SHEETS_MASTER_ID || DEFAULT_SPREADSHEET_ID,
    sheetName: null,
    listSheets: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--credentials") {
      options.credentialsPath = path.resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (arg === "--spreadsheet-id") {
      options.spreadsheetId = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--sheet-name") {
      options.sheetName = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--list-sheets") {
      options.listSheets = true;
      continue;
    }
  }

  return options;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      [
        `No se encontró la credencial local en ${filePath}.`,
        "Copia el JSON del service account a esa ruta o usa --credentials <ruta>.",
      ].join(" ")
    );
  }
}

async function getSheetsClient(credentialsPath) {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (!raw) {
    requireFile(credentialsPath);
    raw = fs.readFileSync(credentialsPath, "utf8");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

function formatRows(range, rows) {
  const startRow = Number((range.match(/!(?:[A-Z]+)(\d+):/) || [])[1] || "1");

  return rows
    .map((row, index) => ({ rowNumber: startRow + index, row }))
    .filter(({ row }) => row.some((cell) => String(cell).trim().length > 0))
    .map(({ rowNumber, row }) => `${rowNumber}: ${row.join(" | ")}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sheets = await getSheetsClient(options.credentialsPath);

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: options.spreadsheetId,
    fields: "sheets.properties.title",
  });

  const sheetTitles = (meta.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter(Boolean);

  if (options.listSheets) {
    console.log(sheetTitles.join("\n"));
    return;
  }

  if (!options.sheetName) {
    throw new Error(
      "Debes indicar --sheet-name <nombre> o usar --list-sheets para inspeccionar el maestro."
    );
  }

  const targetSheetTitle =
    sheetTitles.find((title) => title === options.sheetName) ??
    sheetTitles.find(
      (title) => normalizeText(title) === normalizeText(options.sheetName)
    );

  if (!targetSheetTitle) {
    throw new Error(
      `No se encontró la pestaña '${options.sheetName}' en el spreadsheet maestro.`
    );
  }

  const ranges = DEFAULT_RANGES.map((range) => `'${targetSheetTitle}'!${range}`);
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: options.spreadsheetId,
    ranges,
    majorDimension: "ROWS",
  });

  const lines = [`TARGET_SHEET=${targetSheetTitle}`];

  for (const valueRange of response.data.valueRanges ?? []) {
    lines.push(...formatRows(valueRange.range ?? "", valueRange.values ?? []));
  }

  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
