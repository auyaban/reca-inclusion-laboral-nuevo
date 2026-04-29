import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { listProfesionalEventos } from "@/lib/profesionales/server";
import {
  jsonProfesionalError,
  NO_STORE_HEADERS,
  parseProfessionalId,
  PROFESIONALES_ADMIN_ROLE,
} from "@/lib/profesionales/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(PROFESIONALES_ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const { id } = await context.params;
    const eventos = await listProfesionalEventos({
      profesionalId: parseProfessionalId(id),
      limit: 30,
    });

    return NextResponse.json({ items: eventos }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonProfesionalError(
      error,
      "[api/empresas/profesionales/[id]/eventos.get] failed"
    );
  }
}
