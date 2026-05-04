import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATION_SUFFIX = "_rpc_formato_finalizado_lookup_by_acta_ref.sql";
const DOC_PATH = join(process.cwd(), "docs", "ods_migration_inventory.md");

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const nonAdminJwt = process.env.SUPABASE_TEST_NON_ADMIN_JWT;

const runIntegration = Boolean(supabaseUrl && serviceRoleKey);

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

function publicClient(token?: string) {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_TEST_URL or anon/publishable key.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

describe("ODS #73 formato_finalizado_lookup_by_acta_ref migration contract", () => {
  it("declara RPC security definer server-only con grants acotados", () => {
    const sql = readLookupMigration();

    expect(sql).toContain("formato_finalizado_lookup_by_acta_ref");
    expect(sql).toMatch(/security\s+definer/i);
    expect(sql).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(sql).toMatch(/where\s+f\.acta_ref\s*=\s*p_acta_ref\s*;/i);
    expect(sql).not.toMatch(/where\s+f\.acta_ref\s*=\s*btrim\(p_acta_ref\)/i);
    expect(sql).toMatch(/revoke\s+execute\s+on\s+function\s+public\.formato_finalizado_lookup_by_acta_ref\(text\)\s+from\s+public,\s*anon,\s*authenticated\s*;/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.formato_finalizado_lookup_by_acta_ref\(text\)\s+to\s+service_role\s*;/i);
  });

  it("documenta el RPC en el inventory ODS", () => {
    expect(existsSync(DOC_PATH)).toBe(true);
    const markdown = readFileSync(DOC_PATH, "utf8");

    expect(markdown).toContain("RPCs server-only agregados");
    expect(markdown).toContain("formato_finalizado_lookup_by_acta_ref");
    expect(markdown).toContain("#73");
    expect(markdown).toContain("#113");
  });
});

describe.runIf(runIntegration)("formato_finalizado_lookup_by_acta_ref RPC integration", () => {
  let fixture: {
    acta_ref: string;
    registro_id: string;
    payload_normalized: unknown;
  };

  beforeAll(async () => {
    const { data, error } = await adminClient()
      .from("formatos_finalizados_il")
      .select("acta_ref, registro_id, payload_normalized")
      .not("acta_ref", "is", null)
      .not("payload_normalized", "is", null)
      .limit(1)
      .single();

    expect(error).toBeNull();
    expect(data?.acta_ref).toEqual(expect.any(String));
    fixture = data as typeof fixture;
  });

  it("retorna la proyeccion acotada para service_role cuando acta_ref existe", async () => {
    const { data, error } = await adminClient().rpc(
      "formato_finalizado_lookup_by_acta_ref",
      { p_acta_ref: fixture.acta_ref }
    );

    expect(error).toBeNull();
    expect(data).toEqual({
      acta_ref: fixture.acta_ref,
      registro_id: fixture.registro_id,
      payload_normalized: fixture.payload_normalized,
    });
  });

  it("retorna null para acta_ref inexistente", async () => {
    const { data, error } = await adminClient().rpc(
      "formato_finalizado_lookup_by_acta_ref",
      { p_acta_ref: `NOEXISTE${Date.now()}` }
    );

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it.runIf(Boolean(anonKey))("deniega ejecucion desde anon", async () => {
    const { data, error } = await publicClient().rpc(
      "formato_finalizado_lookup_by_acta_ref",
      { p_acta_ref: fixture.acta_ref }
    );

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it.runIf(Boolean(nonAdminJwt && anonKey))("deniega ejecucion desde authenticated sin grant", async () => {
    const { data, error } = await publicClient(nonAdminJwt).rpc(
      "formato_finalizado_lookup_by_acta_ref",
      { p_acta_ref: fixture.acta_ref }
    );

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
