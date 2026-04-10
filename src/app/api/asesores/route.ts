import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await admin
      .from("asesores")
      .select("nombre")
      .order("nombre");

    if (error) {
      throw error;
    }

    return NextResponse.json(
      (data ?? []).filter(
        (item): item is { nombre: string } =>
          typeof item?.nombre === "string" && item.nombre.trim().length > 0
      )
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener asesores";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
