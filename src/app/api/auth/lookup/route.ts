import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  // Instanciar dentro de la función para evitar errores en build time
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { usuario_login } = await request.json();

    if (!usuario_login || typeof usuario_login !== "string") {
      return NextResponse.json(
        { error: "usuario_login es requerido" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profesionales")
      .select("correo_profesional")
      .ilike("usuario_login", usuario_login.trim())
      .single();

    if (error || !data?.correo_profesional) {
      // Respuesta genérica para no revelar si el usuario existe
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    return NextResponse.json({ email: data.correo_profesional });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
