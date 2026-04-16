import { NextResponse } from "next/server";
import { isRequestAuthenticated } from "@/lib/auth/e2eBypass";
import { createClient } from "@/lib/supabase/server";
import { normalizeCedulaUsuario } from "@/lib/usuariosReca";
import { searchUsuariosRecaByCedulaPrefix } from "@/lib/usuariosRecaServer";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!isRequestAuthenticated({ request, user, authError })) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = normalizeCedulaUsuario(searchParams.get("query") ?? "");

    if (query.length < 3) {
      return NextResponse.json([], { headers: CACHE_HEADERS });
    }

    const results = await searchUsuariosRecaByCedulaPrefix(query);
    return NextResponse.json(results, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[api/usuarios-reca] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
