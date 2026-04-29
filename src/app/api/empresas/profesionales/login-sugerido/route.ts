import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import {
  ProfesionalServerError,
  suggestProfesionalUsuarioLogin,
} from "@/lib/profesionales/server";
import { NO_STORE_HEADERS, PROFESIONALES_ADMIN_ROLE } from "@/lib/profesionales/api";

function parseExcludeId(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function jsonError(error: unknown) {
  if (error instanceof ProfesionalServerError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: NO_STORE_HEADERS }
    );
  }

  console.error("[api/empresas/profesionales/login-sugerido] failed", error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

export async function GET(request: Request) {
  try {
    const authorization = await requireAppRole(PROFESIONALES_ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const params = new URL(request.url).searchParams;
    const nombre = params.get("nombre")?.trim() ?? "";
    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const usuarioLogin = await suggestProfesionalUsuarioLogin({
      nombre,
      excludeId: parseExcludeId(params.get("excludeId")),
    });

    return NextResponse.json({ usuarioLogin }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonError(error);
  }
}
