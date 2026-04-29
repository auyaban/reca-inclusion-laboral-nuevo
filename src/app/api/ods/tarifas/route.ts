import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ODS_ROLE = ["ods_operador"] as const;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function jsonError(error: unknown, logLabel: string) {
  console.error(logLabel, error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

export async function GET(request: Request) {
  try {
    const authorization = await requireAppRole(ODS_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const url = new URL(request.url);
    const codigo = url.searchParams.get("codigo");
    const fecha = url.searchParams.get("fecha");

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("tarifas")
      .select("codigo_servicio, referencia_servicio, programa_servicio, descripcion_servicio, modalidad_servicio, valor_base, iva, total")
      .order("codigo_servicio", { ascending: true });

    if (codigo) {
      query = query.eq("codigo_servicio", codigo.trim());
    }

    if (fecha) {
      query = query.lte("vigente_desde", fecha).or(`vigente_hasta.is.null,vigente_hasta.gte.${fecha}`);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;

    return NextResponse.json(
      { items: data ?? [] },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return jsonError(error, "[api/ods/tarifas.get] failed");
  }
}
