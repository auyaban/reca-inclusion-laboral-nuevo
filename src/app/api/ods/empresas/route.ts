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
    const nit = url.searchParams.get("nit");
    const nombre = url.searchParams.get("nombre");

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("empresas")
      // En la BD la columna se llama `asesor`; el frontend la espera como `asesor_empresa`.
      .select("nit_empresa, nombre_empresa, caja_compensacion, asesor, sede_empresa")
      .is("deleted_at", null);

    if (nit) {
      query = query.eq("nit_empresa", nit.trim());
    } else if (nombre) {
      query = query.ilike("nombre_empresa", `%${nombre.trim()}%`);
    }

    query = query.order("nombre_empresa", { ascending: true }).limit(20);

    const { data, error } = await query;
    if (error) throw error;

    type EmpresaRow = {
      nit_empresa: string | null;
      nombre_empresa: string | null;
      caja_compensacion: string | null;
      asesor: string | null;
      sede_empresa: string | null;
    };

    const items = ((data ?? []) as EmpresaRow[]).map((row) => ({
      nit_empresa: row.nit_empresa,
      nombre_empresa: row.nombre_empresa,
      caja_compensacion: row.caja_compensacion,
      asesor_empresa: row.asesor,
      sede_empresa: row.sede_empresa,
    }));

    return NextResponse.json(
      { items },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return jsonError(error, "[api/ods/empresas.get] failed");
  }
}
