import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const docPath = join(root, "docs", "ods_motor_telemetria.md");
const memoryPath = join(root, "memory", "MEMORY.md");

function read(path: string) {
  return readFileSync(path, "utf8");
}

function countMarkdownFences(markdown: string) {
  return (markdown.match(/^```/gm) ?? []).length;
}

describe("ODS telemetry documentation", () => {
  it("existe y cubre los conceptos operativos minimos", () => {
    const markdown = read(docPath);

    expect(markdown).toContain("# Telemetria ODS");
    expect(markdown).toContain("## Que se mide y que NO");
    expect(markdown).toContain("## Como activar y desactivar");
    expect(markdown).toContain("## Estructura de ods_motor_telemetria");
    expect(markdown).toContain("## Los dos paths");
    expect(markdown).toContain("## Como leer la vista admin");
    expect(markdown).toContain("## Casos a interpretar");
    expect(markdown).toContain("## Como traducir hallazgos en fixes");
    expect(markdown).toContain("## Riesgos conocidos");
    expect(markdown).toContain("ODS_TELEMETRY_START_AT");
    expect(markdown).toContain("MAX_ALTERNATIVES = 5");
    expect(markdown).toContain("actor_user_id");
  });

  it("referencia archivos canonicos de implementacion", () => {
    const markdown = read(docPath);

    expect(markdown).toContain("supabase/migrations/20260504023257_ods_motor_telemetria.sql");
    expect(markdown).toContain("src/lib/ods/telemetry/");
    expect(markdown).toContain("src/lib/ods/rules-engine/");
    expect(markdown).toContain("docs/ods_migration_inventory.md");
  });

  it("mantiene markdown fences balanceadas", () => {
    const markdown = read(docPath);

    expect(countMarkdownFences(markdown) % 2).toBe(0);
  });

  it("queda indexada en MEMORY.md bajo Canonico minimo", () => {
    const memory = read(memoryPath);
    const canonicoMinimo = memory.split("## Estado actual breve")[0] ?? "";

    expect(canonicoMinimo).toContain("../docs/ods_motor_telemetria.md");
  });
});
