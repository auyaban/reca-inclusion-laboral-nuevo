import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readLifecycleMigration() {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) =>
    name.endsWith("_e3_1_empresa_lifecycle_rpc.sql")
  );

  expect(migrationName).toBeDefined();
  return readFileSync(join(migrationsDir, migrationName ?? ""), "utf8");
}

describe("E3.1 lifecycle migration", () => {
  it("declares lifecycle event types and server-only RPC grants", () => {
    const sql = readLifecycleMigration();

    expect(sql).toContain("empresa_eventos_tipo_check");
    expect(sql).toContain("'reclamada'");
    expect(sql).toContain("'soltada'");
    expect(sql).toContain("'quitada'");
    expect(sql).toContain("'nota'");
    expect(sql).toContain("empresa_eventos_empresa_tipo_created_idx");

    for (const functionName of [
      "empresa_reclamar",
      "empresa_soltar",
      "empresa_cambiar_estado_operativo",
      "empresa_agregar_nota",
    ]) {
      expect(sql).toContain(`create or replace function public.${functionName}`);
      expect(sql).toContain(`revoke execute on function public.${functionName}`);
      expect(sql).toContain(`grant execute on function public.${functionName}`);
    }
  });
});
