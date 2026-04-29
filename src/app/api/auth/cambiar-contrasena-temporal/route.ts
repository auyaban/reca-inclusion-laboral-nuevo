import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { changeTemporaryPasswordSchema } from "@/lib/profesionales/schemas";
import { markTemporaryPasswordChanged } from "@/lib/profesionales/server";
import { createClient } from "@/lib/supabase/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autenticado." },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const context = await getCurrentUserContext();
    if (!context.ok) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status, headers: NO_STORE_HEADERS }
      );
    }

    const parsed = changeTemporaryPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: "No se pudo actualizar la contraseña." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    await markTemporaryPasswordChanged({
      authUserId: user.id,
      profesionalId: context.profile.id,
    });

    await supabase.auth.refreshSession();

    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[api/auth/cambiar-contrasena-temporal] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
