import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatFrameworkAlignmentIssues,
  validateFrameworkAlignment,
} from "./framework-version-guard.mjs";

async function main() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.dirname(path.dirname(currentFile));
  const manifestPath = path.join(repoRoot, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const issues = validateFrameworkAlignment(manifest);

  if (issues.length > 0) {
    console.error("Framework alignment check failed:\n");
    console.error(formatFrameworkAlignmentIssues(issues));
    process.exit(1);
  }

  console.log("Framework/tooling alignment OK.");
}

void main();
