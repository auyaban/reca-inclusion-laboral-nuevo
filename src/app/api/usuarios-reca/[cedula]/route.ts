import { NextResponse } from "next/server";
import { isRequestAuthenticated } from "@/lib/auth/e2eBypass";
import { createClient } from "@/lib/supabase/server";
import { normalizeCedulaUsuario } from "@/lib/usuariosReca";
import { getUsuarioRecaByCedula } from "@/lib/usuariosRecaServer";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ cedula: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!isRequestAuthenticated({ request, user, authError })) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { cedula } = await context.params;
    const normalizedCedula = normalizeCedulaUsuario(cedula);
    if (!normalizedCedula) {
      return NextResponse.json(
        { error: "Cédula inválida." },
        { status: 400 }
      );
    }

    const record = await getUsuarioRecaByCedula(normalizedCedula);
    if (!record) {
      return NextResponse.json(
        { error: "No se encontraron datos en usuarios RECA." },
        { status: 404 }
      );
    }

    return NextResponse.json(record, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[api/usuarios-reca/[cedula]] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
