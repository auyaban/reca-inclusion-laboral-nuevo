import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROYECCION_MAIN_SERVICE_KEYS } from "@/lib/proyecciones/constants";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260501143305_e3_4b_proyecciones_model.sql"
  ),
  "utf8"
);

describe("E3.4b proyecciones migration", () => {
  it("creates server-only projection tables with RLS enabled", () => {
    expect(migration).toContain("create table if not exists public.proyeccion_servicios");
    expect(migration).toContain("create table if not exists public.proyecciones");
    expect(migration).toContain("alter table public.proyeccion_servicios enable row level security");
    expect(migration).toContain("alter table public.proyecciones enable row level security");
    expect(migration).toContain("revoke all on public.proyecciones from anon, authenticated");
  });

  it("seeds the initial projectable service catalog idempotently", () => {
    expect(migration).toContain("insert into public.proyeccion_servicios");
    expect(migration).toContain("'program_presentation'");
    expect(migration).toContain("'inclusive_selection'");
    expect(migration).toContain("'interpreter_service'");
    expect(migration).toContain("on conflict (service_key) do update");
  });

  it("keeps seeded service keys aligned with TypeScript constants", () => {
    const valuesBlock = migration.match(
      /insert into public\.proyeccion_servicios[\s\S]+?values([\s\S]+?)\son conflict/
    )?.[1];
    expect(valuesBlock).toBeDefined();
    const serviceKeys = Array.from(valuesBlock!.matchAll(/\('([^']+)',\s*'[^']+'/g)).map(
      (match) => match[1]
    );

    expect(new Set(serviceKeys)).toEqual(
      new Set([
        ...PROYECCION_MAIN_SERVICE_KEYS,
        "interpreter_service",
        "failed_visit",
        "special_visit",
      ])
    );
  });

  it("creates transactional RPCs for linked interpreter projections", () => {
    expect(migration).toContain("create or replace function public.proyeccion_crear");
    expect(migration).toContain("create or replace function public.proyeccion_actualizar");
    expect(migration).toContain("create or replace function public.proyeccion_cancelar");
    expect(migration).toContain("p_requires_interpreter");
    expect(migration).toContain("'interpreter_service'");
    expect(migration).toContain("grant execute on function public.proyeccion_crear");
  });

  it("hardens cancellation and table integrity", () => {
    expect(migration).toContain("created_by_user_id uuid not null references auth.users(id) on delete restrict");
    expect(migration).toContain("constraint proyecciones_fin_after_inicio_check");
    expect(migration).toContain("if v_projection.estado = 'cancelada' then");
    expect(migration).toContain("'already_cancelled'");
    expect(migration).toContain("or parent_projection_id = p_projection_id");
  });

  it("uses an explicit pg_temp search path in RPCs", () => {
    expect(migration.match(/set search_path = public, pg_temp/g) ?? []).toHaveLength(4);
  });
});
