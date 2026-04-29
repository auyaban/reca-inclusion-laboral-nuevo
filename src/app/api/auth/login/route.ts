import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { enforceAuthLookupRateLimit } from "@/lib/security/authLookupRateLimit";
import { loginSchema } from "@/lib/validations/auth";

const INVALID_CREDENTIALS_ERROR = "Usuario o contraseña incorrectos.";

export async function POST(request: Request) {
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

  try {
    const body = await request.json().catch(() => null);
    const parsedBody = loginSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("profesionales")
      .select("correo_profesional")
      .ilike("usuario_login", parsedBody.data.usuario_login)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data?.correo_profesional) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_ERROR },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.correo_profesional,
      password: parsedBody.data.password,
    });

    if (authError) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_ERROR },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/login] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
