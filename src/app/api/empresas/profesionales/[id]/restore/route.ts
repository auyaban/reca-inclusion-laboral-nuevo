import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { restoreProfesional } from "@/lib/profesionales/server";
import { restoreProfesionalSchema } from "@/lib/profesionales/schemas";
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const authorization = await requireAppRole(PROFESIONALES_ADMIN_ROLE);
    if (!authorization.ok) {
      return authorization.response;
    }

    const bodyText = await request.text();
    const parsed = restoreProfesionalSchema.safeParse(
      bodyText ? JSON.parse(bodyText) : {}
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { id } = await context.params;
    const result = await restoreProfesional({
      id: parseProfessionalId(id),
      actor: buildProfesionalActor(authorization.context),
      comentario: parsed.data.comentario,
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonProfesionalError(
      error,
      "[api/empresas/profesionales/[id]/restore.post] failed"
    );
  }
}
