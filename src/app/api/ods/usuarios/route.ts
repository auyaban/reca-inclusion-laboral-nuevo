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
    const cedula = url.searchParams.get("cedula");

    if (!cedula || cedula.trim().length === 0) {
      return NextResponse.json(
        { error: "La cédula es obligatoria." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("usuarios_reca")
      .select("cedula_usuario, nombre_usuario, discapacidad_usuario, genero_usuario")
      .eq("cedula_usuario", cedula.trim().replace(/\D/g, ""))
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { found: false, item: null },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { found: true, item: data },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return jsonError(error, "[api/ods/usuarios.get] failed");
  }
}
