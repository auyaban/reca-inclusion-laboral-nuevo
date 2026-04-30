import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { terminarServicioRequestSchema, type TerminarServicioRequest } from "@/lib/ods/schemas";
import { syncNewOdsRecord } from "@/lib/ods/sync/odsSheetSync";

const ODS_ROLE = ["ods_operador"] as const;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

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

    const { ods, usuarios_nuevos } = parsed.data as TerminarServicioRequest;

    const odsPayload = {
      orden_clausulada: ods.orden_clausulada,
      nombre_profesional: ods.nombre_profesional,
      nit_empresa: ods.nit_empresa,
      nombre_empresa: ods.nombre_empresa,
      caja_compensacion: ods.caja_compensacion || null,
      asesor_empresa: ods.asesor_empresa || null,
      sede_empresa: ods.sede_empresa || null,
      fecha_servicio: ods.fecha_servicio,
      fecha_ingreso: ods.fecha_ingreso || null,
      mes_servicio: ods.mes_servicio,
      ano_servicio: ods.ano_servicio,
      nombre_usuario: ods.nombre_usuario || null,
      cedula_usuario: ods.cedula_usuario || null,
      discapacidad_usuario: ods.discapacidad_usuario || null,
      genero_usuario: ods.genero_usuario || null,
      modalidad_servicio: ods.modalidad_servicio,
      // BS-2: usar ?? para preservar 0 valido (defensivo si Zod default cambia)
      todas_modalidades: ods.todas_modalidades ?? 0,
      horas_interprete: ods.horas_interprete ?? null,
      valor_virtual: ods.valor_virtual ?? 0,
      valor_bogota: ods.valor_bogota ?? 0,
      valor_otro: ods.valor_otro ?? 0,
      valor_interprete: ods.valor_interprete ?? 0,
      valor_total: ods.valor_total,
      tipo_contrato: ods.tipo_contrato || null,
      cargo_servicio: ods.cargo_servicio || null,
      seguimiento_servicio: ods.seguimiento_servicio || null,
      total_personas: ods.total_personas,
      observaciones: ods.observaciones || null,
      observacion_agencia: ods.observacion_agencia || null,
      codigo_servicio: ods.codigo_servicio,
      referencia_servicio: ods.referencia_servicio,
      descripcion_servicio: ods.descripcion_servicio,
      formato_finalizado_id: ods.formato_finalizado_id || null,
      user_id: authorization.context.user.id,
      session_id: ods.session_id || null,
      started_at: ods.started_at,
      submitted_at: ods.submitted_at,
    };

    const admin = createSupabaseAdminClient();

    const { data: rpcResult, error: rpcError } = await admin.rpc("ods_insert_atomic", {
      p_ods: odsPayload,
      p_usuarios_nuevos: usuarios_nuevos,
    });

    if (rpcError) {
      console.error("[api/ods/terminar] RPC error", rpcError);
      // Exponemos el detalle al cliente: este endpoint solo es accesible
      // por el rol ods_operador (uso interno) y el detalle es necesario
      // para diagnosticar fallas de cast/constraint/etc en preview.
      return NextResponse.json(
        {
          error: "Error al guardar la ODS. Intenta de nuevo.",
          details: rpcError.message,
          code: (rpcError as { code?: string }).code,
          hint: (rpcError as { hint?: string }).hint,
        },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const odsId = rpcResult?.ods_id ?? null;

    // Sync hacia Google Sheets (port 1-a-1 del legacy RECA_ODS).
    // No bloquea el guardado: si falla devuelve sync_status="warning" con
    // detalle. La ODS queda persistida en Supabase de todos modos.
    const syncRow = {
      ...odsPayload,
      id: odsId ?? undefined,
    };
    const syncResult = await syncNewOdsRecord(syncRow);

    return NextResponse.json(
      {
        ods_id: odsId,
        sync_status: syncResult.sync_status,
        sync_error: syncResult.sync_error,
        sync_target: syncResult.sync_target,
      },
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
