import fs from "node:fs";
import path from "node:path";

const DEFAULT_ENV_FILES = [".env.local", ".env.google.local"];

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(content) {
  const entries = [];

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1).trim());
    entries.push([key, value]);
  }

  return entries;
}

export function loadLocalEnvFiles(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const files = options.files ?? DEFAULT_ENV_FILES;
  const override = options.override ?? false;

  for (const relativeFile of files) {
    const absoluteFile = path.resolve(
      /* turbopackIgnore: true */ cwd,
      relativeFile
    );
    if (!fs.existsSync(absoluteFile)) {
      continue;
    }

    const content = fs.readFileSync(absoluteFile, "utf8");
    for (const [key, value] of parseEnvFile(content)) {
      if (!override && process.env[key] !== undefined) {
        continue;
      }

      process.env[key] = value;
    }
  }
}
