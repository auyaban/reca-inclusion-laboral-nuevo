import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enforceAuthLookupRateLimit } from "@/lib/security/authLookupRateLimit";
import { authLookupRequestSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsedBody = authLookupRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 400 }
      );
    }

    const rateLimit = await enforceAuthLookupRateLimit(request.headers);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        {
          status: rateLimit.status,
          headers:
            rateLimit.status === 429 && rateLimit.retryAfterSeconds
              ? {
                  "Retry-After": String(rateLimit.retryAfterSeconds),
                }
              : undefined,
        }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("profesionales")
      .select("correo_profesional")
      .ilike("usuario_login", parsedBody.data.usuario_login)
      .maybeSingle();

    if (error || !data?.correo_profesional) {
      // Respuesta genérica para no revelar si el usuario existe
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    return NextResponse.json({ email: data.correo_profesional });
  } catch (error) {
    console.error("[api/auth/lookup] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
