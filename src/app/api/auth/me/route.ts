import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth/roles";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
};

export async function GET() {
  try {
    const context = await getCurrentUserContext();

    if (!context.ok) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status }
      );
    }

    return NextResponse.json(
      {
        authUserId: context.profile.authUserId,
        email: context.profile.email,
        displayName: context.profile.displayName,
        usuarioLogin: context.profile.usuarioLogin,
        profesionalId: context.profile.id,
        roles: context.roles,
        rolesDisplay: context.roles.map((role) => {
          if (role === "inclusion_empresas_admin") {
            return "Admin Inclusión";
          }
          return "Profesional Inclusión";
        }),
        authPasswordTemp: context.profile.authPasswordTemp,
      },
      {
        headers: CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error("[api/auth/me] failed", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
