import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const MIGRATION_SUFFIX = "_ods_import_failures.sql";
const DOC_PATH = join(process.cwd(), "docs", "ods_migration_inventory.md");

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const nonAdminJwt = process.env.SUPABASE_TEST_NON_ADMIN_JWT;
const telemetryAdminJwt = process.env.SUPABASE_TEST_TELEMETRIA_ADMIN_JWT;

const runIntegration = Boolean(supabaseUrl && serviceRoleKey);

function readMigration() {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) =>
    name.endsWith(MIGRATION_SUFFIX)
  );

  expect(migrationName).toBeDefined();
  return readFileSync(join(migrationsDir, migrationName ?? ""), "utf8");
}

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_TEST_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function publicClient(token?: string) {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_TEST_URL or anon/publishable key.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

describe("ODS #75 ods_import_failures migration contract", () => {
  it("declara tabla append-only, RLS admin y RPC server-only", () => {
    const sql = readMigration();

    expect(sql).toContain("create table if not exists public.ods_import_failures");
    expect(sql).toMatch(/constraint\s+ods_import_failures_stage_non_empty/i);
    expect(sql).toMatch(/constraint\s+ods_import_failures_input_summary_object/i);
    expect(sql).toMatch(/constraint\s+ods_import_failures_error_kind_check/i);
    expect(sql).toMatch(/on\s+public\.ods_import_failures\s*\(created_at\s+desc\)/i);
    expect(sql).toMatch(/alter\s+table\s+public\.ods_import_failures\s+enable\s+row\s+level\s+security/i);
    expect(sql).toContain("ods_telemetria_admin");
    expect(sql).toMatch(/security\s+definer/i);
    expect(sql).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(sql).toMatch(/revoke\s+execute\s+on\s+function\s+public\.ods_record_import_failure\(text,\s*text,\s*text,\s*jsonb,\s*uuid\)\s+from\s+public,\s*anon,\s*authenticated\s*;/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.ods_record_import_failure\(text,\s*text,\s*text,\s*jsonb,\s*uuid\)\s+to\s+service_role\s*;/i);
    expect(sql).toMatch(/grant\s+select,\s*insert\s+on\s+table\s+public\.ods_import_failures\s+to\s+service_role\s*;/i);
    expect(sql).not.toMatch(/grant\s+.*\b(update|delete)\b.*public\.ods_import_failures\s+to\s+service_role/i);
  });

  it("documenta ods_import_failures en el inventory ODS", () => {
    expect(existsSync(DOC_PATH)).toBe(true);
    const markdown = readFileSync(DOC_PATH, "utf8");

    expect(markdown).toContain("Tablas de auditoria / observabilidad ODS");
    expect(markdown).toContain("ods_import_failures");
    expect(markdown).toContain("#75");
    expect(markdown).toContain("no-PII");
  });
});

describe.runIf(runIntegration)("ods_record_import_failure RPC integration", () => {
  it("inserta failure desde service_role y retorna id + created_at", async () => {
    const stage = `vitest.import_failure.${Date.now()}`;
    const { data, error } = await adminClient().rpc("ods_record_import_failure", {
      p_stage: stage,
      p_error_message: "permission denied for [url]",
      p_error_kind: "permission",
      p_input_summary: { origin: "pdf", file_type: "pdf", has_file: true },
      p_user_id: null,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      id: expect.any(String),
      created_at: expect.any(String),
    });

    const { data: rows, error: selectError } = await adminClient()
      .from("ods_import_failures")
      .select("stage, error_message, error_kind, input_summary")
      .eq("id", data.id)
      .limit(1);

    expect(selectError).toBeNull();
    expect(rows?.[0]).toMatchObject({
      stage,
      error_message: "permission denied for [url]",
      error_kind: "permission",
      input_summary: { origin: "pdf", file_type: "pdf", has_file: true },
    });
  });

  it.runIf(Boolean(anonKey))("deniega RPC desde anon", async () => {
    const { data, error } = await publicClient().rpc("ods_record_import_failure", {
      p_stage: "vitest.anon",
      p_error_message: "denied",
      p_error_kind: "permission",
      p_input_summary: { origin: "pdf" },
      p_user_id: null,
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it.runIf(Boolean(nonAdminJwt && anonKey))("deniega RPC desde authenticated sin grant", async () => {
    const { data, error } = await publicClient(nonAdminJwt).rpc("ods_record_import_failure", {
      p_stage: "vitest.auth",
      p_error_message: "denied",
      p_error_kind: "permission",
      p_input_summary: { origin: "pdf" },
      p_user_id: null,
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it.runIf(Boolean(anonKey))("bloquea select anon por permisos/RLS", async () => {
    const { data, error } = await publicClient()
      .from("ods_import_failures")
      .select("id")
      .limit(1);

    expect(error ?? data).toBeTruthy();
    if (!error) expect(data).toEqual([]);
  });

  it.runIf(Boolean(nonAdminJwt && anonKey))("bloquea select authenticated sin ods_telemetria_admin", async () => {
    const { data, error } = await publicClient(nonAdminJwt)
      .from("ods_import_failures")
      .select("id")
      .limit(1);

    expect(error ?? data).toBeTruthy();
    if (!error) expect(data).toEqual([]);
  });

  it.runIf(Boolean(telemetryAdminJwt && anonKey))("permite select a usuario ods_telemetria_admin", async () => {
    const { error } = await publicClient(telemetryAdminJwt)
      .from("ods_import_failures")
      .select("id")
      .limit(1);

    expect(error).toBeNull();
  });
});
