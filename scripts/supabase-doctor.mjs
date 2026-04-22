import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import { loadLocalEnvFiles } from "./load-local-env.mjs";

loadLocalEnvFiles();

const cwd = process.cwd();
const cliPath = path.join(
  cwd,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "supabase.cmd" : "supabase"
);
const projectRefPath = path.join(cwd, "supabase", ".temp", "project-ref");
const linkedProjectPath = path.join(cwd, "supabase", ".temp", "linked-project.json");
const mcpPath = path.join(cwd, ".mcp.json");
const doctorSqlPath = path.join(cwd, "supabase", ".temp", "codex-supabase-doctor.sql");

let hasIssues = false;

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : null;
}

function summarizeKey(value) {
  if (!value) {
    return "missing";
  }

  if (value.startsWith("sb_publishable_")) {
    return "set (sb_publishable_*)";
  }

  if (value.startsWith("sb_secret_")) {
    return "set (sb_secret_*)";
  }

  if (value.startsWith("eyJ")) {
    return "set (legacy jwt_*)";
  }

  return "set";
}

function runCli(args) {
  if (!fs.existsSync(cliPath)) {
    return { ok: false, error: `Local CLI missing at ${cliPath}` };
  }

  const result = spawnSync(cliPath, args, {
    cwd,
    env: process.env,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    error: result.error?.message ?? null,
  };
}

function runSqlProbe(sql) {
  fs.mkdirSync(path.dirname(doctorSqlPath), { recursive: true });
  fs.writeFileSync(doctorSqlPath, sql, "utf8");

  try {
    return runCli(["db", "query", "--linked", "--output", "json", "--file", doctorSqlPath]);
  } finally {
    if (fs.existsSync(doctorSqlPath)) {
      fs.unlinkSync(doctorSqlPath);
    }
  }
}

function getProjectRefFromUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith(".supabase.co") ? hostname.replace(".supabase.co", "") : hostname;
  } catch {
    return null;
  }
}

function parseMcpSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    return "missing";
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const url = parsed?.mcpServers?.supabase?.url;
    if (!url) {
      return "present (no supabase server entry)";
    }

    const projectRef = url.match(/[?&]project_ref=([^&]+)/)?.[1] ?? "unscoped";
    const readOnly = url.includes("read_only=true") ? "read-only" : "read-write";
    return `present (${projectRef}, ${readOnly})`;
  } catch (error) {
    hasIssues = true;
    return `invalid JSON (${error instanceof Error ? error.message : "unknown error"})`;
  }
}

const cliVersion = runCli(["--version"]);
const linkedProbe = runSqlProbe("select current_database() as db, current_user as role;");

const linkedProjectRef = readText(projectRefPath);
const linkedProjectRaw = readText(linkedProjectPath);
const linkedProject = linkedProjectRaw ? JSON.parse(linkedProjectRaw) : null;
const envProjectRef = getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");

console.log("Supabase repo doctor");
console.log("");

console.log("CLI");
if (cliVersion.ok) {
  console.log(`- local binary: ok (${cliPath})`);
  console.log(`- version: ${cliVersion.stdout}`);
} else {
  hasIssues = true;
  console.log(`- local binary: missing or broken (${cliVersion.error ?? cliVersion.stderr ?? "unknown error"})`);
}

console.log("");
console.log("Environment");
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing"}`);
console.log(
  `- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${summarizeKey(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )}`
);
console.log(
  `- SUPABASE_SERVICE_ROLE_KEY: ${summarizeKey(process.env.SUPABASE_SERVICE_ROLE_KEY)}`
);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  hasIssues = true;
}

console.log("");
console.log("Link");
console.log(`- supabase/.temp/project-ref: ${linkedProjectRef ?? "missing"}`);
console.log(
  `- linked project metadata: ${
    linkedProject ? `${linkedProject.name} (${linkedProject.ref})` : "missing"
  }`
);
console.log(`- project ref from NEXT_PUBLIC_SUPABASE_URL: ${envProjectRef ?? "unknown"}`);

if (!linkedProjectRef) {
  hasIssues = true;
}

console.log("");
console.log("Remote DB probe");
if (linkedProbe.ok) {
  try {
    const payload = JSON.parse(linkedProbe.stdout);
    const firstRow = Array.isArray(payload?.rows) ? payload.rows[0] : null;
    console.log(
      `- linked query: ok (${firstRow?.db ?? "unknown db"} as ${firstRow?.role ?? "unknown role"})`
    );
  } catch {
    console.log("- linked query: ok");
  }
} else {
  hasIssues = true;
  console.log(`- linked query: failed (${linkedProbe.error ?? linkedProbe.stderr ?? "unknown error"})`);
}

console.log("");
console.log("MCP");
console.log(`- .mcp.json: ${parseMcpSummary(mcpPath)}`);
console.log("- note: hosted Supabase MCP authenticates with OAuth or PAT, never with service_role.");

process.exit(hasIssues ? 1 : 0);
