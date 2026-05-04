import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const MIGRATION_SUFFIX = "_align_formatos_finalizados_il_path_formato.sql";
const DOC_PATH = join(process.cwd(), "docs", "ods_migration_inventory.md");

function readPathFormatoMigration() {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) =>
    name.endsWith(MIGRATION_SUFFIX)
  );

  expect(migrationName).toBeDefined();
  return readFileSync(join(migrationsDir, migrationName ?? ""), "utf8");
}

describe("ODS schema drift #74 - formatos_finalizados_il.path_formato", () => {
  it("registra la columna remota path_formato con migracion idempotente", () => {
    const sql = readPathFormatoMigration();

    expect(sql).toContain("Reconcilia drift remoto-local detectado en PR #71 / issue #74");
    expect(sql).toMatch(
      /alter\s+table\s+public\.formatos_finalizados_il\s+add\s+column\s+if\s+not\s+exists\s+path_formato\s+text\s*;/i
    );
  });

  it("documenta la decision de drift sin habilitarlo como path de import ODS", () => {
    expect(existsSync(DOC_PATH)).toBe(true);
    const markdown = readFileSync(DOC_PATH, "utf8");

    expect(markdown).toContain("# Inventory de migraciones / schema drift ODS");
    expect(markdown).toContain("formatos_finalizados_il.path_formato (PR #71 -> #74)");
    expect(markdown).toContain("490 filas");
    expect(markdown).toContain("489 no-blank");
    expect(markdown).toContain("ADD COLUMN IF NOT EXISTS");
    expect(markdown).toContain("No usar en `/api/ods/importar`");
    expect(markdown).toContain("Schema drifts pendientes");
    expect(markdown).toContain("ninguno conocido");
  });
});

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIntegration = Boolean(supabaseUrl && serviceRoleKey);

describe.runIf(runIntegration)(
  "ODS schema drift #74 remote integration",
  () => {
    it("expone path_formato en formatos_finalizados_il", async () => {
      const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error } = await supabase
        .from("formatos_finalizados_il")
        .select("path_formato")
        .limit(0);

      expect(error).toBeNull();
    });
  }
);
