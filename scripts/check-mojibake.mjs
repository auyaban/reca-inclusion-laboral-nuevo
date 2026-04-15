import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "coverage", "out"]);
const INCLUDED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".sql",
  ".css",
  ".yml",
  ".yaml",
]);
const EXCLUDED_FILE_PATTERN = /\.(test|spec)\.[^.]+$/i;
const MOJIBAKE_PATTERN = /[\u00c3\u00c2\uFFFD]/g;
const DEFAULT_TARGETS = [
  "supabase/functions/text-review-orthography",
];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(entry, out) {
  const stat = await fs.stat(entry);
  if (stat.isDirectory()) {
    const items = await fs.readdir(entry, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && IGNORED_DIRS.has(item.name)) {
        continue;
      }
      await collectFiles(path.join(entry, item.name), out);
    }
    return;
  }

  const ext = path.extname(entry).toLowerCase();
  if (!INCLUDED_EXTENSIONS.has(ext)) {
    return;
  }
  if (EXCLUDED_FILE_PATTERN.test(path.basename(entry))) {
    return;
  }
  out.push(entry);
}

async function scanFile(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    MOJIBAKE_PATTERN.lastIndex = 0;
    for (const match of line.matchAll(MOJIBAKE_PATTERN)) {
      hits.push({
        line: lineIndex + 1,
        column: (match.index ?? 0) + 1,
        char: match[0],
        snippet: line.slice(Math.max(0, (match.index ?? 0) - 30), (match.index ?? 0) + 30).trim(),
      });
    }
  }
  return hits;
}

async function main() {
  const files = [];
  for (const target of DEFAULT_TARGETS) {
    const abs = path.resolve(ROOT, target);
    if (!(await exists(abs))) {
      continue;
    }
    await collectFiles(abs, files);
  }

  const hits = [];
  for (const file of files.sort()) {
    const matches = await scanFile(file);
    for (const match of matches) {
      hits.push({
        file: path.relative(ROOT, file),
        ...match,
      });
    }
  }

  if (hits.length === 0) {
    console.log("No mojibake found.");
    return;
  }

  console.error("Mojibake encontrado:");
  for (const hit of hits) {
    console.error(
      `${hit.file}:${hit.line}:${hit.column} -> ${hit.char} :: ${hit.snippet}`
    );
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
