import { NextResponse } from "next/server";
import { requireAppRole } from "@/lib/auth/roles";
import { enableProfesionalAccess } from "@/lib/profesionales/server";
import { enableProfesionalAccessSchema } from "@/lib/profesionales/schemas";
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

    const parsed = enableProfesionalAccessSchema.safeParse(await request.json());
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
    const result = await enableProfesionalAccess({
      id: parseProfessionalId(id),
      input: parsed.data,
      actor: buildProfesionalActor(authorization.context),
    });

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonProfesionalError(
      error,
      "[api/empresas/profesionales/[id]/enable-access.post] failed"
    );
  }
}
