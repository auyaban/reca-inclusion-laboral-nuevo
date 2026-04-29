import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { resetProfesionalPassword } from "@/lib/profesionales/server";
import {
  buildProfesionalActor,
  jsonProfesionalError,
  NO_STORE_HEADERS,
  parseProfessionalId,
  PROFESIONALES_ADMIN_ROLE,
} from "@/lib/profesionales/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(PROFESIONALES_ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const { id } = await context.params;
    const result = await resetProfesionalPassword({
      id: parseProfessionalId(id),
      actor: buildProfesionalActor(authorization.context),
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonProfesionalError(
      error,
      "[api/empresas/profesionales/[id]/reset-password.post] failed"
    );
  }
}
