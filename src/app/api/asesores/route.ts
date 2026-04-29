import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await admin
      .from("asesores")
      .select("nombre")
      .is("deleted_at", null)
      .order("nombre");

    if (error) {
      throw error;
    }

    return NextResponse.json(
      (data ?? []).filter(
        (item): item is { nombre: string } =>
          typeof item?.nombre === "string" && item.nombre.trim().length > 0
      ),
      {
        headers: CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error("[api/asesores] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
