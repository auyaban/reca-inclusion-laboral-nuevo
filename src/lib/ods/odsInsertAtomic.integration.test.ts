import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIntegration = Boolean(supabaseUrl && serviceRoleKey);

const testRun = `vitest-ods-insert-atomic-106-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdSessionIds = new Set<string>();
const createdCedulas = new Set<string>();
let cedulaCounter = 0;

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_TEST_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function nextCedula() {
  cedulaCounter += 1;
  const cedula = `92${Date.now().toString().slice(-8)}${cedulaCounter.toString().padStart(2, "0")}`;
  createdCedulas.add(cedula);
  return cedula;
}

function makeOds(overrides: Record<string, unknown> = {}) {
  const sessionId = randomUUID();
  createdSessionIds.add(sessionId);

  return {
    orden_clausulada: true,
    nombre_profesional: "Vitest RPC #106",
    nit_empresa: "900106000",
    nombre_empresa: "Empresa Vitest #106",
    caja_compensacion: "Compensar",
    asesor_empresa: "QA",
    sede_empresa: "Bogota",
    fecha_servicio: "2026-05-04",
    fecha_ingreso: "2026-05-04",
    mes_servicio: 5,
    ano_servicio: 2026,
    nombre_usuario: "Persona Vitest",
    cedula_usuario: "100;200",
    discapacidad_usuario: "Fisica;Visual",
    genero_usuario: "Mujer;Hombre",
    modalidad_servicio: "Virtual",
    todas_modalidades: 0,
    horas_interprete: 0,
    valor_virtual: 100,
    valor_bogota: 0,
    valor_otro: 0,
    valor_interprete: 0,
    valor_total: 100,
    tipo_contrato: "Laboral;Prestacion de servicios",
    cargo_servicio: "Auxiliar;Analista",
    seguimiento_servicio: "Seguimiento vitest",
    orden_clausulada_texto: "si",
    total_personas: 2,
    observaciones: testRun,
    observacion_agencia: "Prueba RPC #106",
    codigo_servicio: "TEST-106",
    referencia_servicio: "RPC #106",
    descripcion_servicio: "Prueba integration ods_insert_atomic #106",
    formato_finalizado_id: null,
    user_id: null,
    session_id: sessionId,
    started_at: "2026-05-04T10:00:00.000Z",
    submitted_at: "2026-05-04T10:10:00.000Z",
    ...overrides,
  };
}

function makeUsuario(cedula: string, overrides: Record<string, unknown> = {}) {
  return {
    cedula_usuario: cedula,
    nombre_usuario: `Usuario ${cedula}`,
    discapacidad_usuario: "Fisica",
    genero_usuario: "Mujer",
    fecha_ingreso: "2026-05-04",
    tipo_contrato: "Laboral",
    cargo_servicio: "Auxiliar",
    ...overrides,
  };
}

async function callOdsInsertAtomic(args: { ods: Record<string, unknown>; usuarios: Record<string, unknown>[] }) {
  return adminClient().rpc("ods_insert_atomic", {
    p_ods: args.ods,
    p_usuarios_nuevos: args.usuarios,
  });
}

async function cleanupFixtures() {
  const admin = adminClient();
  const sessionIds = Array.from(createdSessionIds);
  const cedulas = Array.from(createdCedulas);

  if (sessionIds.length > 0) {
    await admin.from("ods").delete().in("session_id", sessionIds);
    createdSessionIds.clear();
  }

  if (cedulas.length > 0) {
    await admin.from("usuarios_reca").delete().in("cedula_usuario", cedulas);
    createdCedulas.clear();
  }
}

describe.runIf(runIntegration)("ods_insert_atomic RPC integration #106", () => {
  afterEach(async () => {
    await cleanupFixtures();
  });

  it("inserta una ODS con cedula nueva auto-staged sin tocar columnas inexistentes de usuarios_reca", async () => {
    const cedula = nextCedula();
    const ods = makeOds();

    const { data, error } = await callOdsInsertAtomic({
      ods,
      usuarios: [makeUsuario(cedula)],
    });

    expect(error).toBeNull();
    const odsId = (data as { ods_id?: string } | null)?.ods_id;
    expect(odsId).toEqual(expect.any(String));

    const { data: usuario, error: usuarioError } = await adminClient()
      .from("usuarios_reca")
      .select("cedula_usuario, nombre_usuario, discapacidad_usuario, genero_usuario, tipo_contrato")
      .eq("cedula_usuario", cedula)
      .single();

    expect(usuarioError).toBeNull();
    expect(usuario).toMatchObject({
      cedula_usuario: cedula,
      nombre_usuario: `Usuario ${cedula}`,
      discapacidad_usuario: "Fisica",
      genero_usuario: "Mujer",
      tipo_contrato: "Laboral",
    });
  });

  it("ignora cedulas existentes sin duplicar usuarios_reca", async () => {
    const cedula = nextCedula();
    const admin = adminClient();
    const { error: seedError } = await admin.from("usuarios_reca").insert({
      cedula_usuario: cedula,
      nombre_usuario: "Usuario Existente",
      discapacidad_usuario: "Visual",
      genero_usuario: "Hombre",
      tipo_contrato: "Prestacion de servicios",
    });
    expect(seedError).toBeNull();

    const { data, error } = await callOdsInsertAtomic({
      ods: makeOds(),
      usuarios: [
        makeUsuario(cedula, {
          nombre_usuario: "Usuario Auto Stage",
          discapacidad_usuario: "Fisica",
          genero_usuario: "Mujer",
          tipo_contrato: "Laboral",
        }),
      ],
    });

    expect(error).toBeNull();
    expect((data as { ods_id?: string } | null)?.ods_id).toEqual(expect.any(String));

    const { data: usuarios, error: selectError } = await admin
      .from("usuarios_reca")
      .select("cedula_usuario, nombre_usuario, discapacidad_usuario, genero_usuario, tipo_contrato")
      .eq("cedula_usuario", cedula);

    expect(selectError).toBeNull();
    expect(usuarios).toHaveLength(1);
    expect(usuarios?.[0]).toMatchObject({
      nombre_usuario: "Usuario Existente",
      discapacidad_usuario: "Visual",
      genero_usuario: "Hombre",
      tipo_contrato: "Prestacion de servicios",
    });
  });

  it("preserva fecha_ingreso, cargo_servicio y tipo_contrato agregados en la tabla ods", async () => {
    const cedula = nextCedula();
    const ods = makeOds({
      fecha_ingreso: "2026-05-04",
      cargo_servicio: "Auxiliar;Analista",
      tipo_contrato: "Laboral;Prestacion de servicios",
    });

    const { data, error } = await callOdsInsertAtomic({
      ods,
      usuarios: [makeUsuario(cedula)],
    });

    expect(error).toBeNull();
    const odsId = (data as { ods_id?: string } | null)?.ods_id;
    expect(odsId).toEqual(expect.any(String));

    const { data: storedOds, error: odsError } = await adminClient()
      .from("ods")
      .select("fecha_ingreso, cargo_servicio, tipo_contrato")
      .eq("id", odsId!)
      .single();

    expect(odsError).toBeNull();
    expect(storedOds).toMatchObject({
      fecha_ingreso: "2026-05-04",
      cargo_servicio: "Auxiliar;Analista",
      tipo_contrato: "Laboral;Prestacion de servicios",
    });
  });

  it("mantiene la idempotencia por session_id sin duplicar ods ni usuarios_reca", async () => {
    const cedula = nextCedula();
    const sessionId = randomUUID();
    createdSessionIds.add(sessionId);
    const ods = makeOds({ session_id: sessionId });
    const usuarios = [makeUsuario(cedula)];

    const first = await callOdsInsertAtomic({ ods, usuarios });
    const second = await callOdsInsertAtomic({ ods, usuarios });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    const firstOdsId = (first.data as { ods_id?: string } | null)?.ods_id;
    const secondData = second.data as { ods_id?: string; idempotent?: boolean } | null;
    expect(firstOdsId).toEqual(expect.any(String));
    expect(secondData).toMatchObject({ ods_id: firstOdsId, idempotent: true });

    const { count: odsCount, error: odsCountError } = await adminClient()
      .from("ods")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    expect(odsCountError).toBeNull();
    expect(odsCount).toBe(1);

    const { count: usuarioCount, error: usuarioCountError } = await adminClient()
      .from("usuarios_reca")
      .select("id", { count: "exact", head: true })
      .eq("cedula_usuario", cedula);
    expect(usuarioCountError).toBeNull();
    expect(usuarioCount).toBe(1);
  });
});
