import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { terminarServicioRequestSchema, type TerminarServicioRequest } from "@/lib/ods/schemas";

const ODS_ROLE = ["ods_operador"] as const;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function buildOdsPayload(ods: TerminarServicioRequest["ods"], rows: { cedula_usuario: string; nombre_usuario: string; discapacidad_usuario: string; genero_usuario: string; fecha_ingreso: string; tipo_contrato: string; cargo_servicio: string }[], startedAt: string) {
  const fecha = new Date(ods.fecha_servicio);
  const mes_servicio = fecha.getMonth() + 1;
  const ano_servicio = fecha.getFullYear();

  const nonEmptyRows = rows.filter(
    (r) => r.cedula_usuario || r.nombre_usuario || r.discapacidad_usuario || r.genero_usuario
  );

  const aggregate = (field: keyof typeof rows[number]) =>
    nonEmptyRows.map((r) => r[field]).filter(Boolean).join(";") || undefined;

  return {
    orden_clausulada: ods.orden_clausulada,
    nombre_profesional: ods.nombre_profesional,
    nit_empresa: ods.nit_empresa,
    nombre_empresa: ods.nombre_empresa,
    caja_compensacion: ods.caja_compensacion || null,
    asesor_empresa: ods.asesor_empresa || null,
    sede_empresa: ods.sede_empresa || null,
    fecha_servicio: ods.fecha_servicio,
    fecha_ingreso: aggregate("fecha_ingreso") || null,
    mes_servicio,
    ano_servicio,
    nombre_usuario: aggregate("nombre_usuario") || null,
    cedula_usuario: aggregate("cedula_usuario") || null,
    discapacidad_usuario: aggregate("discapacidad_usuario") || null,
    genero_usuario: aggregate("genero_usuario") || null,
    modalidad_servicio: ods.modalidad_servicio,
    todas_modalidades: ods.todas_modalidades || 0,
    horas_interprete: ods.horas_interprete || null,
    valor_virtual: ods.valor_virtual || 0,
    valor_bogota: ods.valor_bogota || 0,
    valor_otro: ods.valor_otro || 0,
    valor_interprete: ods.valor_interprete || 0,
    valor_total: ods.valor_total,
    tipo_contrato: aggregate("tipo_contrato") || null,
    cargo_servicio: aggregate("cargo_servicio") || null,
    seguimiento_servicio: ods.seguimiento_servicio || null,
    total_personas: nonEmptyRows.length,
    observaciones: ods.observaciones || null,
    observacion_agencia: ods.observacion_agencia || null,
    codigo_servicio: ods.codigo_servicio,
    referencia_servicio: ods.referencia_servicio,
    descripcion_servicio: ods.descripcion_servicio,
    formato_finalizado_id: ods.formato_finalizado_id || null,
    user_id: null,
    session_id: ods.session_id || null,
    started_at: startedAt,
    submitted_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAppRole(ODS_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const body = await request.json();
    const parsed = terminarServicioRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalido.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { ods, usuarios_nuevos } = parsed.data;
    const { seccion4 } = body as { seccion4?: { rows: { cedula_usuario: string; nombre_usuario: string; discapacidad_usuario: string; genero_usuario: string; fecha_ingreso: string; tipo_contrato: string; cargo_servicio: string }[] } };
    const rows = seccion4?.rows ?? [];

    const startedAt = body.startedAt as string | undefined || new Date().toISOString();
    const odsPayload = buildOdsPayload(ods, rows, startedAt);

    const admin = createSupabaseAdminClient();

    const { data: rpcResult, error: rpcError } = await admin.rpc("ods_insert_atomic", {
      p_ods: odsPayload,
      p_usuarios_nuevos: usuarios_nuevos,
    });

    if (rpcError) {
      console.error("[api/ods/terminar] RPC error", rpcError);
      return NextResponse.json(
        { error: "Error al guardar la ODS. Intenta de nuevo." },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const odsId = rpcResult?.ods_id ?? null;

    // TODO: Drive sync — se implementara en E4 QA
    let syncStatus = "pending";
    let syncError: string | undefined;
    let syncTarget: string | undefined;

    if (process.env.ODS_DRIVE_SYNC_ENABLED === "true") {
      console.log("[api/ods/terminar] Drive sync pending — TODO E4 QA");
      syncStatus = "pending";
      syncTarget = `ODS_${new Date().toLocaleString("es-CO", { month: "long", year: "numeric" }).toUpperCase().replace(/\s/g, "_")}`;
    } else {
      syncStatus = "disabled";
    }

    return NextResponse.json(
      { ods_id: odsId, sync_status: syncStatus, sync_error: syncError, sync_target: syncTarget },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[api/ods/terminar.post] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
