import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATION_SUFFIX = "_rpc_form_finalization_request_lookup_by_artifact.sql";
const DOC_PATH = join(process.cwd(), "docs", "ods_migration_inventory.md");

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const runIntegration = Boolean(supabaseUrl && serviceRoleKey);
const testPrefix = `vitest-113-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const sheetUrl = `https://docs.google.com/spreadsheets/d/${testPrefix}SheetId/edit#gid=0`;
const driveUrl = `https://drive.google.com/file/d/${testPrefix}DriveId/view`;

function readLookupMigration() {
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

function publicClient() {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_TEST_URL or anon/publishable key.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("ODS #113 form_finalization_request_lookup_by_artifact migration contract", () => {
  it("declara RPC security definer server-only con filtros acotados", () => {
    const sql = readLookupMigration();

    expect(sql).toContain("form_finalization_request_lookup_by_artifact");
    expect(sql).toMatch(/returns\s+jsonb/i);
    expect(sql).toMatch(/security\s+definer/i);
    expect(sql).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(sql).toMatch(/status\s*=\s*'succeeded'/i);
    expect(sql).toMatch(/v_max_rows\s+constant\s+integer\s*:=\s*16/i);
    expect(sql).toMatch(/limit\s+v_max_rows/i);
    expect(sql).toMatch(/external_artifacts->>'spreadsheetId'/i);
    expect(sql).toMatch(/external_artifacts->>'sheetLink'/i);
    expect(sql).toMatch(/response_payload->>'sheetLink'/i);
    expect(sql).toMatch(/external_artifacts->>'pdfFileId'/i);
    expect(sql).toMatch(/external_artifacts->>'driveFileId'/i);
    expect(sql).toMatch(/external_artifacts->>'fileId'/i);
    expect(sql).toMatch(/response_payload->>'pdfFileId'/i);
    expect(sql).toMatch(/response_payload->>'driveFileId'/i);
    expect(sql).toMatch(/response_payload->>'fileId'/i);
    expect(sql).toMatch(/external_artifacts->>'pdfLink'/i);
    expect(sql).toMatch(/response_payload->>'pdfLink'/i);
    expect(sql).toMatch(/revoke\s+execute\s+on\s+function\s+public\.form_finalization_request_lookup_by_artifact\(text,\s*text,\s*text\)\s+from\s+public,\s*anon,\s*authenticated\s*;/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.form_finalization_request_lookup_by_artifact\(text,\s*text,\s*text\)\s+to\s+service_role\s*;/i);
    expect(sql).not.toMatch(/grant\s+execute\s+on\s+function\s+public\.form_finalization_request_lookup_by_artifact\(text,\s*text,\s*text\)\s+to\s+(public|anon|authenticated)/i);
  });

  it("documenta el RPC #113 en el inventory ODS", () => {
    expect(existsSync(DOC_PATH)).toBe(true);
    const markdown = readFileSync(DOC_PATH, "utf8");

    expect(markdown).toContain("RPCs server-only agregados");
    expect(markdown).toContain("form_finalization_request_lookup_by_artifact");
    expect(markdown).toContain("#113");
    expect(markdown).toContain("form_finalization_requests");
  });
});

describe.runIf(runIntegration)("form_finalization_request_lookup_by_artifact RPC integration", () => {
  let syntheticUserId: string | null = null;

  beforeAll(async () => {
    const admin = adminClient();
    const email = `vitest-${testPrefix}@example.invalid`;
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password: `Test-${testPrefix}-Password1!`,
      email_confirm: true,
    });

    expect(userError).toBeNull();
    syntheticUserId = userData.user?.id ?? null;
    expect(syntheticUserId).toEqual(expect.any(String));

    const { error: insertError } = await admin
      .from("form_finalization_requests")
      .insert([
        {
          idempotency_key: `${testPrefix}-sheet`,
          form_slug: "ods-test",
          user_id: syntheticUserId,
          status: "succeeded",
          stage: "completed",
          request_hash: `${testPrefix}-sheet-hash`,
          external_artifacts: {
            spreadsheetId: `${testPrefix}SheetId`,
            sheetLink: sheetUrl,
            actaRef: "ACTA-SHEET-113",
          },
          response_payload: {
            sheetLink: sheetUrl,
            actaRef: "ACTA-SHEET-113",
          },
        },
        {
          idempotency_key: `${testPrefix}-drive`,
          form_slug: "ods-test",
          user_id: syntheticUserId,
          status: "succeeded",
          stage: "completed",
          request_hash: `${testPrefix}-drive-hash`,
          external_artifacts: {
            pdfFileId: `${testPrefix}DriveId`,
            driveFileId: `${testPrefix}DriveId`,
            fileId: `${testPrefix}DriveId`,
            pdfLink: driveUrl,
            actaRef: "ACTA-DRIVE-113",
          },
          response_payload: {
            pdfFileId: `${testPrefix}DriveId`,
            driveFileId: `${testPrefix}DriveId`,
            fileId: `${testPrefix}DriveId`,
            pdfLink: driveUrl,
            actaRef: "ACTA-DRIVE-113",
          },
        },
      ]);

    expect(insertError).toBeNull();
  });

  afterAll(async () => {
    if (!supabaseUrl || !serviceRoleKey) return;
    const admin = adminClient();

    const { error: cleanupRowsError } = await admin
      .from("form_finalization_requests")
      .delete()
      .like("idempotency_key", `${testPrefix}%`);
    if (cleanupRowsError) {
      console.warn("[ods #113 test cleanup] form_finalization_requests", cleanupRowsError.message);
    }

    if (syntheticUserId) {
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(syntheticUserId);
      if (deleteUserError) {
        console.warn("[ods #113 test cleanup] auth user", deleteUserError.message);
      }
    }
  });

  it("retorna filas relevantes para google_sheet con service_role", async () => {
    const { data, error } = await adminClient().rpc(
      "form_finalization_request_lookup_by_artifact",
      {
        p_artifact_kind: "google_sheet",
        p_artifact_id: `${testPrefix}SheetId`,
        p_artifact_url: sheetUrl,
      }
    );

    expect(error).toBeNull();
    expect(data?.rows).toEqual([
      expect.objectContaining({
        idempotency_key: `${testPrefix}-sheet`,
        external_artifacts: expect.objectContaining({ actaRef: "ACTA-SHEET-113" }),
        response_payload: expect.objectContaining({ actaRef: "ACTA-SHEET-113" }),
      }),
    ]);
  });

  it("retorna filas relevantes para google_drive_file con service_role", async () => {
    const { data, error } = await adminClient().rpc(
      "form_finalization_request_lookup_by_artifact",
      {
        p_artifact_kind: "google_drive_file",
        p_artifact_id: `${testPrefix}DriveId`,
        p_artifact_url: driveUrl,
      }
    );

    expect(error).toBeNull();
    expect(data?.rows).toEqual([
      expect.objectContaining({
        idempotency_key: `${testPrefix}-drive`,
        external_artifacts: expect.objectContaining({ actaRef: "ACTA-DRIVE-113" }),
        response_payload: expect.objectContaining({ actaRef: "ACTA-DRIVE-113" }),
      }),
    ]);
  });

  it("retorna rows vacio para kind invalido", async () => {
    const { data, error } = await adminClient().rpc(
      "form_finalization_request_lookup_by_artifact",
      {
        p_artifact_kind: "otro",
        p_artifact_id: `${testPrefix}DriveId`,
        p_artifact_url: driveUrl,
      }
    );

    expect(error).toBeNull();
    expect(data).toEqual({ rows: [] });
  });

  it("retorna rows vacio para artifact inexistente", async () => {
    const { data, error } = await adminClient().rpc(
      "form_finalization_request_lookup_by_artifact",
      {
        p_artifact_kind: "google_drive_file",
        p_artifact_id: `${testPrefix}Missing`,
        p_artifact_url: `https://drive.google.com/file/d/${testPrefix}Missing/view`,
      }
    );

    expect(error).toBeNull();
    expect(data).toEqual({ rows: [] });
  });

  it.runIf(Boolean(anonKey))("deniega ejecucion desde anon", async () => {
    const { data, error } = await publicClient().rpc(
      "form_finalization_request_lookup_by_artifact",
      {
        p_artifact_kind: "google_sheet",
        p_artifact_id: `${testPrefix}SheetId`,
        p_artifact_url: sheetUrl,
      }
    );

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
